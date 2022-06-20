/**
 * Update all alert bubbles (stream, channels, directs, connections, communities).
 *
 * - updates every 1 second tops, and only if there are queued 'mustUpdate calls'
 * - updates every 1 minute at least, even if there are no 'mustUpdate calls'
 *
 * @param {bool} mustUpdate  False for periodic checks, True for event-driven calls.
 */
function updateBubbles(mustUpdate = false) {
    const periodicUpdateQueued = ! throttled('bubbles.update.periodic', 60000);

    updateBubbles.queuedUpdate |= mustUpdate || periodicUpdateQueued;

    if (! updateBubbles.queuedUpdate || updateBubbles.processing || throttled('bubbles', 3000)) {
        return;
    }

    updateBubbles.processing   = true;
    updateBubbles.queuedUpdate = false;

    $.post(urlFrom('sidebar/alerts')).then(({ alerts, siteVersion }) => {
        applyBubbles(alerts);

        /**
         * Check site version for upgrades (e.g. deploys), reload if it changed
         */
        if (siteVersion != app.constants.SITE_VERSION) {
            $(window).one('hashchange', () => location.reload(true));
        }
    }).always(() => updateBubbles.processing = false);

    app.debug && console.trace && console.trace('updateBubbles', mustUpdate);
}

function applyBubbles(alerts) {
    let lastUpdateDate = 0;

    const communityAlerts = alerts.communities[community.id] || false;
    const dashboardAlerts = alerts.dashboard;

    mainData.alerts = alerts;

    $.each(alerts.communities, (communityId, hasAlerts) => {
        toggleCommunityBubbles(`#sidebar [data-community-id=${ communityId }]`, hasAlerts);
    });

    $.each(alerts.channels, (channelId, { type, alerts: channelAlerts }) => {
        toggleBubbles(`[data-channel=${ channelId }]`, channelAlerts.count);                        // Channel / Direct

        const $group = $(`[data-channel=${ channelId }]`).parents('.channel-group');

        if ($group.length > 0
            && channelAlerts.last_update_date > lastUpdateDate) {
                lastUpdateDate = channelAlerts.last_update_date;

                $group.attr('data-updated', lastUpdateDate);
        }

        $(`[data-channel=${ channelId }]`).attr('data-updated', channelAlerts.last_update_date);
    });

    toggleBubbles('#sidebar .sidebar-activity', alerts.activity);
    toggleBubbles('#activity-bell', alerts.communitiesActivity);                                   // Activity
    toggleBubbles('#sidebar li.list-connections, .nav-tabs [href="#Requests"]', alerts.connections);// Connections
    toggleBubbles('[href="#eventSect"]', alerts.events);                                            // Events
    toggleBubbles('[href="#birthdaySect"]', alerts.birthdays);                                      // Birthdays
    toggleBubbles('#nav [data-nav-tab=events]', (alerts.dashboard.events + alerts.dashboard.birthdays));
    toggleBubbles('#nav [data-nav-tab=directs]', alerts.dashboard.directs);
    toggleBubbles('header .proIco', communityAlerts);                                               // Current Community (header)

    updateChannelGroupsBubbles();

    sortChannels();

    window.nsWebViewInterface.emit('setNotificationBadge', Object.values(alerts.communities).reduce((acc, value) => acc + value, 0) || 0);
}

function initSortChannels() {
    const channelSortBy = localStorage.getItem("channelSortBy") || 'recent';
    $(`#channelSortBy option[value="${channelSortBy}"]`).attr("selected", "selected");
}

function sortChannels() {
    const channelSortBy = localStorage.getItem("channelSortBy") || 'recent';
    const list = document.querySelector('#channelList');
    const sortedChannels = [...list.children];

    if (channelSortBy === 'channels') {
        sortedChannels.sort((a,b) => parseInt(a.dataset.sort) > parseInt(b.dataset.sort) ? 1 : -1);
    } else {
        sortedChannels.sort((a,b) => parseInt(a.dataset.updated) < parseInt(b.dataset.updated) ? 1 : -1);
    }

    sortedChannels.forEach(node => list.appendChild(node));
}

