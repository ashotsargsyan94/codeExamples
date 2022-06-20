<?php

use Squirrel\Exception\BadRequestException;
use Squirrel\Exception\ForbiddenException;
use Squirrel\Exception\InternalServerErrorException;
use Squirrel\Exception\NotFoundException;
use Squirrel\Facades\ContentAccess;
use Squirrel\Facades\Pusher;
use Squirrel\Library\EventService;
use Squirrel\Model\Channel;
use Squirrel\Model\Notifiable;
use Squirrel\Model\Post;

class Broadcast extends MY_Controller
{
    /**
     * This controller allows guest requests for webhook
     */
    protected function allowGuests(): bool
    {
        return in_array(uri_string(), [
            'broadcast/webhook/' . ANT_MEDIA_WEBHOOK_SECRET,
        ]);
    }

    private function fetchPost(int $postId)
    {
        $post = $this->model->posts->fetchSinglePost($postId, true);

        if (! $post) {
            throw new NotFoundException();
        }

        if (! ContentAccess::canISeePost($post)) {
            throw new ForbiddenException();
        }

        return $post;
    }

    public function createStream()
    {
        if (! $postId = (int) $this->input->post('postId')) {
            throw new BadRequestException('A post ID is required.');
        }

        Post::findOrFail($postId); // Handles 404 automatically

        $streamId = time() . 'M' . currentMemberId() . 'C' . currentCommunityId();

        $ret = $this->_AntmediaAPI('POST', 'WebRTCApp', 'create', [
            'streamId' => $streamId,
            'name' => 'liveStream-' . $postId
        ]);

        if (empty($ret['streamId'])) {
            throw new InternalServerErrorException();
        }

        $this->model->messageAttachment->insert([
            'message_id' => $postId,
            'file'       => $ret['streamId'],
            'type'       => 'live'
        ]);

        return $this->outputJSON([
            'streamId' => $ret['streamId'],
            'stream'   => $ret,
        ]);
    }

    public function getStream()
    {
        if (! $postId = (int) $this->input->post('postId')) {
            throw new BadRequestException('A post ID is required.');
        }

        $post = $this->fetchPost($postId);

        if ($post['attachments'][0]['type'] !== 'live') {
            throw new InternalServerErrorException();
        }

        // add viewer
        $this->model->broadcast_viewer->store(currentMemberId(), $postId);

        Pusher::pushToChannels($post['channel_id'], EventService::EVENT_ENTER_BROADCAST, [
            'memberId'      => currentMemberId(),
            'channelId'     => $post['channel_id'],
            'broadcastId'   => $postId
        ]);

        return $this->outputJSON([
            'channelId'     => $post['channel_id'],
            'memberId'      => $post['creator_id'],
            'memberAvatar'  => $post['memberAvatar'],
            'memberName'    => $post['memberName'],
            'post'          => $post,
            'stream'        => $this->_AntmediaAPI('GET', 'WebRTCApp', $post['attachments'][0]['file']),
        ]);
    }

    public function setPostVisible()
    {
        if (! $postId = (int) $this->input->post('postId')) {
            throw new BadRequestException('A post ID is required.');
        }

        $post = Post::findOrFail($postId);

        $post->unhide();

        Notifiable::create([
            'type' => Notifiable::POST_LIVE,
            'link' => $post->id,
        ])->notifyChannelMembers(Channel::find($post->channel_id), [ currentMemberId() ]);

        Pusher::pushToChannels($post->channel_id, EventService::EVENT_MESSAGE_CREATED, [
            'memberId'  => $post->creator_id,
            'channelId' => $post->channel_id,
            'postId'    => $post->id,
            'parentId'  => $post->parent_id,
        ]);
    }

    public function setPostInvisible()
    {
        if (! $postId = (int) $this->input->post('postId')) {
            throw new BadRequestException('A post ID is required.');
        }

        $saveStream = (bool) $this->input->post('saveStream');

        $post = $this->fetchPost($postId);

        $success = (bool) $this->model->message->update(
            [ 'hidden'  => true ],
            [ 'id'      => $postId ]
        );

        if ($success && $post['attachments'][0]['type'] === 'live') {
            $this->_AntmediaAPI('DELETE', 'WebRTCApp', $post['attachments'][0]['file']);

            $this->model->messageAttachment->update(
                ['type' => $saveStream ? 'live-copy' : 'live-arch'],
                ['id' => $post['attachments'][0]['id']]
            );

            Pusher::pushToChannels($post['channel_id'], EventService::EVENT_MESSAGE_DELETED, [
                'memberId'  => $post['creator_id'],
                'channelId' => $post['channel_id'],
                'postId'    => $postId,
            ]);

            return $this->outputJSON();
        }

        if (! $success) {
            throw new Exception('Failed to update post.');
        }
    }

