<?php

namespace Squirrel\Repositories;

use Exception;
use libphonenumber\MatchType;
use libphonenumber\PhoneNumberUtil;
use Squirrel\Facades\Auth;
use Squirrel\Facades\ContentAccess;
use Squirrel\Model\Channel;
use Squirrel\Model\Member;
use Squirrel\Model\MemberMuter;
use Squirrel\Model\MemberInfoRequest;

class Members extends Repository
{
    public const HOME_BIRTHDAYS_LIMIT = 3;

    private const CONTACTS_BATCH_SIZE = 1000;

    public function findFriendsByContacts(array $contacts): array
    {
        $memberIds = [];

        $contactPhones = $this->cleanPhoneNumbers(array_column($contacts, 'phone'));
        $contactEmails = $this->cleanEmails(array_column($contacts, 'email'));

        if ($contactEmails) {
            $memberIdsByEmail = $this->matchingEmailMemberIds($contactEmails);
        }

        if ($contactPhones) {
            $memberIdsByPhone = $this->matchingPhoneMemberIds($contactPhones, $memberIdsByEmail ?? []);
        }

        $members = [...$memberIdsByEmail, ...$memberIdsByPhone];
        $memberIds = array_unique(array_column($members, 'id'));

        if (! $memberIds) {
            return [];
        }

        $memberIds = $this->filterOutFriends($memberIds);

        return $this->db
            ->select('id, LOWER(email) AS email, phone, avatar, first_name, last_name')
            ->from('members')
            ->where_in('id', $memberIds)
            ->order_by('last_name ASC, first_name ASC')
            ->get()->custom_result_object(Member::class);
    }

    public function emailExists(string $email, ?int $excludeMemberId = null): bool
    {
        return (bool) $this->db->from('members')
            ->where('email', $email)
            ->where('id <>', $excludeMemberId ?? 0)
            ->limit(1)
            ->get()->row();
    }

    public function memberWhoForgotEmail(string $email): ?Member
    {
        return $this->db
            ->select(array_map(fn($field) => "m.$field", Member::PUBLIC_FIELDS))
            ->from('members m')
            ->join('community_members cm', 'cm.member_id = m.id AND cm.community_id = 1')
            ->where('m.email', $email)
            ->where_in('m.status', ['active', 'inactive', 'signup'])
            ->where('cm.ban_date IS NULL')
            ->get()->custom_row_object(0, Member::class);
    }

    /**
     * Returns the members that match the search term.
     *
     * @param string|null $term
     * @param array|null $excludeMemberIds  Members to exclude (e.g. we already have them selected)
     * @param int|null $channelId           Channel to limit the search to (optional)
     *
     * @return array
     */
    public function search(string $term, ?array $excludeMemberIds = null, ?int $channelId = null, ?int $postId = null, ?bool $includeCurrentMember = false)
    {
        if ($channelId && ! $channel = ContentAccess::channel($channelId)) {
            throw new Exception('invalid_channel');
        }

        if ('friends' === $channel['visibility'] ?? null) {
            if ($postId) {
                $includeMemberIds = ContentAccess::whoCanSeePost($postId);
            } else {
                $includeMemberIds = ContentAccess::whoseContentICanAlwaysSee();
            }
        } elseif (isset($channel['creator_id'])) {
            $includeMemberIds = Channel::find($channelId)->memberIds();
        } elseif (currentWorkspace()->config('visibility.global') === 'community') {
            $includeMemberIds = null; // Include all community members
        } else {
            $includeMemberIds = array_keys(ContentAccess::whichMembersICanSee());
        }

        if ($includeCurrentMember) {
            $includeMemberIds[currentMemberId()] = currentMemberId();
        } else {
            $excludeMemberIds[currentMemberId()] = currentMemberId();
        }

        if ($includeMemberIds) {
            $this->db->where_in('m.id', $includeMemberIds);
        }

        if ($term) {
            $this->db->like("CONCAT(m.first_name, ' ', m.last_name)", $term);
        }

        if (currentCommunityId()) {
            $this->db
                ->join('community_members cm', 'm.id = cm.member_id')
                ->where('cm.community_id', currentCommunityId());
        }

        return $this->db
            ->select(array_map(fn($field) => "m.$field", Member::PUBLIC_FIELDS))
            ->from('members m')
            ->where_not_in('m.id', [...(array) $excludeMemberIds, gnome()->id])
            ->limit(1000)
            ->get()->custom_result_object(Member::class);
    }

