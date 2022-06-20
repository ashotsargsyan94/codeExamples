<?php

namespace App\Http\Controllers;

use App\Helpers\EncryptionLikeCIClass;
use App\Models\AutologinLink;
use App\Models\Campaign;
use App\Models\Community;
use App\Models\Member;
use App\Services\TwilioService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Twilio\Exceptions\TwilioException;

class TwilioController extends Controller
{
    private $twilio;
    private $encrypter;

    public function __construct()
    {
        $this->twilio = new TwilioService();
        $this->encrypter = new EncryptionLikeCIClass(['key' => env('ENCRYPTION_KEY')]);
    }

    public function sendLink(Request $request)
    {
        $validated = $request->validate([
            'From' => 'required|string',
            'Body' => 'required|string'
        ]);

        $from = $validated['From'];
        $body = $validated['Body'];

        $member = Member::where('phone', $from)->first();

        if (! $member) {
            Log::error('[Twilio] Member not found.', ['phone' => $from]);
            return false;
        }

        list($community, $amount) = explode(' ', $body);

        $campaign = Campaign::where('sms_code', $community)->first();

        if (! $campaign) {
            Log::error('[Twilio] Campaign not found.', ['sms_code' => $community]);
            return false;
        }

        if (! is_numeric($amount)) {
            Log::error('[Twilio] Amount not valid.', ['amount' => $amount]);
            return false;
        }

        $data = [
            'redirect_to'  => '#donations',
            'campaign_id'  => $campaign->id,
            'member_id'    => $member->id,
            'community_id' => $campaign->community_id,
            'amount'       => $amount,
        ];

        try {
            $guid = Str::uuid();
            $hash = $this->encrypter->encrypt(json_encode($data));

            $autologinLink = new AutologinLink();

            $autologinLink->member_id       = $member->id;
            $autologinLink->community_id    = $campaign->community_id;
            $autologinLink->guid            = $guid;
            $autologinLink->hash            = $hash;
            $autologinLink->expiration_date = Carbon::now()->addHours(24);
            $autologinLink->save();

            $msg_text = 'Please click the link to complete your giving. %s';
            $message = sprintf($msg_text, getenv('SQUIRREL_GIVE_URL') . '?token=' . $guid);

            $this->twilio->sendSMS($message, $from);
        } catch (TwilioException $e) {
            Log::error($e->getMessage(), $data);
        }
    }

    public function getAvailablePhoneNumbers(Request $request)
    {
        $validated = $request->validate(
            [
                'search' => 'required|string',
            ]
        );
        $availablePhoneNumbers = $this->twilio
            ->availablePhoneNumbers('US')
            ->local
            ->read(['areaCode' => $validated['search'], 50]);

        return array_map(
            fn($phone) => [
                'id'   => $phone->phoneNumber,
                'text' => $phone->friendlyName
            ],
            $availablePhoneNumbers
        );
    }

    public function communityReply(Request $request)
    {
        $member    = Member::where(['phone' => $request->From])->firstOrFail();
        $community = Community::where(['texting_number' => $request->To])->firstOrFail();

        $community->replyMessage($member, $request->Body);
    }
}
