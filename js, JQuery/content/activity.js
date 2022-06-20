"use strict";

/**
 * @param {ContentManager} manager
 */
function Activity(manager) {
    this.manager = manager;

    this.loadDataXHR = null;
    this.viewsQueue = [];
    this.isWidget = false;
    this.pageSize = 10;

    this.isDashboard = window.community.id === null;

    $('#activityStream').data('ActivityObject', this);
}

Activity.prototype = {
    init() {
        $('#notificationsList').empty();

        this.loadData();
    },

    initialize() {
        this.resetAlertsTimeout = setTimeout(() => this.resetAlerts(), 30000);
        this.logViewsInterval = setInterval(() => this.logViews(), 500);

        this.pusherEventHandlers = {
            'new.activity.squirrel': this.autoLoadNotification.bind(this),
            'read.activity.squirrel': this.readNotification.bind(this),
        }

        for (event in this.pusherEventHandlers) {
            pusherManager.on(event, this.pusherEventHandlers[event]);
        }
    },

    unregister() {
        clearTimeout(this.resetAlertsTimeout);
        clearInterval(this.logViewsInterval);

        for (event in this.pusherEventHandlers) {
            pusherManager.off(event, this.pusherEventHandlers[event]);
        }
    },

    loadData(toDate, loadForAllComunities, pageSize) {
        $('#activityPreloader').fadeIn();

        this.loadDataXHR && this.loadDataXHR.abort();

        this.loadDataXHR = $.post(urlFrom('activity'), { toDate, isDashboard: loadForAllComunities || 0, pageSize});

        return this.loadDataXHR.then(response => {
            this.addContent(response.notifications);

            if (this.bottomReached = response.lastBatch) {
                $("#cmntLoader").fadeOut();
            }
        }).fail(showNetworkError);
    },

    autoLoadNotification({ notifiableId }) {
        $.post(urlFrom(`activity/fetch/${ notifiableId }`)).then(response => {
            if (response.notification) { // Will be false if it's from another community
                this.upsertNotification(response.notification);
            }
        });
    },

    readNotification({ notifiableIds }) {
        notifiableIds.forEach(notifiableId => {
            $(`[data-notifiable-id="${ notifiableId }"]`).removeClass('notViewed highlighted');
        });
    },

    upsertNotification(notification) {
        const existingNotification = $(`[data-notifiable-id="${ notification.id }"]`);
        const lastNotifiableId = $(`[data-notifiable-id]:first`).data('notifiable-id');

        if (existingNotification.length) {
            existingNotification.find('.post-content').html(this.contentWithLink(notification));
        } else if (lastNotifiableId < notification.id) {
            this.addNotification(notification, this.manager.MODE_PREPEND);
        }
    },

    contentWithLink(notification) {
        return notification.content + this.contentLink(notification);
    },

    contentLink(notification) {
        return `<a class="linkTo" href="${ notification.url }">${translate('View')} &gt;&gt;&gt;</a>`;
    },

    /**
     * Add a post to the timeline or elsewhere.
     *
     * @param {object} notification  An object with notification data
     * @returns the DOM element containing the new post
     */
    addNotification(notification, mode) {
        if (notification.url && ! this.isWidget) {
            notification.content = this.contentWithLink(notification);
        }

        notification.link = '';

        if (notification.url && this.isWidget) {
            notification.link = this.contentLink(notification);
        }

        if (notification.error && ! member.managedCommunities.includes(notification.community_id)) {
            return;
        } else if (notification.error) {
            notification.content = `
                <h3>Notification parsing failed<br />(debug for Admins only)</h3>
                <p class="post-content">
                    <p>This notification could not be parsed. Please report it with this detail:</p>
                    <p><b>${ notification.error }</b></p>
                </p>
            `;
        }

        const template = this.isWidget ? 'widgetNotification' : 'notification';
        const container = this.isWidget ? '#activityList' : '#notificationsList';

        if (this.isWidget) {
            if (typeof notification.member !== 'undefined'
                && notification.member !== null
                && notification.member.avatar !== null) {
                notification.avatar = `<img src="${notification.member.avatar}" alt="" title="${notification.member.name}">`;
            } else if (typeof notification.community_logo !== 'undefined') {
                notification.avatar = `<img src="${notification.community_logo}" alt="" title="${notification.community_name}">`;
            }
        }

        const $notification = this.manager
            .render(template, notification, true)
            .in(container, mode || this.manager.MODE_APPEND);

        const viewed = !! notification.seen_date;

        if (this.isDashboard && ! this.isWidget) {
            this.manager.render('communityPrefix', {
                id: notification.community_id,
                logo: notification.community_logo,
                name: notification.community_name,
            }).in($notification, this.manager.MODE_PREPEND);
        }

        // Link data to new notification dom element for future use
        return $notification
            .data('created', notification.created_at)
            .toggleClass('notViewed', ! viewed)
            .toggleClass('highlighted', ! viewed);
    },

    /**
     * Add content (posts) to the timeline or elsewhere.
     *
     * @param {array} notifications  A list of objects with post data
     */
    addContent(notifications) {
        $('#activityPreloader').remove();

        if (! notifications.length) {
            const noPostContainer = ! this.isWidget ? '.posts.postData, .alertMsg.noPosts' : '#activityList li, #activityList li.alertMsg.noPosts';
            const activityContainer = ! this.isWidget ? '#appLd #activityStream .inter.roadMap' : '#activityList';
            const elementType = ! this.isWidget ? '<div>' : '<li>';

            if (! $(noPostContainer).length) {
                $(activityContainer).append($(elementType, {
                    class: 'alertMsg noPosts',
                    text: translate('You have no activity notifications :(')
                }))
            }

            return;
        }

        $.each(notifications, (_, notification) => {
            this.addNotification(notification);
        });

        if (notifications.length > 7) {
            this.addWidgetPreloader();
        }
    },

    addWidgetPreloader() {
        if (this.isWidget) {
            $('#activityList').append('<li id="activityPreloader"><i class="fas fas fa-spinner fa-spin"></i></li>');
        }
    },

    sendViewsReport() {
        if (! this.viewsQueue.length || this.processingViewsReport || throttled('activity', 5000)) {
            return;
        }

        this.processingViewsReport = true;
        const ids = [ ...this.viewsQueue ];

        $.post(urlFrom('activity/markRead'), { ids }).then(() => {
            this.viewsQueue = this.viewsQueue.filter(id => ! ids.includes(id));

            updateBubbles(true);
        }).always(() => this.processingViewsReport = false);
    },

    resetAlerts() {
        $.post(urlFrom('activity/markAllRead')).then(() => updateBubbles(true));
    },

    /**************************************
     **  EVENT HANDLERS  ******************
     **************************************/

    /**
     * TODO
     */
    windowScrolled() {
        this.logViews();

        if (this.loadingMore || this.bottomReached) {
            return;
        }

        const scrolled = $(window).scrollTop() + $(window).height();
        const triggerScroll = $(document).height() - 200;
        const toDate = $('#activityStream .postBlk:last').data('created');

        if (toDate && scrolled > triggerScroll) {
            this.loadingMore = true;

            return this.loadData(toDate).always(() => {
                this.loadingMore = false;
            });
        }
    },

    widgetScrolled() {
        this.logViews();

        if (this.loadingMore || this.bottomReached) {
            return;
        }

        this.isWidget = true;

        const scrollPosition = Math.round($('#activityWidgetWrap').scrollTop() + $('#activityWidgetWrap').outerHeight());
        const totalHeight = $('#activityWidgetWrap')[0].scrollHeight;

        if (scrollPosition >= totalHeight) {
            const toDate = $('#activityList li:not(#activityPreloader):last').data('created');

            if (toDate) {
                this.loadingMore = true;

                return this.loadData(toDate, 1, this.pageSize).always(() => {
                    this.loadingMore = false;
                });
            }
        }
    },

    logViews() {
        // Don't over-do it, just check every once in a while
        if (throttled('activity.logViewer', 200)) {
            return;
        }

        $('.activityItem.notViewed').each((_, notification) => {
            const $notification = $(notification);

            // Count every time we see this notification in the screen ...
            if (this._isNotificationVisible($notification.find('.postWrite').get(0))) {
                $notification.data('inViewportCount', ($notification.data('inViewportCount') || 0) + 1);

                // ... and if we see it enough times, add it to the queue (to be flagged as seen)
                if ($notification.data('inViewportCount') >= 10) {
                    this.markAsSeen($notification);
                }
            }
        });

        this.sendViewsReport();
    },

    markAsSeen($notification) {
        $notification.removeClass('notViewed highlighted');
        this.viewsQueue.push($notification.data('notifiable-id'));
    },

    _isNotificationVisible(notification) {
        const position = notification.getBoundingClientRect();

        return $(notification).is(':visible')
            && ((position.top >= 0) || (position.bottom <= (window.innerHeight || document.documentElement.clientHeight)))
            && ((position.left >= 0) || (position.right <= (window.innerWidth || document.documentElement.clientWidth)));
    },

    acceptCommunityRequest($notification, $target) {
        const notifiableId = $notification.data('notifiable-id');

        this.disableButtons($target);

        $.post(urlFrom('community/acceptRequest'), { notifiableId })
            .then(response => {
                if (response.success) {
                    $notification.find('.post-content').html(response.notification.content);
                }
            }).fail(showGenericError);
    },

    declineCommunityRequest($notification, $target) {
        const notifiableId = $notification.data('notifiable-id');

        this.disableButtons($target);

        $.post(urlFrom('community/declineRequest'), { notifiableId }).then(response => {
            if (response.success) {
                $notification.find('.post-content').html(response.notification.content);
            }
        }).fail(showGenericError);
    },

    cancelCommunityRequest($notification, $target) {
        const notifiableId = $notification.data('notifiable-id');

        this.disableButtons($target);

        $.post(urlFrom('community/cancelRequest'), { notifiableId }).then(response => {
            if (response.success) {
                $notification.find('.post-content').html(response.notification.content);
            }
        }).fail(showGenericError);
    },

    /**
     * TODO
     */
    acceptRequest($notification, $target) {
        const notifiableId = $notification.data('notifiable-id');

        this.disableButtons($target);

        $.post(urlFrom('personalInfo/acceptRequest'), { notifiableId }).then(response => {
            $notification.find('.post-content').html(response.notification.content);
        }).fail(showGenericError);
    },

    /**
     * TODO
     */
    declineRequest($notification, $target) {
        const notifiableId = $notification.data('notifiable-id');

        this.disableButtons($target);

        $.post(urlFrom('personalInfo/declineRequest'), { notifiableId }).then(response => {
            $notification.find('.post-content').html(response.notification.content);
        }).fail(showGenericError);
    },

    acceptFriendRequest($notification, $target) {
        const notifiableId = $notification.data('notifiable-id');
        const memberId = $target.data('member');

        this.disableButtons($target);

        $.post(urlFrom('friends/acceptRequest'), { notifiableId, memberId }).then(response => {
            $notification.find('.post-content').html(response.notification.content);
            // TODO refresh right sidebar and friends request page
        }).fail(showGenericError);
    },

    ignoreFriendRequest($notification, $target) {
        const notifiableId = $notification.data('notifiable-id');
        const memberId = $target.data('member');

        this.disableButtons($target);

        $.post(urlFrom('friends/ignoreRequest'), { notifiableId, memberId }).then(response => {
            $notification.fadeOut();
            // TODO refresh right sidebar and friends request page
        }).fail(showGenericError);
    },

    toggleWidget() {
        this.isWidget = true;

        const loadActivity = $('#activityStream.activityWidget').hasClass('hide');

        $('#activityList').empty();
        this.addWidgetPreloader();

        $('button#activity-bell').toggleClass('active');
        $('#activityStream.activityWidget').toggleClass('hide');
        $('body').toggleClass('flow');

        if (loadActivity) {
            this.logViewsInterval = setInterval(() => this.logViews(), 500);
        } else {
            clearInterval(this.logViewsInterval);
            return;
        }

        this.loadData(null, 1, this.pageSize);
    },

    // disable both botton to prevent double click
    disableButtons($target) {
        $target.parent().find('button').each(function() {
            $(this).attr("disabled", true);
        });
    },
};

