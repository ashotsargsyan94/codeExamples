export default function addFriendsModalTemplate(selectedCommunity) {

    function getConnectionsSubHeaderText(selectedCommunity) {
        if (selectedCommunity.type !== 'root') {
            return translate('Invite people to {{ communityName }}', { communityName: selectedCommunity.name });
        }

        return translate('Invite people to join this Community');
    }

    return /* html */`
            <div id="addConnections" class="popup small-popup" data-popup="add-connections">
                <div class="tableDv">
                    <div class="tableCell">
                        <div class="flex-center">
                            <div class="_inner">
                                <div class="crosBtn"></div>
                                <div id="friendFinder" class="mainBlk mt-15">
                                    <h2 class="friend-finder-header">
                                        <a class="stepBack fi-arrow-left step"> </a>
                                        <span>Add Friends</span>
                                    </h2>
                                    <div class="txtGrp">
                                        <p>${getConnectionsSubHeaderText(selectedCommunity)}</p>
                                    </div>

                                    <div class="step mobile-step-2 mobile-only">
                                            <p class="mobile-only">${translate('We can help you connect with your friends that are already using Squirrel or help you invite friends from your contacts.')}</p>
                                        <div class="bTn text-center">
                                            <button type="button" id="requestContacts" class="webBtn squirrel-golden">${translate('Use My Contacts')}<i class="spinner hidden"></i></button>
                                        </div>
                    					<p>Or</p>
                                        <div class="bTn text-center">
                                            <button type="button" id="generateCode" class="generateInviteCode webBtn squirrel-golden">${ translate('Generate Code') }<i class="spinner hidden"></i></button>
                                        </div>
                                    </div>

                                    <div class="step step-1">
                                        <div class="bTn text-center">
                                            <button type="button" id="searchForFriends" class="webBtn squirrel-golden">${translate('Search')}<i class="spinner hidden"></i></button>
                                        </div>
                    					<p>Or</p>
                                        <div class="bTn text-center">
                                            <button type="button" id="inviteFriends" class="webBtn squirrel-golden">${translate('I want to Invite Friends')}<i class="spinner hidden"></i></button>
                                        </div>
                    					<p>Or</p>
                                        <div class="bTn text-center">
                                            <button type="button" id="applyInviteCode" class="webBtn squirrel-golden">${translate('A Friend Gave me a Code')}</button>
                                        </div>
                                    </div>
                                    <div id="invite-to-channels" class="hidden">
                                        <div class="mb-15 text-center"  id="invite-to-channels-text">${translate('In addition to inviting people to {{ communityName }}, select any channels you want to invite them to as well.', { communityName: community.name })}</div>
                                        <ul class="userLstng chnlLstng scrollbar"></ul>
                                        <div class="bTn text-center">
                                            <button type="button" class="mainAction webBtn squirrel-golden">${translate('Next')}</button>
                                        </div>
                                    </div>
                                    <div class="step inviteCodeContainer">
                                        <div class=" input-group mt-15">
                                            <p id="invite-to-channel-text"></p>
                                            <p class="desktop-only">${translate('Share this code through text, email or messenger. For your safety, this code will expire')}
                                               <select id="invite-code-expiration">
                                                   <option value="1">${translate('in 24 hours.')}</option>
                                                   <option value="7" selected>${translate('in 7 days.')}</option>
                                                   <option value="30">${translate('in 30 days.')}</option>
                                               </select>
                                            </p>
                                            <div>${html_entity_decode(translate("Send your friends to {{ url }} to download the app and tell them to use your code below when signing up.", { url: '<a href="https://www.isquirrel.com" target="_blank">www.isquirrel.com</a>' }))}</div>
                                            <div class="inviteLink">
                                                <input type="text" id="inviteLink" readonly class="form-control" placeholder="${translate('Invite Code')}" />
                                                <span class="input-group-addon allowCopy">${translate('Copy')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="step applyInviteCode">
                                        <div class="input-group mt-15">
                                            <p>${translate('If your friend/community gave you an invite code to connect with them, please enter is below to be connected!')}</p>
                                            <div class="inviteLink mb-15">
                                                <input type="text" id="inviteCodeToApply" class="form-control" placeholder="${translate('Enter Code Here')}" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off" />
                                            </div>
                                            <div class="bTn text-center">
                                                <button type="button" id="applyInviteCodeBtn" class="webBtn squirrel-golden">${translate('Continue')}</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="step searchForFriends">
                                        <div class="input-group mt-15 w-100">
                                            <div class="mb-15 text-center">${translate('If you have mutual friends, you can search for a friend to add here!')}</div>
                                            <form class="searchForFriendsForm">
                                                <input type="text" id="searchForFriendsQuery" class="form-control mb-15" placeholder="${translate("Type your friend's name")}" autocomplete="off" />
                                            </form>

                                            <ul id="searchResults" class="findLst flex scrollbar">
                                                <!-- Content injected here -->
                                            </ul>
                                        </div>
                                    </div>

                                    <div class="hr"></div>
                                    <div class="txtGrp">
                                        <p class="small-info">${translate("We take your privacy seriously. That's why we will never store your contacts on our server. We only use them to help you find and invite your friends faster.")}</p>
                                    </div>
                                </div>
                                <div id="friendsFound" class="mobile-only flex-list" style="display: none;">
                                    <h2 id="numFriendsFound"></h2>
                                    <p>${translate('Wow, your Squirrel family is ready to grow! Send a friend request to each friend by tapping on the icon next to their name.')}</p>
                                    <div class="tab-content">
                                        <ul id="friendFinderList" class="findLst flex scrollbar">
                                            <!-- Content injected here -->
                                        </ul>
                                    </div>
                                    <div class="bTn text-center">
                                        <button type="button" id="showInviteContacts" class="mainAction webBtn squirrel-golden">${translate('Next')}</button>
                                    </div>
                                </div>
                                <div id="inviteContacts" class="mobile-only flex-list" style="display: none;">
                                    <h2>${translate('Grow your Squirrel family')}</h2>
                                    <p>${translate('Send an SMS invite to each of your contacts by tapping on the icon next to their name.')}</p>
                                    <div class="tab-content">
                                        <div id="SMS_Invite" class="tab-pane fade active in relative">
                                            <ul id="smsInviteList" class="findLst contctLst flex scrollbar">
                                                <!-- Content injected here -->
                                            </ul>
                                        </div>
                                    </div>
                                    <div class="bTn text-center">
                                        <button type="button" id="addConnectionsDone" class="mainAction closePopup webBtn squirrel-golden">${translate('Done')}</button>
                                    </div>
                                </div>
                                <div id="noContacts" class="mobile-only" style="display: none;">
                                    <h2>${translate('Uh oh!')}</h2>
                                    <p>${translate("It looks like you don't have any contacts or you didn't give us permission to see them.")}</p>
                                    <div class="bTn text-center">
                                        <button type="button" class="mainAction closePopup webBtn squirrel-golden">${translate('Done')}</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
}
