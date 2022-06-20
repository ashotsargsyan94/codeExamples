export default function channelSettingsTemplate(settings) {
    settings = {
        id: null,
        name: null,
        creator_id: null,
        ...settings,
    }

    return /* template */`
        <div class="tableDv">
            <div class="tableCell">
                <div class="contain">
                    <div class="_inner">
                        <div class="close-channel-settings crosBtn"></div>

                        ${ settings.id ? '' : '<h2>'+ translate('Create a New Channel') +'</h2>' }

                        <form autocomplete="off" id="frmChSetting" onsubmit="return false">
                            <input type="hidden" name="channel_id" value="${settings.id || ''}" />
                            <input type="hidden" name="masked">

                            <div id="channelNotificationSettings">
                                <p class="h4 lite text-center">
                                    ${translate('Push Notification Settings')}
                                </p>

                                <ul class="icoLst flex">
                                    <li>
                                        <div class="inner">
                                            <div class="icon"><img src="${urlFrom('assets/images/site_icon/icon-post.svg')}" alt=""></div>
                                            <h5>${translate('New posts')}</h5>
                                            <div class="switchBtn">
                                                <input type="checkbox" name="notifications_post">
                                                <em></em>
                                            </div>
                                        </div>
                                    </li>
                                    <li>
                                        <div class="inner">
                                            <div class="icon"><img src="${urlFrom('assets/images/site_icon/icon-replies.svg')}" alt=""></div>
                                            <h5>${translate('Replies')}</h5>
                                            <div class="switchBtn">
                                                <input type="checkbox" name="notifications_reply">
                                                <em></em>
                                            </div>
                                        </div>
                                    </li>
                                    <li>
                                        <div class="inner">
                                            <div class="icon"><img src="${urlFrom('assets/images/site_icon/icon-at.svg')}" alt=""></div>
                                            <h5>${translate('Mentions')}</h5>
                                            <div class="switchBtn">
                                                <input type="checkbox" name="notifications_mention">
                                                <em></em>
                                            </div>
                                        </div>
                                    </li>
                                </ul>

                                <ul class="icoLst flex">
                                    <li class="channel-muted w-100">
                                        <div class="inner">
                                            <p class="h4 lite">${translate('Mute Channel')}</p>
                                            <div class="switchBtn">
                                                <input type="checkbox" name="channel_muted">
                                                <em></em>
                                            </div>
                                        </div>
                                    </li>
                                </ul>
                            </div>

                            <div class="formRow row addMembersToChannel">
                                <div class="col-lg-12 col-md-12 col-sm-12 col-xs-12 col-xx-12 txtGrp">
                                    <input type="text" name="channelName" class="txtBox" placeholder="${translate('Channel Name')}" value="${html_entity_encode(settings.name) || ''}">
                                </div>

                                ${ settings.id ? '' : /* template */`
                                    <div class="col-lg-12 col-md-12 col-sm-12 col-xs-12 col-xx-12 txtGrp">
                                        <div class="channelCommunityDropdownContainer"></div>
                                    </div>
                                    <div class="col-lg-12 col-md-12 col-sm-12 col-xs-12 col-xx-12 txtGrp">
                                        <h4>${ translate('Channel Style') }</h4>
                                        <select name="channelTheme" class="txtBox">
                                            <option value="timeline">Timeline</option>
                                            <option value="chat">Chat</option>
                                            <option value="video">Video</option>
                                        </select>
                                    </div>`
                                }

                                <div class="col-lg-12 col-md-12 col-sm-12 col-xs-12 col-xx-12 txtGrp">
                                    <input type="text" class="txtBox autocomplete" placeholder="${translate('Add people to this channel')}" data-search="searchUsers">
                                </div>
                                <div class="col-lg-12 col-md-12 col-sm-12 col-xs-12 col-xx-12 txtGrp">
                                    <div class="invtPpl autocomplete-target"><p>${translate('No user selected')}</p></div>
                                </div>
                            </div>

                            <div class="bTn text-center">
                                <button type="submit" class="webBtn saveChSettingsBtn">${ settings.id ? translate('Save') : translate('Create') } <i class="spinner hidden"></i></button>
                            </div>

                            ${ settings.id && settings.type == 'Channel' ? /*template */`
                                <div class="leaveChannelWrapper">
                                    <a id="leaveChannel" href="javascript:void(0)">${translate('Leave Channel')}</a>
                                </div>` : '' }

                            <div class="alertMsg error mt-15 pt-15 pb-15" style="display:none"></div>
                        </form>
                    </div>
                </div>
            </div>
        </div>`;
}