function updateEventBubbles() {
    $.post(urlFrom('sidebar/eventAlerts')).then(({ alerts }) => {
        toggleBubbles('[href="#eventSect"]', alerts.events);        // Events
        toggleBubbles('[href="#birthdaySect"]', alerts.birthdays);  // Birthdays
    });
}

function updateChannelGroupsBubbles() {
    $('#sidebar .channel-group').each(function() {
        const groupAlerts = $('> ul .miniLbl', this).toArray().reduce((sum, miniLbl) => {
            return sum + (parseInt(miniLbl.innerHTML) || 0);
        }, 0);

        toggleBubbles($(this).find('> a'), groupAlerts);
    })
}

function toggleBubbles(selector, alertsCount) {
    $(selector).find('.miniLbl').toggle(alertsCount > 0).html(
        (alertsCount > 99) ? '99+' : `${ alertsCount }`
    );
}

function toggleCommunityBubbles(selector, hasAlerts) {
    $(selector).find('.miniLbl').toggle(hasAlerts);
}

function addNewChannel(channel) {
    if (channel.community_id != community.id) {
        return;
    }

    const registered = !! member.channels.find(item => item.id == channel.id);
    const inSidebar  = $(`#sidebar [data-channel="${ channel.id }"]`).length > 0;

    if (! registered) {
        member.channels.push(channel);
        member.channelsNotified.push(channel);

        pusherManager.updateSubscriptions();
    }

    if (! inSidebar) {
        if (channel.type === 'Channel') {
            addChannelToSidebar(channel);
        } else if (channel.type === 'Core') {
            addCoreChannelToSidebar(channel);
        }
    }
}

function addNewEvent(event) {
    if (event.community_id == community.id) {
        this.updateBubbles(true);
    }
}

function deleteEvent(event) {
    if (event.community_id == community.id) {
        this.updateBubbles(true);
    }
}

function deleteChannel(channel) {
    if (channel.community_id != community.id) {
        return;
    }

    member.channels = member.channels.filter(ch => ch.id != channel.id);
    member.channelsNotified = member.channels;

    pusherManager.updateSubscriptions();

    $(`#sidebar [data-channel="${ channel.id }"]`).remove();

    const isCurrentChannel = channel.id == mainData.channel.id;

    if (isCurrentChannel && channel.kicked) {
        location.hash = '#engage/activity';
    }
}

function editChannel(channel) {
    if (channel.community_id == community.id) {
        member.channels.forEach(ch => {
            if (ch.id == channel.id) {
                ch.name = channel.name;
            }
        });

        $(`#sidebar .channelsList li[data-channel=${channel.id}] .channelName`).html(channel.name);

        if (location.hash == `#engage/${channel.slug}`) {
            setPageTitle(channel.name, community.name);
        }
    }
}

function joinedCommunity(community) {
    const $joinedCommunities = $('#joined-communities');

    if ($joinedCommunities.find(`.community-icon[data-community-id='${community.id}']`).length) {
        // box is already added to the sidebar. nothing to do.
        return;
    }

    $communityIcon = `<div class="icoBlk community-icon" title="${community.short_name}" data-community-id="${community.id}">
        <span class="miniLbl" style="display: none">0</span>
        <div class="ico">
            <img src="${community.logo}" alt="${community.short_name}">
        </div>
        <small>${community.short_name}</small>
    </div>`;

    $joinedCommunities.append($communityIcon);
}

function leftCommunity(community) {
    if (window.community.id === community.id) {
        return switchCommunity(1);
    }

    // if we weren't in the community, just remove the box
    $(`#joined-communities .community-icon[data-community-id='${community.id}']`).remove();
}

function deletedActivity(notifiableIds = []) {
    $(notifiableIds).each(function (index, notifiableId) {
        $(`#notificationsList .postData[data-notifiable-id='${notifiableId}']`).remove();
    })
}