    /**
     * Get birthdays today that the user has not interacted with (messaged, marked as ignore)
     * This is used for showing a count in the bubble next to birthdays
     *
     * @param Array $memberIds
     * @return Array
     */
    public function getUnseenBirthdaysToday(?array $memberIds = null): array
    {
        // if members were passed in, but the array is empty, nothing to do here.
        if (is_array($memberIds) && count($memberIds) === 0) {
            return [];
        }

        // if member ids weren't passed in, fetch them.
        if (! $memberIds) {
            $memberIds = array_keys(ContentAccess::whichMembersICanSee());
        }

        // remove the current user
        $memberIds = array_diff($memberIds, [ currentMemberId() ]);

        if (! $memberIds) {
            return [];
        }

        $timezoneOffset = currentMember()->getTimezoneOffset();

        if (! inDashboard()) {
            $this->db->where('cm.community_id', currentCommunityId());
        }

        return $this->db
            ->select('m.id, m.birth_day, m.birth_month, m.first_name, m.last_name, m.avatar')
            ->from('members m')
            ->join('member_geo mg', 'm.id = mg.member_id', 'LEFT')
            ->join('community_members cm', 'cm.member_id = m.id')
            ->join(
                'birthday_viewers bv',
                'bv.viewer_id = ' . currentMemberId() . ' AND bv.member_id = m.id AND year = ' . date("Y"),
                'LEFT'
            )
            ->where_in('m.id', $memberIds)
            ->where('m.birth_day', 'DAY(FROM_UNIXTIME(UNIX_TIMESTAMP() + ' . $timezoneOffset . '))', false)
            ->where('m.birth_month', 'MONTH(FROM_UNIXTIME(UNIX_TIMESTAMP() + ' . $timezoneOffset . '))', false)
            ->where('bv.member_id IS NULL')
            ->group_by('m.id')
            ->get()->custom_result_object(Member::class);
    }

    public function getBirthdays(?array $memberIds = null): array
    {
        // if members were passed in, but the array is empty, nothing to do here.
        if (is_array($memberIds) && count($memberIds) === 0) {
            return [];
        }

        // if member ids weren't passed in, fetch them.
        if (! $memberIds) {
            $memberIds = array_keys(ContentAccess::whichMembersICanSee());
        }

        // remove the current user
        $memberIds = array_diff($memberIds, [ currentMemberId() ]);

        $startDate = $this->input->get_post('date') ?? date('Y-m-d');

        $year = 0;
        $queries = [];

        //loop through this year and next year to get any birthdays that haven't passed yet this year, and the remaining birthdays next year.
        while ($year <= 1) {
            $birthdayThisYear = "DATE_FORMAT(CONCAT("
                . date('Y', strtotime('+' . $year . ' year'))
                . ", '-', m.birth_month, '-', m.birth_day), '%Y-%m-%d')";

            $this->db
                ->select("m.id, m.birth_day, m.birth_month, m.first_name, m.last_name, m.avatar, " . $birthdayThisYear . " AS next_birthday, bv.member_id AS is_seen")
                ->from('members m')
                ->join(
                    'birthday_viewers bv',
                    'bv.viewer_id = ' . currentMemberId() . ' AND bv.member_id = m.id AND year = ' . date('Y'),
                    'LEFT'
                )
                ->where_in('m.id', $memberIds)
                ->where('m.birth_day IS NOT NULL')
                ->where('m.birth_month IS NOT NULL');

            if (currentCommunityId()) {
                $this->db
                    ->join('community_members cm', 'cm.member_id = m.id')
                    ->where('cm.community_id', currentCommunityId());
            }

            if ($year === 0) {
                // Get any birthdays today or to the year end
                $this->db->where($birthdayThisYear . " >= ", $startDate);
            } else {
                // Get the remaining birthdays up until yesterdays date for the following year.
                $this->db
                    ->where($birthdayThisYear . " < ", date('Y-m-d', strtotime($startDate . '+' . $year . ' year')))
                    ->order_by('next_birthday');
            }

            $queries[$year] = $this->db->get_compiled_select();

            $year++;
        }

        $combinedQuery = $this->db->query($queries[0] . ' UNION ' . $queries[1]);
        $result = $combinedQuery->result_array();

        return $result;
    }

