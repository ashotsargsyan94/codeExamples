function loadMembersList(reset = false) {
    if (reset) {
        nextOffset = 0;
        bottomReached = false;
    }

    ajaxSearch = true;
    $('#cmntLoader').fadeIn();

    if (! nextOffset) {
        $("#membersList").empty();
    }

    if (typeof loadMembersList.loadData !== 'undefined') {
        loadMembersList.loadData()
            .then(response => {
                $('.members-count').html(response.totalCount);
                $("#membersList").append(connectionsHtml(response.members));

                ajaxSearch = false;
                nextOffset = response.nextOffset;
                bottomReached = response.members.length === 0;

                bottomReached
                    ? $('#cmntLoader').fadeOut()
                    : $(window).scroll();
            })
            .fail(console.log)
            .catch(() => ajaxSearch = false);
    }
}

function loadFriendsSentRequests() {
    return $.post(urlFrom('friends/requestsSent'))
        .always(() => {
            $('#cmntLoader').hide();
        }).then(response => {
            $('#connectionRequestsSentQty').html(response.requestees.length);
            $('#connectionRequestsSentList, #sidebar-friend-requests-sent').html(connectionRequestsSentHtml(response.requestees));
        }).fail(console.log);
}

function loadFriendsReceivedRequests() {
    return $.post(urlFrom('friends/requestsReceived'))
            .always(() => {
                $('#cmntLoader').hide();
            }).then(response => {
                $('#connectionRequestsQty').html(response.requesters.length);
                $('#connectionRequestsList, #sidebar-friend-requests-received').html(connectionRequestsReceivedHtml(response.requesters));
                toggleBubbles('#sidebar li.list-connections, .nav-tabs [href="#Requests"]', response.requesters.length); // Connections
            }).fail(console.log);
}

function connectionsHtml(members) {
    let html = '';

    if (members.length > 0) {
        $.each(members, function(i, member) {
            const avatar = member.avatar || get_avatar_url();
            const fullname = stringMaxLength(member.first_name + ' ' + member.last_name, 20);

            html += /* template */`
                <li class="connections-card" id="conn_current_${member.id}" title="${member.first_name + ' ' + member.last_name}">
                    <div class="inner">
                        <div class="ico">
                            <a href="#profile/${member.id}" class="popBtnConnection" data-member="${member.id}">
                                <img src="${avatar}" alt="">
                            </a>
                        </div>
                        <div class="txt">
                            <h4><a href="#profile/${member.id}" class="popBtnConnection">${fullname}</a></h4>
                            <p>${member.bio || ""}</p>
                        </div>
                    </div>
                </li>`;
        });
    } else if ($('#membersList .connections-card').length === 0) {
        html = /* template */`<li class="w-100">${translate('No connections')}</li>`;
    }

    return html;
}

function connectionRequestsReceivedHtml(members) {
    if (! members.length) {
        return `<li>${translate('No received requests')}</li>`;
    }

    let html = '';

    $.each(members, function(i, member) {
        const avatar = member.avatar || get_avatar_url();
        const fullname = stringMaxLength(member.first_name + ' ' + member.last_name, 20);

        html += /* template */`
            <li id="conn_req_${member.id}" title="${member.first_name + ' ' + member.last_name}">
                <div class="inner">
                    <div class="ico">
                        <a href="#profile/${member.id}" data-member="${member.id}">
                            <img src="${avatar}" alt="">
                        </a>
                    </div>
                    <div class="txt">
                        <h4>
                            <a href="#profile/${member.id}" data-member="${member.id}">
                                ${fullname}
                            </a>
                        </h4>
                        <p class="member-bio">${member.bio || '&nbsp;'}</p>
                    </div>
                    <div class="bTn" id="msg_${member.id}">
                        <button type="button" data-member="${member.id}" class="webBtn smBtn smplBtn btnAccept">${translate('Accept')}</button>
                        <button type="button" data-member="${member.id}" class="webBtn smBtn smplBtn btnIgnore">${translate('Ignore')}</button>
                    </div>
                </div>
            </li>`;
    });

    return html;
}