function addChannelToSidebar(channel) {
    const imgUrl = channel.theme === 'chat'
        ? urlFrom('assets/images/site_icon/icon-direct.svg')
        : urlFrom('assets/images/site_icon/icon-stream2.svg');

    buildChannelForSidebar(channel)
        .find('img').attr('src', imgUrl).end()
        .insertBefore('#sidebar .channels-header');
}

function addCoreChannelToSidebar(channel) {
    const channelIcon = channel.icon || 'icon-stream.svg';
    const iconFullUrl = urlFrom(`assets/images/site_icon/${ channelIcon}`);

    buildChannelForSidebar(channel)
        .find('img').attr('src', iconFullUrl).end()
        .insertAfter('#sidebar [data-slug="stream"]');
}

function buildChannelForSidebar(channel) {
    return $('#sidebar .mainList li:first').clone()
        .attr('data-channel', channel.id)
        .attr('data-slug', channel.slug)
        .find('a')
            .removeClass('active')
            .attr('href', '#engage/' + channel.slug)
            .find('.channelName').text(channel.name).end()
            .find('.miniLbl').empty().end()
        .end();
}

function hideSidebar() {
	$('header.ease .toggle.active').click();
}

function showSidebar() {
    $(".toggle").toggleClass("active");
    $("#leftBar").toggleClass("active");
    $("body").toggleClass("move");
    $(".upperlay").toggleClass("active");
    $('#sidebar').toggleClass('active');
}

function includeCommunityNav(communityNavTabs) {
    let $communityNav = $('#community-nav');
    let $communityNavSpacer = $('#community-nav-spacer');

    if (communityNavTabs) {
        $communityNav.html(communityNavTabs);
        $communityNavSpacer.removeClass('hidden');

        return;
    }

    $communityNav.html('');
    $communityNavSpacer.addClass('hidden');
}

function renderSidebar(sidebar, channels, channelsNotified, community, bubbles) {
    return new Promise((resolve) => {
        window.member.channels = channels;
        window.member.channelsNotified = channelsNotified;

        $('#sidebar .community-name span').html(community.short_name).attr('title', community.name);
        $('#sidebar .community-name .activity-count').removeClass('hide');
        $('#sidebar .listing').replaceWith($(sidebar).find('.listing'));
        $('#sidebar .bar').replaceWith($(sidebar).find('.bar'));

        initialChannelGroupsExpand();
        applyBubbles(bubbles);

        initSortChannels();

        return resolve();
    });
}

function refreshSidebar(communityId) {
    if (! communityId) {
        return;
    }

    $.post(urlFrom(`community/switch`), { communityId }).then(response => {
        renderSidebar(response.sidebar, response.channels, response.channelsNotified, response.community, response.bubbles);
    });
}

function switchCommunity(communityId) {
    if (communityId == community.id) {
        return;
    }

    if (! communityId) {
        // redirect to dashboard. ToDo: in the future, we'll need this to not require a reload, but in v1 of good-looking, a reload is required.
        return location.href = urlFrom('');
    }

    const baseUrl = urlFrom(communityId);

    let loaderTimer = setTimeout(() => {
        $('.popup[data-popup="loading-popup"]').fadeIn();
    }, 500);

    $.post(urlFrom(`community/switch`), { communityId }).then(response => {
        window.community = response.community;
        window.member.isCommunityAdmin = response.isAdmin;
        window.member.channels = response.channels;

        pusherManager.updateSubscriptions();

        $.ajaxSetup({ data: { communityId: community.id } });

        $('.community-icon img').removeClass('active');
        $(`.community-icon[data-community-id="${ community.id }"] img`).addClass('active');
        $('header.ease .proIco img').attr('src', $('.community-icon img.active').attr('src'));
        $('#sidebar .community-name span').html(community.short_name).attr('title', community.name);
        $('#sidebar .community-name .activity-count').removeClass('hide');
        $('#sidebar .listing').replaceWith($(response.sidebar).find('.listing'));
        $('#sidebar .bar').replaceWith($(response.sidebar).find('.bar'));
        $('#sidebar-right').replaceWith($(response.sidebar).find('#sidebar-right'));
        $('#nav').html(response.navTabs);
        this.includeCommunityNav(response.communityNavTabs);
        $('base').attr('href', baseUrl);

        window.history.pushState(null, null, `${ baseUrl }#engage/stream`);
        $(window).trigger('hashchange');

        // for the vue timeline.
        $(window).trigger('communityChange');

        renderSidebar(response.sidebar, response.channels, response.channelsNotified, response.community, response.bubbles)
            .then(() => {
                $(document).trigger('squirrel.community.switch');
            });
    }).always(() => {
        clearTimeout(loaderTimer);
        setTimeout(() => $('.popup[data-popup="loading-popup"]').fadeOut(), 300);
    });
}

