import addFriendsModalTemplate from './add-friends-modal.js';

export default function membersTemplate(pageType) {
    const isCommunityPage = pageType === 'community';
    const hiddenInCommunityPage = isCommunityPage ? ' hidden ' : '';
    const hiddenIfCanNotInvite = canInviteMembers() ? '' : 'hidden';

    function getConnectionsSubHeaderText() {
        if (community.type !== 'root') {
            return translate('Invite friends to {{ communityName }}', { communityName: community.name });
        }

        return translate('Squirrel is better with friends.');
    }

	return /* template */ `
        <section id="membersContainer">
            <div id="main_content" class="contain">
                <div class="topHead noBg">
                    <h1></h1>
                    <li class="enableGenerateLink plusMini popBtn ${ hiddenIfCanNotInvite }" data-popup="add-connections">
                        <img src="${urlFrom("/assets/images/site_icon/icon-friend.svg")}">
                    </li>

                    <ul class="viewLst">
                        <li class="active"><button type="button"><img src="${urlFrom("assets/images/site_icon/icon-grid.svg")}" alt=""></button></li>
                        <li><button type="button"><img src="${urlFrom("assets/images/site_icon/icon-list.svg")}" alt=""></button></li>
                    </ul>

                    <ul class="nav nav-tabs ${ hiddenInCommunityPage } connectionsTabs">
                        <li><a data-toggle="tab" href="#Current">${translate('Current')}</a></li>
                        <li><a data-toggle="tab" href="#Requests">${translate('Requests')}<span class="miniLbl" style="display: none"></span></a></li>
                    </ul>
                </div>

                <div class="tab-content">
                    <div id="Current" class="tab-pane fade active in">
                        <div class="header">
                            <h5>
                                ${ isCommunityPage ? translate('Community Members') : translate('My Friends') }
                                <small class='members-count'>...</small>
                                ${ isCommunityPage && community.config.visibility.members != 'community'
                                    ? /* template */`
                                        <i id="community-members-hidden"
                                            class="fa fa-info-circle"
                                            aria-hidden="true"
                                            tabindex="0">
                                        </i>`
                                    : '' }
                            </h5>
                            <div class="leaveCommunity ${isCommunityPage ? '' : 'hidden'}">
                                <p>${translate('Leave Community')}</p>
                                <span class="cross"></span>
                            </div>
                        </div>
                        <ul id="membersList" class="connList imgLst flex">
                            <!-- connections -->
                        </ul>
                    </div>
                    <div id="Requests" class="tab-pane fade in ${ hiddenInCommunityPage }">
                        <h5>${translate('Friend Requests')} <small id="connectionRequestsQty">0</small><a href="javascript:void(0)" class="showBtn hidden">${translate('Show all')}</a></h5>
                        <ul id="connectionRequestsList" class="connList imgLst flex">
                            <!-- requests -->
                        </ul>
                        <h5>${translate('Sent Requests')}<small id="connectionRequestsSentQty">0</small><a href="javascript:void(0)" class="showBtn hidden">${translate('Show all')}</a></h5>
                        <ul id="connectionRequestsSentList" class="connList imgLst flex">
                            <!-- requests sent -->
                        </ul>
                    </div>
                </div>

                <div class="appLoad" id="cmntLoader">
                    <div class="appLoader">
                        <span class="spiner"></span>
                    </div>
                </div>
            </div>

            <div id="profile_content" class="tab-content hidden"></div>
            ${ addFriendsModalTemplate(community) }
        </section>
    `;
}

function canInviteMembers() {
    const whoCanInvite = community.config.can.invite;

    return whoCanInvite === 'everybody'
        || whoCanInvite === 'admins' && member.isCommunityAdmin;
}