function connectionRequestsSentHtml(members) {
    if (! members.length) {
        return `<li>${translate('No sent requests')}</li>`;
    }

    let html = '';

    $.each(members, function(i, member) {
        const avatar = member.avatar || get_avatar_url();
        const fullname = stringMaxLength(member.first_name + ' ' + member.last_name, 20);

        html += /* template */`
            <li id="conn_sent_${member.id}" title="${member.first_name + ' ' + member.last_name}">
                <div class="inner">
                    <div class="ico">
                        <a href="#profile/${member.id}" data-member="${member.id}">
                            <img src="${avatar}" alt="">
                        </a>
                    </div>
                    <div class="txt">
                        <h4>
                            <a href="#profile/${member.id}" data-member="${member.id}">
                                ${fullname}
                            </a>
                        </h4>
                        <p class="member-bio">${member.bio || '&nbsp;'}</p>
                    </div>
                    <div class="bTn" id="msg_${member.id}">
                        <button type="button" data-member="${member.id}" class="webBtn smBtn smplBtn btnCancel">${translate('Cancel')}</button>
                    </div>
                </div>
            </li>`;
    });

    return html;
}

function stringMaxLength(str, max_chars) {
    if (str.length <= max_chars) {
        return str;
    }

    return str.substring(0, max_chars - 3) + '...';
}