    public function getMutedChannelIds(): array
    {
        if (! inDashboard()) {
            $this->db
                ->join('channels ch', 'ch.id = chm.channel_id')
                 ->where('ch.community_id', currentCommunityId());
        }

        $channels = $this->db
            ->select('chm.channel_id')
            ->from('channel_muters chm')
            ->where('chm.member_id', currentMemberId())
            ->get()->result_array();

        return array_column($channels, 'channel_id');
    }

    /**
     * Get all members
     *
     * @param int $inactiveDays Number of days to treat user as inactive
     * @param array|string[] $fields
     * @return array
     */
    public function getAllInactive(int $inactiveDays = 3): array
    {
        $memberFields = array_map(fn($field) => "m.$field", Member::PUBLIC_FIELDS);

        return $this->db
            ->select($memberFields)
            ->from('members m')
            ->join('channel_viewers chv', 'chv.member_id = m.id', 'LEFT')
            ->where('type <>', 'gnome')
            ->where('email_notifications', true)
            ->group_by('id')
            ->having('MAX(chv.last_read_date) <', "NOW() - INTERVAL {$inactiveDays} DAY", false)
            ->or_having('MAX(chv.last_read_date) IS NULL')
            ->get()->custom_result_object(Member::class);
    }

    public function getProfileForMember(int $memberId): array
    {
        $output = [];
        $memberId = $this->input->post('id') ?? $memberId;

        if (! ContentAccess::canISeeMember($memberId)) {
            return $this->getLimitedProfileForMember($memberId);
        }

        if ($member = Member::find($memberId)) {
            $output['profile']['id']        = $member->id;
            $output['profile']['firstname'] = ucwords($member->first_name);
            $output['profile']['fullname']  = ucwords($member->fullName);
            $output['profile']['avatar']    = $member->avatar;
            $output['profile']['bio']       = $member->bio;
            $output['profile']['is_gnome']  = $member->type == 'gnome';
            $output['profile']['muted']     = MemberMuter::isMuted(currentMemberId(), $member->id);

            $badges = $this->model->badge->byMember($memberId);
            $output['profile']['badge'] = $badges[0]['image'] ?? null;
            $output['profile']['badgeCount'] = count($badges);

            $isPersonalInfoGranted = MemberInfoRequest::isGranted($memberId, currentMemberId());
            $output['profile']['phone'] = $isPersonalInfoGranted ? $member->phone : null;
            $output['profile']['email'] = $isPersonalInfoGranted ? $member->email : null;

            $isPersonalInfoRequested = ! $isPersonalInfoGranted ? MemberInfoRequest::isRequested($memberId, currentMemberId()) : false;
            $output['profile']['info_requested'] = $isPersonalInfoRequested;
            $output['profile']['info_granted'] = $isPersonalInfoGranted;
        }

        $output['profile']['connected'] = ContentAccess::isConnected($memberId);
        $output['profile']['viewAccess'] = 'full';

        // TODO : Return the counter only, then paginate results when opening the popup
        $output['profile']['friends'] = $member->friends();

        $output['events'] = $this->model->event->getEventsByCreator($memberId);

        foreach ($output['events'] as &$event) {
            $time                  = strtotime($event['start_date']);
            $event['format_day']   = date('j', $time);
            $event['format_month'] = strtoupper(date('M', $time));
            $event['format_time']  = date('h:i A', $time);
        }

        return $output;
    }

