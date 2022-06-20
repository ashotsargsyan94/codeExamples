export default function communitiesPopupTemplate(communities) {
    let communitiesList = '';

    communities.forEach(community => {
        const requestedToJoin = community.memberStatus === 'request';

        let communityBtn = community.type === 'public'
            ? `<i class="fi-plus"></i>` + translate('Join')
            : (requestedToJoin ? translate('Request Sent!') : `<i class="fi-plus"></i>` + translate('Request'));

        let communityBtnClass = community.type === 'public' ? 'join' : (requestedToJoin ? '' : 'request');

        communitiesList += /* template */`
            <li class="community-list">
                <div class="ico"><img src="${ community.logo }" alt=""></div>
                <strong>
                    ${ community.short_name }
                    <br>
                    <div class="ellipsis description">${ community.description }</div>
                </strong>
                <div class="bTn">
                    <a data-community-id="${community.id}" class="${ communityBtnClass } webBtn smBtn smplBtn" ${ requestedToJoin ? 'disabled' : ''}>
                     ${ communityBtn }
                    </a>
                </div>
            </li>`;
    });

    return /* template */`
        <div class="tableDv">
        <div class="tableCell">
            <div class="contain">
                <div class="_inner join-communities">
                    <h2><a class="stepBack fi-arrow-left step hidden" /> </h2>
                    <div class="crosBtn"></div>
                    <h2>${translate('Join a Community!')}</h2>
                    <div class="step step-1">
                        <div class="bTn text-center">
                            <button type="button" class="webBtn squirrel-golden movetoInviteSection">${translate('A Friend Gave me a Code')}</button>
                        </div>
                        <p>${translate('Or')}</p>
                        <form id="searchCommunitiesForm" action="" method="post">
                            <div class="srch">
                                <input type="text" name="" id="searchRecentCommunities" class="txtBox" placeholder="${translate('Search')}">
                            </div>
                            <h6 class="${ communitiesList ? '' : 'hidden'}">${translate('Recently Added')}</h6>
                            <h6 class="add-info">${translate('If you would like to add your community, please contact us')} <a href="mailto: community@isquirrel.com" target="_blank">community@isquirrel.com</a></h6>
                            <ul class="grpChnlLst scrollbar">
                                ${communitiesList}
                                <li class="grpChnlLst__notFound hidden">
                                    ${translate('No community appears with that name, or the community you are searching for may be private.')}
                                </li>
                            </ul>
                        </form>
                    </div>
                    <div class="step applyInviteCode hidden">
                        <div class="input-group mt-15">
                            <p>${translate('If your friend/community gave you an invite code to connect with them, please enter it below to be connected!')}</p>
                            <div class="inviteLink mb-15">
                                <input type="text" id="inviteCodeCommunity" class="form-control" placeholder="${translate('Enter Code Here')}" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off" />
                            </div>
                            <div class="bTn text-center">
                                <button type="button" id="applyInviteCodeCommunity" class="webBtn squirrel-golden">${translate('Continue')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
}
