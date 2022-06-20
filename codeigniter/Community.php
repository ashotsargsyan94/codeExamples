<?php

use Squirrel\Exception\ForbiddenException;
use Squirrel\Exception\NotFoundException;
use Squirrel\Exception\BadRequestException;
use Squirrel\Exception\UnauthorizedException;
use Squirrel\Facades\Auth;
use Squirrel\Facades\CommunitiesRepository;
use Squirrel\Facades\ContentAccess;
use Squirrel\Model\Notifiable;
use Squirrel\Model\CommunityMember;
use Squirrel\Model\NotifiableMember;
use Squirrel\Services\Activity\ActivityStream;
use Squirrel\Model\Channel;
use Squirrel\Model\Community as CommunityModel;
use Squirrel\Model\Member;
use Squirrel\Model\SecurityGroupMember;

class Community extends MY_Controller
{
    public function members()
    {
        $limit  = $this->input->post('limit') ?? 20;
        $offset = $this->input->post('nextOffset') ?? 0;

        $visibleMembers = ContentAccess::whichMembersICanSee((int) $limit, $offset);
        unset($visibleMembers[currentMemberId()], $visibleMembers[gnome()->id]);

        $members = array_values(array_map(fn($member) => new Member($member), $visibleMembers));

        if (! $offset) {
            array_unshift($members, currentMember());
        }

        return $this->outputJSON([
            'members'       => $members,
            'totalCount'    => currentWorkspace()->membersCount(),
            'limit'         => $limit,
            'nextOffset'    => $offset + $limit,
        ]);
    }

    public function listed()
    {
        $communities = CommunitiesRepository::byMember(currentMemberId(), [
            CommunityMember::STATUS_INACTIVE,
            CommunityMember::STATUS_REQUESTED,
            CommunityMember::STATUS_NOT_A_MEMBER,
        ]);

        $listableCommunities = array_values(array_filter(
            $communities,
            fn($community) => in_array($community->type, ['public', 'managed'])
        ));

        return $this->outputJSON([
            'communities' => $listableCommunities,
        ]);
    }

    public function join()
    {
        $communityId = (int) $this->input->post('id');

        if (! $community = CommunitiesRepository::byId($communityId)) {
            throw new NotFoundException();
        }

        if ($community->isClosed()) {
            throw new ForbiddenException();
        }

        $community->addMember(currentMemberId());
        $community->pushJoinedCommunityEvent(currentMemberId());

        return $this->outputJSON();
    }

    /**
     * Send join request to managed community
     */
    public function request()
    {
        $communityId = (int) $this->input->post('id');

        if (! $community = CommunitiesRepository::byId($communityId)) {
            throw new NotFoundException();
        }

        $community->sendRequest(currentMemberId());

        return $this->outputJSON();
    }

    /**
     * Cancel request to join managed community by member
     */
    public function cancelRequest()
    {
        return $this->handleRequest(Notifiable::COMMUNITY_REQUEST_CANCEL);
    }

    /**
     * Decline member request to join managed community by community admin
     */
    public function declineRequest()
    {
        return $this->handleRequest(Notifiable::COMMUNITY_REQUEST_DECLINE);
    }

    /**
     * Accept member request to join managed community by community admin
     */
    public function acceptRequest()
    {
        return $this->handleRequest(Notifiable::COMMUNITY_REQUEST_ACCEPT);
    }

    private function handleRequest(string $responseType)
    {
        if (! $notifiableId = (int) $this->input->post('notifiableId')) {
            throw new BadRequestException();
        }

        $notifiableMemberEntry = NotifiableMember::where([
            'notifiable_id' => $notifiableId,
            'member_id'     => currentMemberId(),
        ])->get();

        if (! $notifiableMemberEntry) {
            throw new UnauthorizedException();
        }

        $notification = Notifiable::find($notifiableId);

        if (! $notification) {
            throw new UnauthorizedException();
        }

        $communityId = $notification->data['community_id'];

        if (! $community = CommunitiesRepository::byId($communityId)) {
            throw new NotFoundException();
        }

        $requesterId = $notification->data['requester_id'];

        $communityRequest = CommunityMember::where([
            'community_id' => $communityId,
            'member_id'    => $requesterId,
            'status'       => CommunityMember::STATUS_REQUESTED
        ])->get();

        if (! $communityRequest) {
            throw new BadRequestException();
        }

        if ($responseType === Notifiable::COMMUNITY_REQUEST_ACCEPT) {
            CommunityMember::where([
                'community_id' => $communityId,
                'member_id'    => $requesterId,
                'status'       => CommunityMember::STATUS_REQUESTED
            ])->update([
                'status' => CommunityMember::STATUS_ACTIVE,
                'join_date' => date('Y-m-d H:i:s')
            ]);

            $community->pushJoinedCommunityEvent($requesterId);
        } else {
            CommunityMember::where([
                'community_id' => $communityId,
                'member_id'    => $requesterId,
                'status'       => CommunityMember::STATUS_REQUESTED
            ])->delete();
        }

        Notifiable::where([
            'link' => $notification->link
        ])->update([
            'data' => [
                'handledOn' => date('Y:m:d H:i:s'),
                'response' => $responseType,
                'community_id' => $communityId,
                'requester_id' => $requesterId,
                'respondent_id' => currentMemberId(),
            ]
        ]);

        return $this->outputJSON([
            'notification' => app(ActivityStream::class)->notification($notifiableId),
        ]);
    }

