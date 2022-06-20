"use strict";

function Profile(manager, Events, memberId) {
    this.manager = manager;
    this.Events = Events;
    this.memberId = memberId;
    this.firstName = null;

    $('#profile').data('ProfileObject', this);
}

Profile.prototype = {
    init() {
        this.loadData().then(
            this.setContent.bind(this)
        ).then(() => {
            this.manager.newManager('gallery').preload().then(galleryManager => {
                new Gallery(galleryManager).widget(this.memberId, '#gallery .gallery-widget', this.firstName);
            });

            this.manager.newManager('certification').preload().then(certificationManager => {
                new Certification(certificationManager).widget(this.memberId, '#badges .badges-widget');
            });
        });
    },

    loadData() {
        if (this.memberId === 'community') {
            return $.post(urlFrom('profile/communityProfile')).fail(showNetworkError);
        } else {
            return $.post(urlFrom('profile/regularProfile'), {
                id: this.memberId
            }).fail(showNetworkError);
        }
    },

    setContent({ profile, events }) {
        this.clearContent();

        if (! profile) {
            return this.noProfileMessage();
        }

        this.firstName = profile.firstname;

        if (profile.viewAccess && profile.viewAccess === 'limited') {
            return this.addLimitedProfile(profile);
        }

        this.addProfile(profile);

        this.firstName = profile.firstname;

        this.addEvents(events);

        vueTimelineInstance.mount();
    },

    prepareBadge(badge, count) {
        if (count > 1) {
            return `<div class="latest-badge-count">${count}</div>`;
        } else {
            return badge ? '<img src="' + get_file_url(badge, 'badges', 'p150x150') + '" class="latest-badge"/>' : '';
        }
    },

    addProfile(profile) {
        const renderProfile = {
            ...profile,
            muted: ! profile.muted ? 'on' : 'off',
            badge: this.prepareBadge(profile.badge, profile.badgeCount),
            amountOfFriends: profile.friends.length,
        };

        this.profile = profile;

        this.manager.render('profileCard', renderProfile)
            .in('#profile .profile-card', this.manager.MODE_INSERT);

        this.manager.render('profileHeader', renderProfile)
            .in('#profile .profile-header', this.manager.MODE_INSERT);

        this.manager.render('profileButtons', renderProfile)
            .in('#profile .profile-buttons', this.manager.MODE_INSERT);

        this.manager.render('profileTabs')
            .in('#profile .profile-tabs', this.manager.MODE_INSERT);

        this.manager.render('profileFooter', renderProfile, true)
            .in('#profile .profile-footer', this.manager.MODE_INSERT);

        if (this.memberId == member.id) {
            $('.profileButtons, .profileActions, .reqInfos').remove();
            const topBlk = $('.profile-card > .topBlk.text-center');

            const settingsBtn = `
            <button type="button" class="settings popBtn">
                <img src="${urlFrom('assets/images/site_icon/icon-cog.svg')}" alt="">
            </button>`;

            topBlk.append(settingsBtn);
        }

        if (profile.is_gnome) {
            $('.reqInfos').remove();
            $('.profile-buttons .profileActions').remove();
        }

        if (profile.isGnome || (! community.config.sidebar.directs && ! member.isCommunityAdmin)) {
            $('#messageMember').remove();
        }

        if (! profile.connected) {
            $('#friendStatus').remove();
        }

        this.manager.render('popupCard', renderProfile)
            .in('#profile .popup', this.manager.MODE_APPEND);

        if (! profile.connected) {
            $('#friendStatus').remove();
        }
    },

    addLimitedProfile(profile) {
        const renderProfile = {
            ...profile
        };

        this.profile = profile;

        this.manager.render('profileCard', renderProfile)
            .in('#profile .profile-card', this.manager.MODE_INSERT);

        this.manager.render('profileHeader', renderProfile)
            .in('#profile .profile-header', this.manager.MODE_INSERT);

        this.manager.render('requestConnectionButton', renderProfile)
            .in('#profile .request-connection-button', this.manager.MODE_INSERT);

        if (profile.connectionStatus) {
            // profile.connectionStatus is null if no request was sent.
            //Otherwise disable the button as we wouldn't be on a limited profile if they had accepted
            // and we don't want to give too much info if they were rejected.
            $('#profile .requestConnection')
                .prop('disabled', true)
                .html(translate('Connection Request Sent'));
        }

    },

    addEvents(events) {
        this.Events.addEvents(events, $('#profile #eventSectProfile .eventLst .flexRow'), null, this.noEventMessage());
    },

    noProfileMessage() {
        $('#profile .profile-card').html(`
            <span class="no-content">${translate("You're not allowed to see this profile.")}</span>
        `);
        $('#profile .profile-tabs').remove();
    },

    noEventMessage() {
        return `<span class="no-content mt-10 ml-10">${translate('No events to show.')}</span>`;
    },

    noPostMessage() {
        $('#profile .cmntLst').html(`
            <span class="no-content">${translate('No posts to show.')}</span>
        `)
    },

    clearContent() {
        $('#profile .topBlk').empty();
    }
}

$(document).on('click', '.mutePosts', function(e) {
    e.preventDefault();

    const profile = $('#profile').data('ProfileObject');
    const icon = $(this).find('img');
    let src = icon.attr('src');

    src = (profile.profile.muted) ? src.replace(/-off/g, "-on") : src.replace(/-on/g, "-off");

    icon.attr('src', src);

    profile.profile.muted = ! profile.profile.muted;

    $.post(urlFrom(`profile/mutePosts`), {
        muted: profile.profile.muted ? 1 : 0,
        memberId: profile.profile.id
    }).then(() => {
        if (profile.profile.muted) {
            showMessage(translate('Posts invisible'));
        } else {
            showMessage(translate('Posts visible'));
        }
    });
});

$(document).on('click', '.reqInfos', function() {
    const data = { memberId: $("#messageMember").data('member') };

    $('.reqInfos div span').html(translate('Request sent'));
    $('.reqInfos').removeClass('reqInfos');

    $.post(urlFrom(`personalInfo/request`), data).then(() => {
        $.alert({
            title: translate('Info'),
            content: translate('Your request has been sent.'),
            buttons: {[translate('Okay')]: {}}
        });
    });
});

$(document).on('click', '.qtyFriends', function(){
    const profile = $('#profile').data('ProfileObject');
    const list = profile.profile.friends;

    if (! list.length) {
        return;
    }

    const $popup = profile.manager.render('friendsCard', {count: list.length}).fetch();

    $.each(list, (_, data) => {
        $popup.find('.who_People').append(/* template */`
            <li>
                <div class="ico prfBtn" data-member-id="${ data.id }">
                    <img src="${ get_avatar_url(data.avatar, data.id, 'p50x50') }">
                </div>
                <span class="prfBtn" data-member-id="${ data.id }">${ data.first_name } ${ data.last_name }</span>
            </li>
        `);
    });

    $('body').addClass('flow');

    $popup.appendTo("#appLd #profile").fadeIn();
});

$(document).on('click', '#profile .topBlk > button.settings.popBtn', function(){
    localStorage.setItem('settingsFromProfile', true);
    location.hash = 'settings';
});