    /**
    * Attempts to get limited profile info for a member if they are a second level connection (friend of a friend)
    *
    * @throws Exception if user does not have permission to view profile.
    */
    protected function getLimitedProfileForMember(int $memberId): array
    {
        $output = [];
        $memberId = $this->input->post('id');

        $allowedAsAdmin = currentMember()->isCommunityAdmin() && currentWorkspace()->hasMember($memberId);

        if (! ContentAccess::canIConnectWith($memberId) && ! $allowedAsAdmin) {
            throw new Exception('Unauthorized');
        }

        if ($member = Member::find($memberId)) {
            $output['profile']['id']        = $member->id;
            $output['profile']['firstname'] = ucwords($member->first_name);
            $output['profile']['fullname']  = ucwords($member->fullName);
            $output['profile']['avatar']    = $member->avatar;
            $output['profile']['bio']       = $member->bio;
            $output['profile']['is_gnome']  = $member->type == 'gnome';
        }

        $output['profile']['viewAccess'] = 'limited';

        $output['profile']['connected'] = false;
        $output['profile']['connectionStatus'] = $this->model->connections->getConnectionStatus($memberId);

        // TODO : need to paginate this... (this is for the friends popup in Profile > Friends icon)
        $output['profile']['friends'] = [];

        $output['events'] = null;

        return $output;
    }

    private function filterOutFriends(array $memberIds): array
    {
        $friends = $this->models->friend->find();

        return array_diff($memberIds, array_column($friends, 'id'));
    }

    private function matchingEmailMemberIds(array $contactEmails): array
    {
        $emailMatchingMembers = $this->db
            ->select('id')
            ->from('members')
            ->where_in('email', $contactEmails)
            ->where('id <>', currentMemberId())
            ->get()->result_array();

        return array_column($emailMatchingMembers, null, 'id');
    }

    private function matchingPhoneMemberIds(array $contactPhones, array $excludeMemberIds): array
    {
        foreach ($contactPhones as $phoneNumber) {
            $phonesBySuffix[substr($phoneNumber, -6)][] = $phoneNumber;
        }

        $page = 1;
        $memberIds = [];
        $suffixes = array_keys($phonesBySuffix ?? []);

        do {
            $phoneIndexes = $this->candidatesByPhoneSuffix($suffixes, $excludeMemberIds, $page++);

            foreach ($phoneIndexes as $index) {
                if ($this->comparePhoneNumbers($index['phone'], $contactPhones)) {
                    $memberId = $index['member_id'];
                    $memberIds[$memberId] = ['id' => $memberId];
                }
            }

            $excludeMemberIds = array_merge(array_keys($excludeMemberIds), $memberIds);
            $memberMaxQtyNotReached = count($memberIds) < self::CONTACTS_BATCH_SIZE;
            $foundAllCandidates = count($phoneIndexes) < self::CONTACTS_BATCH_SIZE;
        } while ($memberMaxQtyNotReached && ! $foundAllCandidates);

        return $memberIds;
    }

    private function candidatesByPhoneSuffix(array $suffixes, array $excludeMemberIds, int $page)
    {
        $excludeMemberIds = array_keys($excludeMemberIds);
        $excludeMemberIds[] = currentMemberId();

        return $this->db
            ->select("ph.member_id, ph.suffix, m.phone", false)
            ->from('phone_index ph')
            ->join('members m', 'm.id = ph.member_id')
            ->where_in('ph.suffix', $suffixes)
            ->where_not_in('ph.member_id', $excludeMemberIds)
            ->limit(self::CONTACTS_BATCH_SIZE, self::CONTACTS_BATCH_SIZE * ($page - 1))
            ->get()->result_array();
    }

    private function comparePhoneNumbers($memberPhone, $contactPhones)
    {
        $phoneUtil = PhoneNumberUtil::getInstance();

        foreach ($contactPhones as $contactPhone) {
            $matchType = $phoneUtil->isNumberMatch($memberPhone, $contactPhone);

            if ($matchType >= MatchType::SHORT_NSN_MATCH) {
                return true;
            }
        }

        return false;
    }

    private function cleanPhoneNumbers($phones)
    {
        return array_filter(array_map(function ($phone) {
            return str_replace(str_split('(),.+- '), '', $phone);
        }, $phones));
    }

    private function cleanEmails($emails)
    {
        return array_filter(array_map('strtolower', $emails), function ($email) {
            return $email;
        });
    }
}
