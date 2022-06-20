<?php

namespace App\Http\Controllers;

use App\Events\GenericEvent;
use App\Models\Channel;
use App\Models\Community;
use App\Models\ChannelGroup;
use App\Models\Notifiable;
use App\Models\NotifiableMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\RedirectResponse;

class ChannelController extends Controller
{
    public function index()
    {
        $channels = Channel::where(['community_id' => Cookie::get('community_id'), 'type' => 'Core'])
            ->where('status', '<>', 'deleted')
            ->orderBy('order')
            ->orderBy('name')
            ->get();

        return view('channel.index', compact('channels'));
    }

    public function create()
    {
        $icons  = $this->getIcons();
        $groups = ChannelGroup::where('community_id', Cookie::get('community_id'))->get();
        $themes = $this->getThemes();

        return view('channel.create', compact('groups', 'icons', 'themes'));
    }

    public function store(Request $request): RedirectResponse
    {
        $communityId = Cookie::get('community_id');

        $request->validate([
            'name' => 'required',
            'order' => 'integer',
            'slug' => ['required',
                static function ($_, $value, $fail) use ($communityId) {
                    $count = Channel::where([
                        'community_id' => $communityId,
                        'slug'         => $value,
                    ])->where('status', '!=', 'deleted')->count();

                    if ($count > 0) {
                        $fail('Slug of the channel should be unique');
                    }
                }
            ]
        ]);

        $data = $request->all();

        $channel = new Channel();

        $channel->type             = 'Core';
        $channel->community_id     = Cookie::get('community_id');
        $channel->name             = $data['name'];
        $channel->slug             = $data['slug'];
        $channel->icon             = $data['icon'];
        $channel->order            = $data['order'];
        $channel->channel_group_id = $data['channel_group_id'];
        $channel->creator_id       = $data['membership_required'] === 'Y' ? Auth::user()->id : null;
        $channel->theme            = $data['theme'];
        $channel->visibility       = $data['see_only_friends_posts'] === 'Y' ? 'friends' : 'everyone';

        switch ($data['member_can_post'] . $data['member_can_reply']) {
            case 'YY':
                $channel->ruleset = 'open';
                break;
            case 'NY':
                $channel->ruleset = 'managed';
                break;
            case 'NN':
                $channel->ruleset = 'closed';
                break;
            case 'YN':
                return redirect()->route('community_management.index')->with('error', 'Channel not added');
                break;
        }

        try {
            $channel->save();

            if ($data['membership_required'] === 'Y') {
                $channel->addMember(Auth::user(), 'admin');
            } else {
                $memberIds = Community::find($communityId)->members->pluck('id');

                $notifiable = Notifiable::create([
                    'type' => Notifiable::CHANNEL_JOIN,
                    'link' => $channel->id,
                    'data' => ['fromAdmin' => true, 'openChannel' => true],
                    'community_id' => $communityId,
                ]);

                foreach ($memberIds as $memberId) {
                    if ($memberId != Auth::user()->id) {
                        NotifiableMember::create([
                            'notifiable_id' => $notifiable->id,
                            'member_id'     => $memberId,
                        ]);
                    }

                    event(new GenericEvent("private-{$memberId}", GenericEvent::EVENT_NEW_CHANNEL, $channel->toArray()));
                }
            }
        } catch (\Throwable $e) {
            $message = getenv('APP_ENV') !== 'production' ? $e->getMessage() : 'An error has occurred.';
            return redirect()->route('channel.index')->with('error', $message);
        }

        return redirect()->route('channel.index')->with('success', 'Channel added successfully');
    }

    public function edit(Channel $channel)
    {
        $icons   = $this->getIcons();
        $groups  = ChannelGroup::where('community_id', Cookie::get('community_id'))->get();
        $options = [
            'membership_required'    => $channel->creator_id ? 'Y' : 'N',
            'see_only_friends_posts' => $channel->visibility === 'friends' ? 'Y' : 'N',
            'member_can_post'        => $channel->ruleset === 'open' ? 'Y' : 'N',
            'member_can_reply'       => $channel->ruleset !== 'closed' ? 'Y' : 'N',
        ];
        $themes  = $this->getThemes();

        return view('channel.edit', compact('channel', 'options', 'groups', 'icons', 'themes'));
    }