    /**
     * 'Leave channel' request handler.
     */
    public function leave(): object
    {
        currentWorkspace()->removeMember(currentMemberId());
        currentWorkspace()->pushLeftCommunityEvent(currentMemberId());

        return $this->outputJSON();
    }

    public function switch()
    {
        $this->model->channelViewer->initialize();

        $channels = $this->model->channel->byType();

        if (inDashboard()) {
            $channels['all'] = [];
        }

        $sidebar = $this->load->view('includes/sidebar', [
            'communities' => Auth::communities(),
            'communityId' => currentCommunityId(),
            'community'   => currentWorkspace(),
            'channels'    => $channels,
        ], true);

        $navTabs = $this->load->view('includes/navtabs', [
            'navTabs' => $this->model->dashboard->getNavTabs(),
        ], true);

        $communityNavTabs = currentWorkspace()->includeNavTabs()
            ? $this->load->view('includes/communityNavTabs', ['communityNavTabs' => currentWorkspace()->getNavTabs()], true)
            : null;

        if (isset(currentWorkspace()->additional_fields)) {
            currentWorkspace()->additional_fields = currentWorkspace()->translateAdditionalFields(
                currentWorkspace()->additional_fields
            );
        }

        return $this->outputJSON([
            'community' => json_decode(json_encode(currentWorkspace())),
            'isAdmin'   => currentMember()->isCommunityAdmin(),
            'sidebar'   => $sidebar,
            'navTabs'   => $navTabs,
            'channels'  => $channels['all'],
            'bubbles'   => $this->model->bubbles->getAllAlerts(),
            'communityNavTabs' => $communityNavTabs,
            'channelsNotified' => $channels['notified'],
        ]);
    }

    public function getCommunityMaskData()
    {
        $returnArray = [
            'success' => false
        ];

        if ($this->isCommunityOrGlobalAdmin(currentWorkspace())) {
            $returnArray = [
                'isAdmin' => true,
                'maskName'   => currentWorkspace()->mask->name,
                'maskAvatar' => currentWorkspace()->mask->avatar,
            ];
        }
        return $this->outputJSON($returnArray);
    }

    private function notifySecurityGroupReviewers(
        array $field,
        string $selectedValue,
        CommunityModel $community,
        array $excludedReviewerIds = []
    ): array {
        $reviewerIds = [];
        $reviewer = $field['securityGroupReviewerId'];
        $options = array_filter($field['group'], fn ($option) => $option['id'] == $selectedValue);
        $option = array_shift($options);

        foreach ($option['securityGroups'] as $securityGroupId) {
            if (currentMember()->belongsToSecurityGroup($securityGroupId)) {
                continue;
            }

            if ($reviewer == 'noneRequired') {
                SecurityGroupMember::create([
                    'security_group_id' => $securityGroupId,
                    'member_id' => currentMemberId(),
                ]);
            } elseif (is_numeric($reviewer)) {
                $reviewerIds = [(int) $field['securityGroupReviewerId']];
            } elseif ($reviewer == 'anyCommunityAdmin') {
                $adminMembers = $community->admins();
                $reviewerIds = array_column($adminMembers, 'member_id');
            } elseif ($reviewer == 'individualSecurityGroupAdmins') {
                $securityGroupAdminMembers = SecurityGroupMember::where([
                    'security_group_id' => $option['securityGroups'],
                    'role' => 'admin',
                ])->get();

                $reviewerIds = array_column($securityGroupAdminMembers, 'member_id');
            }

            Notifiable::create([
                'type' => Notifiable::ADDITIONAL_FIELDS_SG_REVIEW,
                'community_id' => currentCommunityId(),
                'data' => [
                    'fieldId' => $field['id'],
                    'selectedOptionId' => $option['id'],
                    'respondentId' => (int) currentMemberId(),
                    'reviewer' => $reviewer,
                    'securityGroupId' => $securityGroupId,
                    'communityId' => currentCommunityId(),
                ],
            ])->notifyMembers(array_diff($reviewerIds, $excludedReviewerIds[$securityGroupId] ?? []));

            $excludedReviewerIds[$securityGroupId] = array_unique([
                ...$excludedReviewerIds[$securityGroupId] ?? [],
                ...$reviewerIds
            ]);
        }

        return $excludedReviewerIds;
    }