/**
 * Factory of event handlers for Activity events.
 *
 * $(#appLd).on(eventName, targetSelector,
 *      activityHandler(engageMethodName)
 * );
 */
const activityHandler = (activityMethod, goOn) => event => {
    const activityObject = $('#activityStream').data('ActivityObject');

    if (activityObject) {
        const $notification = $(event.target).closest('.activityItem');
        const method = activityObject[activityMethod];

        if (method) {
            if ( ! goOn) {
                event.preventDefault();
                event.stopPropagation(); // TODO : remove once old handlers are deleted
            }

            method.call(activityObject, $notification, $(event.target), event);
        } else {
            console.log(`Activity.${ activityMethod } was called but is not registered.`);
        }
    }
}


/**
 * Set up engage-related event listeners below.
 */
const $appLd = $('#appLd');
const $document = $(document);

$document.on('click', '#activityList', () => $('#activity-bell').click());

$document.on('navigation.activity.initialized',
    activityHandler('initialize')
);

$document.on('navigation.pagechange',
    activityHandler('unregister')
);

$document.on('click', '#activityStream .reqInfo_btn .acceptCommunityReq',
    activityHandler('acceptCommunityRequest')
);

$document.on('click', '#activityStream .reqInfo_btn .declineCommunityReq',
    activityHandler('declineCommunityRequest')
);