function infoMaintenance(info) {
    let infoMaintenance = '<div id="infoMaintenance" class="alert alert-' + info.type + ' alert-dismissible show" role="alert">\
        ' + info.message + '\
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">\
            <span aria-hidden="true">&times;</span>\
        </button>\
    </div>';

    $('body').find('#infoMaintenance').remove();
    $('body').append(infoMaintenance);
}


$(function () {
    const $document = $(document);

    pusherManager.on('notification.squirrel', infoMaintenance);
    pusherManager.on('new.channel.squirrel', addNewChannel);
    pusherManager.on('new.event.squirrel', addNewEvent);
    pusherManager.on('rsvp.event.squirrel', deleteEvent);
    pusherManager.on('deleted.event.squirrel', deleteEvent);
    pusherManager.on('deleted.channel.squirrel', deleteChannel);
    pusherManager.on('leave.channel.squirrel', deleteChannel);
    pusherManager.on('edit.channel.squirrel', editChannel);
    pusherManager.on('joined.community.squirrel', joinedCommunity);
    pusherManager.on('left.community.squirrel', leftCommunity);
    pusherManager.on('deleted.activity.squirrel', ({ notifiableIds }) => deletedActivity(notifiableIds));

    $document.on('click', '.hidesSidebar', hideSidebar);

    $document.on("click", ".toggle, header .proIco", showSidebar);

    $document.on('swiperight', function(e, data) {
        showSidebar();
    });

    $document.on('swipeleft', function(e, data) {
        hideSidebar();
    });

    $document.on('click', '#sidebar .channel .inBlk h6', function(){
        $(this).parent().children('.list').slideToggle();
    });

    $document.on('click', '#sidebar .channel-group > a', function() {
        const $group = $(this).closest('.channel-group').toggleClass('expanded');

        $group.find('> a .miniLbl').parent().toggle(! $group.is('.expanded'));

        localStorage.setItem(
            `channel-group-${ $group.data('group-id') }-expanded`,
            $group.is('.expanded').toString()
        );
    });

    $document.on('push.event.received', (_, data) => {
        const isEventByAnotherMember = data.memberId != member.id;
        const handledByCurrentMember = [
            'new.comment.squirrel',
            'updated.comment.squirrel',
            'deleted.comment.squirrel',
        ];

        if (data.eventName === 'pusher:pong') {
            return;
        }

        console.log('push.event.received', data);

        if (data.eventName === 'new.comment.squirrel') {
            if (! $('#channelList').find(`li[data-channel=${data.channelId}]`).length) {
                // this channel isn't in the sidebar yet, possibly an old channel that had been innactive for a while.
                return refreshSidebar(window.community.id);
            }

            if (! isEventByAnotherMember) {
                $('#channelList').find(`li[data-channel=${data.channelId}]`).attr('data-updated', moment().unix());
                sortChannels();
            }
        }

        updateBubbles(
            isEventByAnotherMember || ! handledByCurrentMember.includes(data.eventName)
        );
    });

    $document.on('click', '.community-list .join', function () {
        if ($(this).attr('disabled')) {
            return;
        }

        const id = $(this).data('community-id');

        $(this).attr('disabled', true);

        $.post(urlFrom('community/join'), { id }).then(() => {
            switchCommunity(id);
            $('[data-popup="join-community"]').slideUp();
        }).fail(({ status }, textStatus) => {
            if (status == 401) {
                showError(translate('This community cannot be joined at the moment. Please try again later.'));
            } else if (textStatus !== 'aborted') {
                showGenericError();
            }

            $(this).attr('disabled', false);
        });
    });

    $document.on('click', '.community-list .request', function (e) {
        e.preventDefault();

        if ($(this).attr('disabled')) {
            return;
        }

        const id = $(this).data('community-id');

        $(this).attr('disabled', true);

        $.post(urlFrom('community/request'), { id }).then(() => {
            $(this).html(translate('Request Sent!')).removeClass('request');
        }).fail(({ status }, textStatus) => {
            if (status == 401) {
                showError(translate('This community cannot be joined at the moment. Please try again later.'));
            } else if (textStatus !== 'aborted') {
                showGenericError();
            }

            $(this).attr('disabled', false);
        });
    });

    $document.on('click', '.community-icon', function() {
        switchCommunity($(this).data('community-id'));
    });

    initSortChannels();

    $document.on('change', '#channelSortBy', function(e) {
        localStorage.setItem('channelSortBy', $(this).val());
        sortChannels();
    });

    $(document).on('click', '#membersContainer .leaveCommunity', function() {
        var confirmationText = translate('You are about to leave this community. Are you sure?'),
            clickedElement = $(this);

        confirm('Please confirm', confirmationText).then(() => {
            let dataOverride = {},
                isMergedConnectionsPage = false,
                communityName = community.short_name;

            if (typeof clickedElement.parents('h5').eq(0).data('community') !== 'undefined') {
                dataOverride.communityId = parseInt(clickedElement.parents('h5').eq(0).data('community'));
                isMergedConnectionsPage = true;
                communityName = member.communities[dataOverride.communityId].short_name;
            }

            $.post(urlFrom('community/leave'), dataOverride).then(() => {
                showMessage(translate(`You have left Community {{ communityName}}.`, {communityName: communityName}), 3000);
                if (isMergedConnectionsPage) {
                    location.reload();
                } else {
                    switchCommunity(1);
                }

            }).fail(showGenericError);
        }).catch($.noop); // Avoid console warning if member cancels
    });

    /**
     * Bubbles: periodical checks and on-demand updates
     */
    throttled('bubbles.update.periodic', 30000); // No need to run right after page load
    setInterval(updateBubbles, 1000);
});