$(function() {
    var selectedCommunityId = null;
    var avaiableChannelsPerCommunity = {};
    var selectedInviteChannels = [];

    function getSelectedCommunityId() {
        return selectedCommunityId;
    }

    function setSelectedCommunityId(communityId) {
        if (communityId === selectedCommunityId) {
            return;
        }

        clearInviteToChannelsSection();

        selectedCommunityId = communityId;
    }

    function isRootCommunity(communityToCheck) {
        if (typeof communityToCheck !== 'undefined' && communityToCheck !== null) {
            return member.communities[communityToCheck].type === 'root';
        } else {
            return community.type === 'root';
        }
    }

    $(document).on("click", "#membersContainer .viewLst > li:nth-child(1) > button", function() {
        $("#membersContainer").removeClass("listView");
        $("#membersContainer .viewLst > li").removeClass("active");

        $(this).parent().addClass("active");
    });

    $(document).on("click", "#membersContainer .viewLst > li:nth-child(2) > button", function() {
        $("#membersContainer").addClass("listView");
        $("#membersContainer .viewLst > li").removeClass("active");

        $(this).parent().addClass("active");
    });

    $(document).on("click", "#membersContainer .manualBtn", function() {
        $(this).parents(".mainBlk").hide();

        $(".contactsBlk").hide();
        $(".manualBlk").show();
    });

    $(document).on("click", "#membersContainer .contactsBtn", function() {
        $(this).parents(".mainBlk").hide();

        $(".manualBlk").hide();
        $(".contactsBlk").show();
    });

    $(document).on("click", "#membersContainer h2 > a", function() {
        $(".manualBlk").hide();
        $(".contactsBlk").hide();
        $(".mainBlk").show();
    });

    $(document).on('click', '.allowCopy', function() {
        $('#inviteLink').focus();
        $('#inviteLink').select();

        document.execCommand('copy');
    });

    $(document).on('change', '#invite-code-expiration', function (e) {
        let communityId = $('#addConnections').data('community');
        initInviteContactsStep2(communityId);
    });

    function initInviteContactsStep1(addToCommunity) {

        if (!isRootCommunity(addToCommunity)) {
            $('#searchForFriends').remove();
        }

        $("#friendFinder .step-1").show();
        $('#friendFinder #inviteFriends').removeClass('mobileInviteFriends');
        $('#friendFinder #inviteFriends').removeClass('generateInviteCode');
        $('#friendFinder #inviteFriends').css('pointer-events', 'initial');

        if (!!localStorage.getItem('isNativeApp')) {
            $('#addConnections h2').addClass('mobile');
            $('.desktop-only').remove();
            $('#friendFinder #inviteFriends').addClass('mobileInviteFriends');
        } else {
            $('#addConnections h2').removeClass('mobile');
            $('.mobile-only').remove();
            $('#friendFinder #inviteFriends').addClass('generateInviteCode');
        }
    }

    const addNewListItem = function(container, text, value, avatarUrl = null) {

        const originListItem = $('#share-modal li.origin');
        let newItem = originListItem.clone();
        newItem.removeClass('hidden origin');
        newItem.find('.item-label') .text(text);

        const checkBox = newItem.find('input');
        checkBox.prop('disabled', false).val(value);

        if (avatarUrl) {
            newItem.find('img')
                .attr('src', urlFrom(`assets/images/site_icon/${avatarUrl}`))
        }

        // Native event handles check on checkbox
        // but stop the event from bubbling to the list item event below
        newItem.find('input[type="checkbox"]').on('click', (e) => {
            e && e.stopPropagation();
        });

        newItem.on('click', (e) => {
            checkBox[0].checked = !checkBox[0].checked;
        });

        container.find('ul').append(newItem);
    };

    function getAvailableChannels(communityId) {
        return new Promise((resolve) => {
            $.post(urlFrom('community/channels'), {communityId}).then(response => {
                let availableChannels =  response.channels.filter(ch => {
                    const channelIsInviteOnly = !! ch.creator_id && ['Core', 'Channel'].includes(ch.type);
                    const memberIsChannelAdmin = ch.role === 'admin';

                    return channelIsInviteOnly && memberIsChannelAdmin;
                });

                avaiableChannelsPerCommunity[communityId] = availableChannels;

                resolve(availableChannels);
            });
        });
    }

    function clearInviteToChannelsSection() {
        let inviteToChannelsSelector = $('#invite-to-channels');
        inviteToChannelsSelector.find('ul li').remove();
        inviteToChannelsSelector.addClass('hidden');

        selectedInviteChannels = [];
    }

    function initInviteToChannelsStep(communityId) {
        let inviteToChannelsSelector = $('#invite-to-channels');
        let inviteToChannelsText = $('#invite-to-channels-text');

        let channelsAlreadyLoaded = avaiableChannelsPerCommunity[communityId].length && inviteToChannelsSelector.find('ul li').length;

        inviteToChannelsText.html(translate('In addition to inviting people to {{ communityName }}, select any channels you want to invite them to as well.', { communityName: member.communities[communityId].name }))

        if (channelsAlreadyLoaded) {
            return;
        }

        inviteToChannelsSelector.find('ul li').remove();
        inviteToChannelsSelector.removeClass('hidden');

        let availableChannels = communityId !== 1 ? avaiableChannelsPerCommunity[communityId] : [];

        for (const channel of availableChannels) {
            let channelName = channel.name;
            if (channel.group_name) {
                channelName = channel.group_name + ' > ' + channelName;
            }

            addNewListItem(inviteToChannelsSelector, channelName, channel.id, channel.icon);
        }
    }

    function getInviteToChannelText() {
        if (! selectedInviteChannels.length) {
            return '';
        }

        let str = selectedInviteChannels.length > 1 ? "Include channels: " : "Include channel: ";

        for(let i = 0; i < selectedInviteChannels.length; i++){
            str += selectedInviteChannels[i].name;

            if (i + 2 < selectedInviteChannels.length) {
                str += ', ';
            } else if (i + 1 < selectedInviteChannels.length) {
                str += ' & ';
            }
        }

        return str;
    }

    function initInviteContactsStep2(addToCommunity) {
        let channelIds = [];
        if (! isRootCommunity(addToCommunity)) {
            if (selectedInviteChannels.length > 0) {
                channelIds = selectedInviteChannels.map((ch) => ch.id);
                $('#invite-to-channel-text').html(getInviteToChannelText()).removeClass('hidden');
            } else {
                $('#invite-to-channel-text').html('').addClass('hidden');
            }
        }

        let formData = {
            channelIds,
            expirationDays: $('#invite-code-expiration').val()
        };

        if (addToCommunity) {
            formData.communityId = parseInt(addToCommunity);
        }

        $.post(urlFrom('invite/generateInvitationCode'), formData).then(response => {
            $("#inviteLink").val(response.inviteCode);
            $("#friendFinder div.step").hide();
            $("#friendFinder div.inviteCodeContainer").show();

            let $backButton = $("#friendFinder .stepBack");

            if (!!localStorage.getItem('isNativeApp') && isRootCommunity()) {
                $backButton.removeClass('backToStep1').addClass('mobileInviteFriends').show();
            } else {
                $backButton.removeClass('mobileInviteFriends').addClass('backToStep1').show();
            }

            if (avaiableChannelsPerCommunity[addToCommunity] && avaiableChannelsPerCommunity[addToCommunity].length) {
                $backButton.removeClass('hidden');
            }

            $('#friendFinder .stepBack').css('pointer-events', 'initial');

        }).fail(console.log);
    }

    $(document).on('click', '.enableGenerateLink, .backToStep1', async function() {
        $('#requestContacts .spinner').addClass('hidden');
        $("#friendFinder .step").hide();

        let addToCommunity;

        if (window.location.href.indexOf('friends') > -1) {
            addToCommunity = 1;
            $('#addConnections').data('community', addToCommunity);
        } else if ($(this).hasClass('enableGenerateLink')) {
            if (typeof $(this).parents('h5').eq(0).data('community') !== 'undefined') {
                addToCommunity = parseInt($(this).parents('h5').eq(0).data('community'));
            } else {
                addToCommunity = community.id;
            }

            $('#addConnections').data('community', addToCommunity)
        } else {
            addToCommunity = parseInt($('#addConnections').data('community'));
        }

        setSelectedCommunityId(addToCommunity);

        if (isRootCommunity(addToCommunity)) {
            initInviteContactsStep1(addToCommunity);
            return;
        }

        //if it's community and there are channels, go to the channels step.
        let availableChannels = await getAvailableChannels(addToCommunity);

        if (availableChannels.length > 0) {
            initInviteToChannelsStep(addToCommunity);
            return;
        }

        //if it's a community, and they have no available channels,
        //then we don't need a back button
        $("#friendFinder .stepBack").addClass('hidden');

        initInviteContactsStep2(addToCommunity);
    });

    $(document).on('click', '#friendFinder .generateInviteCode', function (e) {
        e.preventDefault();
        $(this).css('pointer-events', 'none');
        let addToCommunity = getSelectedCommunityId();
        initInviteContactsStep2(addToCommunity);
    });

    $(document).on('click', '#invite-to-channels button', function (e) {
        e.preventDefault();
        let communityId = parseInt($('#addConnections').data('community'));
        //store the selected channels
        selectedInviteChannels = $("#invite-to-channels input[type=checkbox]:checked").map(function() {
            return avaiableChannelsPerCommunity[communityId].find(ch => ch.id === this.value);
        }).get();

        //hide the invite to channels section
        $('#invite-to-channels input[type="checkbox"]').unbind('click');
        $('#invite-to-channels').addClass('hidden');
        $('#invite-to-channels').find('ul li').remove();
        initInviteContactsStep2(communityId);
    });

    $(document).on('click', '#friendFinder .mobileInviteFriends', function (e) {
        e.preventDefault();
        $("#inviteLinkToApply").val('');
        $("#friendFinder div.step").hide();
        $("#friendFinder div.mobile-step-2").show();
        $("#friendFinder .stepBack").removeClass('mobileInviteFriends').addClass('backToStep1').show();
        $('#friendFinder #generateCode').css('pointer-events', 'initial');
    });

    $(document).on('click', '#friendFinder #applyInviteCode', function (e) {
        e.preventDefault();
        $("#inviteLinkToApply").val('');
        $("#friendFinder div.step").hide();
        $("#friendFinder div.applyInviteCode").show();
        $("#friendFinder .stepBack").removeClass('mobileInviteFriends').addClass('backToStep1').show();
    });

    $(document).on('click', '#friendFinder #applyInviteCodeBtn', function (e) {
        e.preventDefault();

        if (code = $('#friendFinder #inviteCodeToApply').val()) {
            $.post(urlFrom('invite/applyInvitationCode'), {code: code}).then(response => {
                ajaxSearch = false;
                nextOffset = 0

                loadMembersList();

                $("#inviteCodeToApply").val('');

                $.confirm({
                    title: translate('Invitation code applied!'),
                    content: translate('Would you like to apply another one?'),
                    buttons: {
                        ok: {
                            text: translate('Yes'),
                        },
                        close: {
                            text: translate('No'),
                            action: () => {
                                $('#addConnections').fadeOut();
                                $('body').removeClass('flow');
                            }
                        }
                    }
                });
            }).fail(response => {
                if (response.responseJSON.error === 'banned_from_community') {
                    return alert('', translate("You have been banned from this community by your Community Admin. If you believe this is incorrect, please contact your Community Admin."));
                }
                alert(translate('Invalid Code'), translate('This invitation code is either invalid or has expired.'));
                console.log(response);
            });
        } else {
            alert(translate('Invalid Code'), translate('Please provide a valid invitation code.'));
        }
    });

    $(document).on('click', '#friendFinder #searchForFriends', function (e) {
        e.preventDefault();

        $("#searchForFriendsQuery").val('');
        $("#friendFinder div.step").hide();
        $("#friendFinder div.searchForFriends").show();
        $("#friendFinder .stepBack").removeClass('mobileInviteFriends').addClass('backToStep1').show();
        initSearchForFriendsInput();
    });

    function initSearchForFriendsInput() {
        clearSearchResults();

        $('#searchForFriendsQuery').off('input').on('input', function() {
            let query = $('#searchForFriendsQuery').val();
            search(query);
        });

        setTimeout(() => {
            $("#searchForFriendsQuery").focus();
        }, 100);
    }

    function search(query) {
        if (query.trim().length < 2) {
            clearSearchResults();
            return;
        }

        request(urlFrom('common/searchSecondDegreeConnections'), { query }).then(response => {
            let inputValue = $("#searchForFriendsQuery").val();
            // TODO : avoid spamming the server and make sure to always keep ONLY the last request active
            //        i.e. timeout to wait for user to stop timing + clearTimeout and xhr.abort() of previous requests
            if (inputValue.indexOf(query) === -1) {
                //this response is no longer what the user currently has typed
                return;
            }

            //todo ISQ-1510 edge case of older query results coming in after newer results.
            clearSearchResults();

            if (response.matches.length === 0){
                $(`<li class="text-center"> ${translate('No friends of friends found, try entering some different names.')}</li>`).appendTo("#searchResults");
            }

            for (mem of response.matches) {
                const $row = $(getSearchRowTemplate(mem)).appendTo('#searchResults');

                $row.find('button').click((event) => {
                    let button = $(event.currentTarget);
                    event.preventDefault();
                    event.stopPropagation();

                    let item = button.closest('li');
                    let memberId = item.data('member-id');
                    // Don't allow any more taps on this button
                    button.attr('disabled', true);

                    return $.post(urlFrom(`friends/sendRequest/${ memberId }`)).then(() => {
                        button.remove();
                        item.find('.connectionContainer').append(getConnectionRequestedTemplate());
                        //refresh the requests sent so they're already loaded with the new data when the popup is closed.
                        loadFriendsSentRequests();
                    }).catch((error) => {
                        webView.emit('alert', translate('Oops! We were unable to send your friend request.'));
                        button.attr('disabled', false);
                        console.error(error);
                    });
                });
            }
        }).catch(showGenericError);
    }

    function getSearchRowTemplate(mem) {
        return `<li data-member-id="${ mem.id }" id="mem-${mem.id}">
            <div class="inr">
                <div class="ico prfBtn cursor-pointer" data-member-id="${ mem.id }">
                    <img src="${ mem.img }">
                </div>
                <span class="prfBtn cursor-pointer" data-member-id="${ mem.id }">
                    <div>${ mem.label }</div>
                    <div class="bio">${mem.bio}</div>
                </span>
                <span class="connectionContainer">
                    ${!mem.connectionStatus ? getConnectionButtonTemplate() : getConnectionRequestedTemplate()}
                </span>
            </div>
        </li>`;
    }

    function getConnectionButtonTemplate() {
        return '<button class="plusBtn"></button>';
    }

    function getConnectionRequestedTemplate() {
        return `<div class="invite-sent">${translate("Friend request sent!")}</div>`;
    }

    function clearSearchResults() {
        $('#searchResults').html('');
    }

    $(document).on("click", ".btnCloseProfile", function(e) {
        window.goBack();
    });

    $(document).on("click", ".btnOpenProfile", function(e) {
        const id = $(this).data("member");

        $.post(urlFrom('profile/regularProfile'), { id }).then(response => {
            $("#main_content").hide();
            $("#profile_content").html(response.result).removeClass("hidden");
        }).fail(console.log);
    });

    $(document).on("click", ".btnAccept", function(e) {
        e.preventDefault();

        $(this).attr('disabled', true);

        const memberId = $(this).data("member");

        $.post(urlFrom(`friends/acceptRequest/${ memberId }`)).then(() => {
            showMessage(translate("The connection request has been accepted"));

            $("#connectionRequestsQty").html((_, count) => count > 0 ? count - 1 : 0);

            loadMembersList(true);

            $("#conn_req_" + memberId).remove();

            if (! $('connectionRequestsList li').length) {
                $('connectionRequestsList').html(`<li>${translate('No requests')}</li>`);
            }

            updateBubbles(true);
        }).fail(showNetworkError);
    });

    $(document).on("click", ".btnIgnore", function(e) {
        e.preventDefault();

        $(this).attr('disabled', true);

        const memberId = $(this).data("member");

        $.post(urlFrom(`friends/ignoreRequest/${ memberId }`)).then(() => {
            showMessage(translate("The connection request has been removed"));

            $("#connectionRequestsQty").html((_, count) => count > 0 ? count - 1 : 0);
            $("#conn_req_" + memberId).remove();

            if (! $('#connectionRequestsList li').length) {
                $('#connectionRequestsList').html(`<li>${translate('No requests')}</li>`);
            }

            updateBubbles(true);
        }).fail(showNetworkError);
    });

    $(document).on("click", ".btnCancel", function(e) {
        e.preventDefault();

        $(this).attr('disabled', true);

        const memberId = $(this).data("member");

        $.post(urlFrom(`friends/cancelRequest/${ memberId }`)).then(() => {
            showMessage(translate("Your connection request has been canceled"));

            $("#conn_sent_" + memberId).remove();
            $("#connectionRequestsSentQty").html((_, count) => count > 0 ? count - 1 : 0);

            if (! $('#connectionRequestsSentList li').length) {
                $('#connectionRequestsSentList').html(`<li>${translate('No requests')}</li>`);
            }

        }).fail(showNetworkError);
    });

    $(document).on("keyup", "#searchTxt", function(event) {
        const searchText = $(this).val();
        if (event.keyCode === 13){
            event.preventDefault();
        }

        $("ul.connList > li").each(function() {
            const text = $(this).text().toLowerCase();

            $(this).toggle(text.includes(searchText));
        });
    });

    $(document).on("click", ".popUnfriend", function(e) {
        e.preventDefault();
        let popUp = $(this).data("popup");
        $("body").addClass("flow");
        $(".popup[data-popup= " + popUp + "]").fadeIn();
    });

    $(document).on("click", ".btnUnfriendCancel", function(e) {
        $("body").removeClass("flow");
        $(".popup[data-popup= connection-unfriend]").fadeOut();
    });

    $(document).on("click", ".btnUnfriend", function(e) {
        e.preventDefault();

        const memberId = $(this).data("member");

        $.post(urlFrom(`friends/unfriend/${ memberId }`)).always(() => {
            location.replace(urlFrom('#connections'));
        }).fail(showNetworkError);
    });

    $(document).on("click", ".requestConnection", function(e) {
        e.preventDefault();

        const memberId = $(this).data("member");

        $.post(urlFrom(`friends/sendRequest/${ memberId }`)).always(() => {
            location.replace(urlFrom('1#friends/2'));
        }).fail(showNetworkError);
    });

    $(window).scroll(function() {
        if (ajaxSearch || bottomReached || ! $("#membersList").length) {
            return;
        }

        const scrolled = $(window).scrollTop() + $(window).height();
        const triggerScroll = $(document).height() - 300;

        if (scrolled > triggerScroll) {
            loadMembersList();
        }
    });
});
