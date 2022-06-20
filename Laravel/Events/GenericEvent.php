<?php

namespace App\Events;

use Illuminate\Queue\SerializesModels;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;

class GenericEvent implements ShouldBroadcast
{
    use Dispatchable;
    use SerializesModels;
    use InteractsWithSockets;

    public const EVENT_NEW_ACTIVITY    = 'new.activity.squirrel';
    public const EVENT_NEW_CHANNEL     = 'new.channel.squirrel';
    public const EVENT_DELETED_CHANNEL = 'deleted.channel.squirrel';
    public const EVENT_LEAVE_CHANNEL   = 'leave.channel.squirrel';
    public const EVENT_MESSAGE_CREATED = 'created.message.squirrel';

    private string $channelName;
    private string $eventName;

    /**
     * mixed $data  Must allow casting to array.
     */
    public $data;

    public function __construct(string $channelName, string $eventName, $data)
    {
        $this->channelName = $channelName;
        $this->eventName = $eventName;
        $this->data = $data;
    }

    public function broadcastOn(): array
    {
        return [$this->channelName . env('PUSHER_SERVER_UID')];
    }

    public function broadcastWith(): array
    {
        return (array) $this->data;
    }

    public function broadcastAs(): string
    {
        return $this->eventName;
    }
}
