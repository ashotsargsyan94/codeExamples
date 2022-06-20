<?php

namespace App\Events;

use App\Models\Event;
use Illuminate\Queue\SerializesModels;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;

class EventCreated implements ShouldBroadcast
{
    use Dispatchable;
    use SerializesModels;
    use InteractsWithSockets;

    private Event $event;
    private string $type;
    private ?int $id;

    public function __construct(Event $event, string $type, ?int $id = null)
    {
        $this->event = $event;
        $this->type = $type;
        $this->id = $id;
    }

    public function broadcastOn(): array
    {
        $channel = $this->type === 'global' ? 'global' : "{$this->type}-{$this->id}";

        return [$channel . env('PUSHER_SERVER_UID')];
    }

    public function broadcastWith(): array
    {
        return $this->event->toArray();
    }

    public function broadcastAs(): string
    {
        return 'new.event.squirrel';
    }
}