    public function update(Request $request, string $channelId)
    {
        $request->validate([
            'name'  => 'required',
            'order' => 'integer',
            'slug'  => ['required',
                static function ($attribute, $value, $fail) use ($channelId) {
                    $count = Channel::where([
                        'community_id' => Cookie::get('community_id'),
                        'slug'         => $value,
                    ])
                        ->where('status', '!=', 'deleted')
                        ->where('id', '!=', $channelId)->count();

                    if ($count > 0) {
                        $fail('Slug of the channel should be unique');
                    }
                }
            ],
        ]);

        try {
            $data = $request->all();

            $channel = Channel::find($channelId);
            $channel->name             = $data['name'];
            $channel->slug             = $data['slug'];
            $channel->icon             = $data['icon'];
            $channel->order            = $data['order'];
            $channel->channel_group_id = $data['channel_group_id'];
            $channel->creator_id       = $data['membership_required'] === 'Y' ? Auth::user()->id : null;
            $channel->theme            = $data['theme'];
            $channel->visibility       = $data['see_only_friends_posts'] === 'Y' ? 'friends' : 'everyone';

            switch ($data['member_can_post'] . $data['member_can_reply']) {
                case 'YY':
                    $channel->ruleset = 'open';
                    break;
                case 'NY':
                    $channel->ruleset = 'managed';
                    break;
                case 'NN':
                    $channel->ruleset = 'closed';
                    break;
                case 'YN':
                    return redirect()->route('community_management.index')
                        ->with('error', 'The combination "Can Post but Cannot Reply" is currently not supported');
            }

            $channel->save();
        } catch (\Throwable $e) {
            $message = getenv('APP_ENV') !== 'production' ? $e->getMessage() : 'An error has occurred.';
            return redirect()->route('channel.index')->with('error', $message);
        }

        return redirect()->route('channel.index')->with('success', 'Channel updated successfully');
    }

    public function archive($channel_id)
    {
        try {
            $channel = Channel::find($channel_id);
            $channel->status = 'archived';
            $channel->save();
        } catch (\Throwable $e) {
            $message = getenv('APP_ENV') !== 'production' ? $e->getMessage() : 'An error has occurred.';
            return redirect()->route('channel.index')->with('error', $message);
        }

        return redirect()->route('channel.index')->with('success', 'Channel archived successfully');
    }

    public function restore($channel_id)
    {
        try {
            $channel = Channel::find($channel_id);
            $channel->status = 'active';
            $channel->save();
        } catch (\Throwable $e) {
            $message = getenv('APP_ENV') !== 'production' ? $e->getMessage() : 'An error has occurred.';
            return redirect()->route('channel.index')->with('error', $message);
        }

        return redirect()->route('channel.index')->with('success', 'Channel restored successfully');
    }

    public function destroy(Channel $channel)
    {
        try {
            $channel->status = 'deleted';
            $channel->save();

            $notifiable = Notifiable::create([
                'type' => Notifiable::CHANNEL_CLOSE,
                'link' => $channel->id,
                'data' => [
                    'closedBy'    => Auth::user()->id,
                    'fromAdmin'   => true,
                    'openChannel' => true,
                ],
                'community_id' => Cookie::get('community_id'),
            ]);

            $channel_push = [
                'id'           => $channel->id,
                'community_id' => $channel->community_id,
                'kicked'       => true,
            ];

            // TODO : implement all foreign logic as listeners, not in this method
            $memberIds = Community::find(Cookie::get('community_id'))->members()->pluck('members.id');

            // if it's invite-only channel, then notify only members who were in the channel (not the whole community)
            if ($channel->creator_id !== null) {
                $memberIds = $channel->members()->pluck('members.id');
            }

            foreach ($memberIds as $memberId) {
                 if ($memberId != Auth::user()->id) {
                     NotifiableMember::create([
                         'notifiable_id' => $notifiable->id,
                         'member_id'     => $memberId,
                     ]);
                 }

                event(new GenericEvent("private-{$memberId}", GenericEvent::EVENT_DELETED_CHANNEL, $channel_push));
            }
        } catch (\Throwable $e) {
            $message = getenv('APP_ENV') !== 'production' ? $e->getMessage() : 'An error has occurred.';
            return redirect()->route('channel.index')->with('error', $message);
        }

        return redirect()->route('channel.index')->with('success', 'Channel deleted successfully');
    }

    private function getThemes(): array
    {
        $type = DB::select(DB::raw('SHOW COLUMNS FROM channels WHERE Field = "theme"'))[0]->Type;
        preg_match('/^enum\((.*)\)$/', $type, $matches);
        $values = [];

        foreach (explode(',', $matches[1]) as $value) {
            $values[] = trim($value, "'");
        }

        return $values;
    }
}