    public function leave()
    {
        if (! $postId = (int) $this->input->post('postId')) {
            throw new BadRequestException('A post ID is required.');
        }

        $post = Post::findOrFail($postId);

        $success = $this->model->broadcast_viewer->leave(currentMemberId(), $post->id);

        if (! $success) {
            throw new Exception('Failed to update post.');
        }

        Pusher::pushToChannels($post->channel_id, EventService::EVENT_LEFT_BROADCAST, [
            'memberId'    => currentMemberId(),
            'channelId'   => $post->channel_id,
            'broadcastId' => $post->id
        ]);

        return $this->outputJSON();
    }

    public function viewers(int $postId)
    {
        Post::findOrFail($postId); // Handles 404 automatically

        $viewers = $this->model->broadcast_viewer->getViewersFor($postId);

        return $this->outputJSON([
            'viewers' => $viewers,
        ]);
    }

    public function viewer(int $postId, int $memberId)
    {
        Post::findOrFail($postId); // Handles 404 automatically

        $viewer = $this->model->broadcast_viewer->getViewersFor($postId, $memberId);

        return $this->outputJSON([
            'viewer' => $viewer,
        ]);
    }

    public function getStats()
    {
        if (! $postId = (int) $this->input->post('postId')) {
            throw new BadRequestException('A post ID is required.');
        }

        $post = $this->fetchPost($postId);

        if ($post['attachments'][0]['type'] !== 'live') {
            throw new InternalServerErrorException();
        }

        $streamId = $post['attachments'][0]['file'];

        $metrics = $this->_AntmediaAPI(
            'GET',
            'WebRTCApp',
            "${streamId}/broadcast-statistics"
        );

        if ($metrics['totalWebRTCWatchersCount'] < 0) {
            $metrics['totalWebRTCWatchersCount'] = 0;
        }

        if ($metrics['totalRTMPWatchersCount'] < 0) {
            $metrics['totalRTMPWatchersCount'] = 0;
        }

        if ($metrics['totalHLSWatchersCount'] < 0) {
            $metrics['totalHLSWatchersCount'] = 0;
        }

        return $this->outputJSON(compact('metrics'));
    }

    protected function _AntmediaAPI(string $method, string $appType, string $apiPath, array $data = [])
    {
        $client = new GuzzleHttp\Client();

        $response = $client->request($method, 'https://' . ANT_MEDIA_SERVER . '/rest/' . ANT_MEDIA_API_VERSION . '/broadcasts/' . $apiPath, [
            'json' => $data,
            'curl' => [
                CURLOPT_SSL_VERIFYPEER => false,
            ]
        ]);

        if (! in_array($response->getStatusCode(), [200, 201])) {
            throw new Exception('Network error connecting to API server');
        }

        return json_decode($response->getBody(), true);
    }

    public function webhook(string $secret = null): void
    {
        if ($this->input->method() != 'post') {
            log_message(LOG_ERROR, 'Someone tried to reach webhook with non-POST request');
        }

        if ($secret != ANT_MEDIA_WEBHOOK_SECRET) {
            log_message(LOG_ERROR, 'Someone tried to reach webhook with wrong secret');
            log_message(LOG_ERROR, print_r($this->input->post(), true));
            return;
        }

        // {'action': 'liveStreamEnded', 'id': '1601572786M3', 'streamName': 'liveStream-345'}

        $action = $this->input->post('action');
        $id = $this->input->post('id');
        $streamName = $this->input->post('streamName'); // Unused?

        switch ($action) {
            case 'liveStreamStarted':
                log_message(LOG_DEBUG, 'liveStreamStarted ' . $id);
                // Ant Media server calls this hook when a new live stream is started
                // we can notify members and show stream

                break;

            case 'liveStreamEnded':
                log_message(LOG_DEBUG, 'liveStreamEnded ' . $id);
                // Ant Media Server calls this hook when a live stream is ended

                $attachment = $this->model->attachment->byStreamId($id);

                if ($attachment && $attachment[0]['type'] === 'live' && $attachment[0]['hidden'] == 0) {
                    if ($post = Post::find($attachment[0]['message_id'])) {
                        $post->hide();

                        Pusher::pushToChannels($post->channel_id, EventService::EVENT_MESSAGE_DELETED, [
                            'postId'    => $post->id,
                            'channelId' => $post->channel_id,
                            'memberId'  => $post->creator_id,
                        ]);
                    }
                }

                break;

            case 'vodReady':
                log_message(LOG_DEBUG, 'vodReady ' . $id);
                // Ant Media Server calls this hook when the recording of the live stream is ended
                // if stream archived delete it

                $attachment = $this->model->attachment->byStreamId($id);

                if ($attachment && $attachment[0]['type'] === 'live-arch') {
                    $streamFile = UPLOAD_VPATH . ANT_MEDIA_STREAM_PATH . DIRECTORY_SEPARATOR . $attachment[0]['file'] . '.mp4';

                    if (file_exists($streamFile)) {
                        @unlink($streamFile);
                    }
                } elseif ($attachment && $attachment[0]['type'] === 'live-copy') {
                    $this->model->messageAttachment->update(
                        ['type' => 'live'],
                        ['id' => $attachment[0]['id']]
                    );
                }

                break;

            default:
                log_message(LOG_ERROR, 'Action [' . $action . '] is not defined');
        }
    }
}