    public function additionalFieldsSubmit()
    {
        $communityId = $this->input->post('communityId') ?: currentCommunityId();
        $community = CommunityModel::find($communityId);
        $form = $this->input->post('data') ?: null;

        if (! $form) {
            return $this->outputJSON([
                'success' => false,
                'message' => _('No data submitted'),
            ]);
        }

        $form = json_decode(urldecode($form));
        $submit = [];
        $excludedReviewerIds = [];

        foreach ($form as $field) {
            $id = $field->name;
            $value = $field->value;

            if (empty($value)) {
                continue;
            }

            $submit[] = compact('id', 'value');
            $field = $community->getAdditionalFields()->getField($id);
            $fieldIsTiedToSecurityGroup = $field && $field['tiedToSecurityGroup'];

            if ($fieldIsTiedToSecurityGroup) {
                $excludedReviewerIds = $this->notifySecurityGroupReviewers(
                    $field,
                    $value,
                    $community,
                    $excludedReviewerIds
                );
            }
        }

        if (count($submit) == 0) {
            return $this->outputJSON([
                'success' => false,
                'message' => _('No data submitted'),
            ]);
        }

        $additionalFieldsData = json_encode($submit);

        $this->db->update('community_members', [
            'additional_fields_data' => $additionalFieldsData
        ], [
            'member_id' => currentMemberId(),
            'community_id' => $communityId
        ]);

        foreach (Auth::communities() as &$community) {
            $community->_additionalInfoRequired = false;
            $community->_additionalInfoRequiredSubmit = $additionalFieldsData;
        }

        return $this->outputJSON([
            'message' => _('Additional data submitted successfully'),
            'additionalInfoRequiredSubmit' => $additionalFieldsData,
        ]);
    }

    public function listAdditionalFieldsRequired()
    {
        $communities = [];

        foreach (Auth::communities() as $community) {
            if (empty($community->additional_fields)) {
                continue;
            }

            $communities[] = [
                'id' => $community->id,
                'short_name' => $community->short_name,
                'description' => $community->description,
                'logo' => $community->logo,
                '_additionalInfoRequired' => $community->_additionalInfoRequired ?? $community->isAdditionalInfoRequired(),
                'additional_fields' => $community->additional_fields,
                '_additionalInfoRequiredSubmit' => $community->getMemberAdditionalFieldsValues()
            ];
        }

        return $this->outputJSON(compact('communities'));
    }

    public function channels()
    {
        if (inDashboard()) {
            return $this->outputJSON('Must provide a communityId', 500);
        }

        $channels = ContentAccess::memberCommunityChannels(
            currentWorkspace(),
            null,
            false,
            $this->isCommunityOrGlobalAdmin(currentWorkspace())
        );

        return $this->outputJSON([
            'channels' => $channels
        ]);
    }

    public function shareableChannels()
    {
        if (inDashboard()) {
            return $this->outputJSON('Must provide a communityId', 500);
        }

        $channels = ContentAccess::memberCommunityChannels(
            currentWorkspace(),
            null,
            true,
            $this->isCommunityOrGlobalAdmin(currentWorkspace())
        );

        return $this->outputJSON([
            'channels' => $channels
        ]);
    }

    public function loadChannelsDropdown()
    {
        $channels = ContentAccess::memberCommunityChannels(
            currentWorkspace(),
            [Channel::THEME_TIMELINE, Channel::THEME_VIDEO],
            true,
            $this->isCommunityOrGlobalAdmin(currentWorkspace())
        );

        $channelsHtml = $this->load->view('content/shared/channel-dropdown', [
            'channels' => $channels,
        ], true);

        return $this->outputJSON([
            'channelsHTML'      => $channelsHtml,
            'channelsDebugData' => $channels,
        ]);
    }

    /**
     * @param \Squirrel\Models\Community|Dashboard $community
     * @return bool
     */
    private function isCommunityOrGlobalAdmin($community): bool
    {
        return $community->isMemberAdmin() || currentMember()->isAdmin();
    }
}