$document.on('click', '#activityStream .reqInfo_btn .cancelCommunityReq',
    activityHandler('cancelCommunityRequest')
);

$document.on('click', '#activityStream .reqInfo_btn .acceptReq',
    activityHandler('acceptRequest')
);

$document.on('click', '#activityStream .reqInfo_btn .declineReq',
    activityHandler('declineRequest')
);

$document.on('click', '#activityStream .reqInfo_btn .acceptFriendReq',
    activityHandler('acceptFriendRequest')
);

$document.on('click', '#activityStream .reqInfo_btn .ignoreFriendReq',
    activityHandler('ignoreFriendRequest')
);

$document.on('click', '#activityStream .activityItem',
    activityHandler('markAsSeen', true)
);

$(window).scroll(
    activityHandler('windowScrolled')
);

$appLd.on('click', '#notificationsList .linkTo ', function() {
    const href = $(this).attr('href');
    if (href.includes('/post')) {
        localStorage.setItem('fromActivity', true);
    }
});

$document.on('click', function (e) {
    if ($('body').hasClass('flow') && $('#activity-bell').hasClass('active')) {
        if ($(e.target).closest('#activity-bell').length === 0
            && $(e.target).closest("#activityStream.activityWidget").length === 0) {
                $('#activityStream.activityWidget').addClass('hide');
                $('#activity-bell').removeClass('active');
                $('body').removeClass('flow');
        }
    }
});
