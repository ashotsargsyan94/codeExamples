<?php

use Squirrel\Exception\ForbiddenException;
use Squirrel\Model\Channel;
use Squirrel\Model\Community;
use Squirrel\Model\EventMessage;
use Squirrel\Model\Notifiable;
use Squirrel\Model\NotificationSubscription;
use Squirrel\Services\Event\Event;

class CommentController extends MY_Controller
{
    public function share()
    {
        $post = html_escape($this->input->post());
        $masked = $post['masked'] ?? false;

        $channel = $this->model->message->getChannel($post['originalPostId']);
        $community = Community::find($channel->community_id);

        if (! $community->hasMember(currentMemberId())) {
            throw new ForbiddenException(_('You cannot share content from this community'));
        }

        $sharedWithType = $post['sharedWithType'];

        if ($sharedWithType === 'direct') {
            // directs could contain direct channel Ids or memberIds in the format member_<id>. Let's seperate them.
            $sharedWithIds = array_filter($post['sharedWithIds'], function ($id) {
                return ! strstr($id, 'member_');
            });

            $memberIds = array_filter($post['sharedWithIds'], function ($id) {
                return strstr($id, 'member_');
            });

            if ($memberIds) {
                // if there are memberIds, create new directs for each then add them to the sharedWithIds list.
                foreach ($memberIds as $memberId) {
                    $memberId = (int) str_replace('member_', '', $memberId);
                    $sharedWithIds[] = $this->model->direct->create(currentMemberId(), [$memberId], $masked)->id;
                }
            }
        } else {
            $sharedWithIds = $post['sharedWithIds'] ?? [];
        }

        $basePostId  = $post['originalPostId'];
        $basePost = $this->model->message->find($basePostId);
        $sharedPostData = $this->getSharedPostData($basePost);

        foreach ($sharedWithIds as $sharedWithId) {
            $sharingPostId = $this->insertPost($sharedWithId, $sharedWithType, [
                'creator_id'    => currentMemberId(),
                'message'       => $post['message'],
                'shared_post'   => json_encode($sharedPostData),
                'masked'        => $masked
            ]);

            if (! empty($post['attachments'])) {
                foreach ($post['attachments'] as $attachment) {
                    $this->db->insert('message_attachments', [
                        'message_id' => $sharingPostId,
                        'file'       => $attachment,
                        'type'       => 'gif',
                    ]);
                }
            }
        }

        $shareCount = count($sharedWithIds);
        $originalPostId = $basePost->isShare() ? $sharedPostData['commentId'] : $basePost->id;
        $originalPostMemberId = $basePost->isShare() ? $sharedPostData['memberId'] : $basePost->creator_id;

        $this->db->query("
            UPDATE `messages`
            SET `share_count` = `share_count` + $shareCount
            WHERE `id` = $originalPostId
        ");

        Notifiable::create([
            'type' => Notifiable::POST_SHARE,
            'link' => $originalPostId,
            'data' => ['sharerId' => currentMemberId()],
        ])->notifyMember($originalPostMemberId);

        return $this->outputJSON([
            'share_count'    => $shareCount,
            'shared_post_id' => $originalPostId,
        ]);
    }

    public function eventShare()
    {
        $post = html_escape($this->input->post());
        $masked = $post['masked'] ?? false;

        if (empty($post['sharedWithIds']) || ! is_array($post['sharedWithIds'])) {
            return false;
        }

        $channel = Channel::find($post['sharedWithIds'][0]);

        $community = Community::find($channel->community_id);

        if (! $community->hasMember(currentMemberId())) {
            throw new ForbiddenException(_('You cannot share content from this community'));
        }

        $sharedWithType = $post['sharedWithType'];

        if ($sharedWithType === 'direct') {
            // directs could contain direct channel Ids or memberIds in the format member_<id>. Let's seperate them.
            $sharedWithIds = array_filter($post['sharedWithIds'], function ($id) {
                return ! strstr($id, 'member_');
            });

            $memberIds = array_filter($post['sharedWithIds'], function ($id) {
                return strstr($id, 'member_');
            });

            if ($memberIds) {
                // if there are memberIds, create new directs for each then add them to the sharedWithIds list.
                foreach ($memberIds as $memberId) {
                    $memberId = (int) str_replace('member_', '', $memberId);
                    $sharedWithIds[] = $this->model->direct->create(currentMemberId(), [$memberId], $masked)->id;
                }
            }
        } else {
            $sharedWithIds = $post['sharedWithIds'] ?? [];
        }

        foreach ($sharedWithIds as $sharedWithId) {
            $sharingPostId = $this->insertPost($sharedWithId, $sharedWithType, [
                'creator_id'  => currentMemberId(),
                'message'     => $post['message'],
                'shared_post' => null,
                'masked'      => $masked,
            ]);

            EventMessage::create([
                'event_id'   => $post['eventId'],
                'message_id' => $sharingPostId,
            ]);

            $postIds[] = $sharingPostId;
        }

        return $this->outputJSON([
            'shared_ids' => $postIds,
        ]);
    }

    private function insertPost(int $sharedWithId, string $sharedWithType, array $post): int
    {
        $allowToPostInStream = currentWorkspace()->isMemberAdmin() || currentWorkspace()->getChannelBySlug('stream')->ruleset === 'open';

        if ($sharedWithType === 'stream' && ! $allowToPostInStream) {
            throw new ForbiddenException('Operation not allowed');
        }

        $sharingPostId = $this->model->message->create($sharedWithId, $post);

        return $sharingPostId;
    }

    private function getSharedPostData(MessageRow $originalPost): array
    {
        if ($originalPost->isShare()) {
            return json_decode($originalPost->shared_post, true);
        }

        $originalPostAttachments = $this->model->messageAttachment->findRows([
            'message_id' => $originalPost->id,
        ]);

        $attachments = [];

        foreach ($originalPostAttachments as $attachment) {
            $attachments[] = [
                'type'      => $attachment->type,
                'file'      => $attachment->file,
                'filename'  => $attachment->filename,
                'url'       => $attachment->url,
                'url_title' => $attachment->url_title,
                'url_image' => $attachment->url_image,
                'url_site'  => $attachment->url_sitename,
                'url_description' => $attachment->url_description,
            ];
        }

        return [
            'commentId'   => (int) $originalPost->id,
            'memberId'    => (int) $originalPost->creator_id,
            'memberName'  => "{$originalPost->first_name} {$originalPost->last_name}",
            'text'        => $originalPost->body,
            'attachments' => $attachments ?? [],
            'createdAt'   => $originalPost->created_at,
            'avatar'      => $originalPost->avatar,
            'event'       => Event::getEventByPostId($originalPost->id),
        ];
    }

    /**
     * Subscribes the current user to receive notifications when someone else comments on a post
     * (even if the user has not interacted with the post or hasn't been tagged)
     * @param int $postId
     * @return NotificationSubscription
     */
    public function follow(int $postId): NotificationSubscription
    {
        $subscription = NotificationSubscription::create([
            'message_id' => $postId,
            'member_id'  => currentMemberId(),
            'reason'     => NotificationSubscription::REASON_FOLLOW,
        ]);

        return $subscription;
    }

    /**
     * Unsubscribes the current user from receiving notification when
     * someone else comments on a post.
     * @param int $postId
     * @return NotificationSubscription
     */
    public function unfollow(int $postId): void
    {
        NotificationSubscription::where([
            'message_id' => $postId,
            'member_id'  => currentMemberId(),
            'reason'     => NotificationSubscription::REASON_FOLLOW,
        ])->delete();
    }

    /**
     * "Subscribes" a user to NOT receive notifications (mute) when someone
     * else comments or mentions the current user on a specific post.
     * @param int $postId
     * @return NotificationSubscription
     */
    public function mute(int $postId): NotificationSubscription
    {
        $subscription = NotificationSubscription::create([
            'message_id' => $postId,
            'member_id'  => currentMemberId(),
            'reason'     => NotificationSubscription::REASON_MUTE,
        ]);

        return $subscription;
    }

    /**
     * Removes the mute "subscription" for the current user
     * on specific post.
     * @param int $postId
     * @return void
     * @throws PDOException
     */
    public function unmute(int $postId): void
    {
        NotificationSubscription::where([
            'message_id' => $postId,
            'member_id'  => currentMemberId(),
            'reason'     => NotificationSubscription::REASON_MUTE,
        ])->delete();
    }
}
