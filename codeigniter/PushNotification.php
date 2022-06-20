<?php

namespace Squirrel\Helper;

use Exception;
use Pushok\AuthProvider;
use Pushok\Client;
use Pushok\Notification;
use Pushok\Payload;
use Squirrel\Model\Notifiable;

class PushNotification
{
    public function sendIOSCallNotification(string $apnsToken, string $userId, string $title, string $callType, string $roomName, string $twilioToken): ?string
    {
        $options = [
            'key_id' => '543Y9M57KJ', // The Key ID obtained from Apple developer account
            'team_id' => APPLE_TEAM_ID, // The Team ID obtained from Apple developer account
            'app_bundle_id' => APP_BUNDLE_ID,
            'private_key_path' => __DIR__ . '/AuthKey_543Y9M57KJ.p8',
            'private_key_secret' => null
        ];

        $authProvider = AuthProvider\Token::create($options);

        $payload = Payload::create();
        $payload->setSound('default');
        $payload->setPushType('voip');


        $payload->setCustomValue('userId', $userId);
        $payload->setCustomValue('title', $title);
        $payload->setCustomValue('callType', $callType);
        $payload->setCustomValue('roomName', $roomName);
        $payload->setCustomValue('twilioToken', $twilioToken);

        $client = new Client($authProvider, ENVIRONMENT == 'production');
        $client->addNotification(new Notification($payload, $apnsToken));

        $responses = $client->push();
        $statusCode = $responses[0]->getStatusCode();

        if ($statusCode >= 200 && $statusCode <= 299) {
            return null;
        }

        return $responses[0]->getErrorDescription();
    }

    public function send(array $deviceIds, Notifiable $notifiable): int
    {
        return array_reduce($deviceIds, function ($count, $deviceId) use ($notifiable) {
            $success = $this->sendPushNotification($deviceId, $notifiable)->success ?? false;
            return $count + ($success ? 1 : 0);
        }, 0);
    }

    /**
     * Sends Push notification to given device.
     */
    private function sendPushNotification(string $deviceId, Notifiable $notification)
    {
        $url = 'https://fcm.googleapis.com/fcm/send';

        $headers = [
            'Authorization: key=' . FIREBASE_PUSH_TOKEN,
            'Content-Type: application/json',
        ];

        if (! $content = $notification->getPNContent()) {
            return;
        }

        $fields = [
            'to' => $deviceId,
            'data' => [
                'title' => $notification->title,
                'body' => $notification->message,
                'uri' => $notification->url,
                'badge' => $notification->badge,
                'activity_object' => $content,
            ],
            'notification' => [
                'title' => $notification->title,
                'body' => $notification->message,
                'badge' => $notification->badge,
            ],
        ];

        return $this->curl($url, $headers, $fields);
    }

    private function curl(string $url, array $headers, array $postFields)
    {
        $ch = curl_init();

        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        curl_setopt($ch, CURLOPT_SSLVERSION, CURL_SSLVERSION_TLSv1);
        curl_setopt($ch, CURLOPT_SSL_CIPHER_LIST, "ALL:!aNULL:!LOW:!EXPORT:!SSLv2");

        if (isset($postFields['data']['body'])) {
            $postFields['data']['body'] = htmlspecialchars_decode($postFields['data']['body'], ENT_QUOTES);
        }

        if (isset($postFields['notification']['body'])) {
            $postFields['notification']['body'] = parse_smiley_decimal_to_unicode($postFields['notification']['body']);
            $postFields['notification']['body'] = htmlspecialchars_decode($postFields['notification']['body'], ENT_QUOTES);
        }

        // ISQ-1741 need for proper show emojis
        $payload = str_replace('\\\\', '\\', json_encode($postFields));

        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);

        $result = curl_exec($ch);
        $error  = curl_error($ch) ?: '';

        curl_close($ch);

        if ($result === false) {
            throw new Exception("Error sending push notification (curl): {$error}");
        }

        return json_decode($result);
    }
}