/**
 * Dynamic page title with preview of latest Activity
 */
$(function() {
    // No need to set the page title in native because the page title is purely a browser feature.
    // It also fixes a bug with the page title showing up on the iOS media preview sometimes
    if (window.isNative) return;

    const pageTitle = {
        scheduled: null,
        notifiableId: null,
        defaultTitle: document.title,
    };

    pusherManager.on('new.activity.squirrel', ({ notifiableId }) => setActivityPreview(notifiableId));
    pusherManager.on('read.activity.squirrel', ({ notifiableIds }) => updateActivityPreview(notifiableIds));

    function setActivityPreview(notifiableId) {
        if (! community.id) {
            return;
        }

        const uri = notifiableId ? `activity/fetch/${ notifiableId }` : `activity/latest`;

        $.post(urlFrom(uri)).then(({ notification }) => {
            if (notification.community_id != community.id || notification.seen_date || notification.error) {
                return;
            }

            document.title = $(`<p>(${ mainData.alerts.activity || 1 }) ${ notification.content }</p>`).text();

            pageTitle.notifiableId = notification.id;
        }).catch($.noop); // It's okay if we get no unread notification here
    }

    function updateActivityPreview(notifiableIds = []) {
        if (notifiableIds.includes(pageTitle.notifiableId)) {
            pageTitle.notifiableId = null;
            document.title = pageTitle.defaultTitle;
        } else if (mainData.alerts && mainData.alerts.activity) {
            document.title = document.title.replace(/^\(\d+\)/, `(${ mainData.alerts.activity })`);
        }
    }

    setActivityPreview();

    $(document).on('squirrel.community.switch', () => setActivityPreview());

    $(window).on('hashchange', () => {
        clearTimeout(pageTitle.scheduled);
        pageTitle.scheduled = setTimeout(setActivityPreview, 3000);
    });
});
