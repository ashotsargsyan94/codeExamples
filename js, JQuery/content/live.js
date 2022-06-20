"use strict";

function Live(manager, channelId, id) {
    this.manager = manager;

    this.channelId = channelId;
    this.channel = member.channels.find(channel => String(channel.id) === String(this.channelId));
    this.id   = id;

    this.total_time = 0;
    this.postId = this.id || null;
    this.source_connection_information = null;
    this.streamId = null;
    this.saveStream = 0;

    if (typeof this.id !== 'undefined') {
        this.theme = new BroadcastView(this);
    } else {
        this.theme = new Broadcast(this);
    }

    $('#broadcast').data('LiveObject', this);
}

Live.prototype = {
    init() {
        $('#appContainer').addClass('broadcast');

        $(window).on('resize', () => this.fixChatHeight());

        $(document).ready(() => this.fixChatHeight());

        this.themeHook('init');
    },

    themeHook(hook, ...args) {
        if (this.theme && this.theme[hook]) {
            return this.theme[hook](...args);
        }
    },

    initialized() {
        this.pusherEventHandlers = {
            'new.comment.squirrel': this.autoLoadPost.bind(this),
            'deleted.comment.squirrel': this.autoDeletePost.bind(this),
            'enter.broadcast.squirrel': this.enterBroadcast.bind(this),
            'left.broadcast.squirrel': this.leftBroadcast.bind(this),
        }

        for (event in this.pusherEventHandlers) {
            pusherManager.on(event, this.pusherEventHandlers[event]);
        }
    },

    unregister() {
        $('#appContainer').removeClass('broadcast');
        $('#broadcast').hide();

        for (event in this.pusherEventHandlers) {
            pusherManager.off(event, this.pusherEventHandlers[event]);
        }

        this.themeHook('unregister');
    },

    fixChatHeight() {
        let height;
        if ($('#appLd').width() <= 991) {
            height = $('#appLd').height() - $('.video-wrap').height() - 100;
        } else {
            height = $('.comments-wrap').height() - 51;
        }

        $('#stream_comments').height(height);
    },

    autoDeletePost({ postId }) {
        this.themeHook('autoDeletePost', postId);
    },

    submitForm($form, event) {
        event.preventDefault();
        event.stopPropagation();

        if (this.postId && ! $('#postLive textarea').val().trim()) {
            return;
        }

        this.createPost($form).then(response => {
            if (! response || ! response.posts.length) {
                showGenericError();
            }

            this.themeHook('createPostAfter');
        });
    },

    stopStreaming(_, event) {
        this.themeHook('stopStreaming', event);
    },

    toggleViewers(_, event) {
        event.preventDefault();
        $('.video-viewers-popup').toggleClass('show');
    },

    async _loadViewers(broadcastId, $popup) {
        const response = await $.post(`broadcast/viewers/${ broadcastId }`);

        if (! response || ! response.viewers) {
            return showError('Failed to fetch viewers list');
        }

        this._processViewers($popup, response.viewers, true);
    },

    _processViewers($popup, viewers, cleanList) {
        if ( ! viewers.length) {
            return;
        }

        let $viewersList = $popup.find('.video-viewers-list');

        if (cleanList) {
            $popup.find('.video-viewers-popup-header').find('em').html(viewers.length);
            $viewersList.empty();
            $popup.data('viewers-count', viewers.length);
            $('.video-viewers-btn').html(viewers.length);
        }

        $.each(viewers, (_, viewer) => $viewersList.append(
            this.manager.render('viewer', {
                id: viewer.viewer_id,
                name: viewer.memberName,
                avatar: get_avatar_url(viewer.avatar, viewer.viewer_id, 'p100x100'),
                link: community.id + '#profile/' + viewer.viewer_id
            }).html()
        ));
    },

    toggleSettings(_, event) {
        event.preventDefault();
        $('.video-settings-popup').toggleClass('show');
    },

    toggleMic(target, event) {
        event.preventDefault();
        target.toggleClass('mute');
        SquirrelLive.toggleMic(target.hasClass('mute'));
    },

    toggleCam(target, event) {
        event.preventDefault();
        target.toggleClass('mute');
        SquirrelLive.toggleCam(target.hasClass('mute'));
    },

    closeStreaming(_, event) {
        this.themeHook('closeStreaming', event);
    },

    createPost($form, force = false) {
        const $textInput = $form.find('textarea');
        const $postBtn   = $form.find('button[type="submit"]');

        $('#start_publish_button').attr("disabled", true);

        if(! force) {
            $postBtn.attr("disabled", true);
        }

        if ( ! $textInput.val().trim() && ! force) {
            return confirm(
                '', //no title is needed for this modal.
                translate("Please write a short message about your broadcast event or click Continue to broadcast without a message."),
                translate("Continue Anyway"),
                translate("Write Message")
            ).then(() => {
                return this.createPost($form, true);
            }).catch(() => {
                $('#start_publish_button').attr("disabled", false);
                $postBtn.attr("disabled", false);
                return Promise.reject(translate("Empty post."));
            });
        }

        let formData = {
            'channelId': this.channelId,
            'message': $textInput.val(),
            'communityId': community.id
        };

        if (this.postId) {
            formData.parentId = this.postId;
        } else {
            formData.live = 1;
        }

        if ($textInput.val().trim()) {
            let newComment = /* template */`
                <li class="video_comment" data-store-prf="${member.id}" data-store="">
                    <a class="ico" href="${community.id}#profile${ member.id }">
                        <img
                            src="${get_avatar_url(member.avatar, member.id, 'p100x100')}"
                            alt="avatar"
                            title="${member.first_name} ${member.last_name}"
                        >
                    </a>
                    <div class="comment">
                        <strong>${member.first_name} ${member.last_name}</strong>
                        ${ $textInput.val() }
                    </div>
                </li>`;

            $('#stream_comments')
                .append(newComment)
                .animate({ scrollTop: $('#stream_comments').height() + 5 }, 500);

            $textInput.val('');
        }

        return $.post(urlFrom('comments/create'), formData).then((response) => {
            if (! this.postId && response && response.posts.length) {
                this.postId = response.posts[0].id
            }

            $('#start_publish_button').attr("disabled", false);

            if(! force) {
                $postBtn.attr("disabled", false);
            }

            return response;
        }).fail(showNetworkError);
    },

    loadMessages(messages) {
        if ( ! messages.length) {
            return '';
        }

        messages.reverse();

        $.each(messages, (i, message) => {
            if (parseInt(message.creator_id) === parseInt(member.id)) {
                return;
            }

            if (! message.html || $(`.video_comment[data-store="${ message.id }"]`).length) {
                return;
            }

            $('#stream_comments')
                .append(this.processMessage(message))
                .animate({ scrollTop: $('#stream_comments').height() + 5 }, 500);
        });
    },

    processMessage(message) {
        return /* template */`
            <li class="video_comment" data-store-prf="${message.creator_id}" data-store="${message.id}">
                <a class="ico" href="${community.id}#profile${ message.creator_id }"><img src="${message.memberAvatar}" alt="" title="${message.memberName}"></a>
                <div class="comment"><strong>${message.memberName}</strong> ${message.html}</div>
            </li>`;
    },

    _isCurrentChannel(channelId) {
        const channel = member.channels.find(channel => String(channel.id) === String(this.channelId));
        return channel && String(channel.id) === String(channelId);
    },

    autoLoadPost({ memberId, channelId, postId, isUnhidden }) {
        if (! this._isCurrentChannel(channelId)) {
            return;
        }

        const parentPost = this.postId;

        $.get(urlFrom(`engage/post/${postId}`)).then(response => {
            const post = response.posts[0];

            if (post.parent_id == parentPost || postId == parentPost) {
                $('#stream_comments')
                    .append(this.loadMessages(response.posts))
                    .animate({ scrollTop: $('#stream_comments').height() + 5 }, 500);
            }

        }).fail((_) => { }); // Fail silently?
    },

    enterBroadcast({memberId, channelId, broadcastId}) {
        if (! this._isCurrentBroadcast(broadcastId)) {
            return;
        }

        let $popup = $('.video-viewers-popup');

        if ($popup.length == 0) {
            return;
        }

        let viewersCount = $popup.data('viewers-count');

        viewersCount++;
        $popup.data('viewers-count', viewersCount);

        $('.video-viewers-btn').html(viewersCount);
        $popup.find('.video-viewers-popup-header').find('em').html(viewersCount);

        $.get(urlFrom(`broadcast/viewer/${broadcastId}/${memberId}`)).then(response => {
            this._processViewers($popup, response.viewer, false);
        }).fail((_) => { }); // Fail silently?

        // we can also send message that user enter the room
    },

    leftBroadcast({memberId, channelId, broadcastId}) {
        if (! this._isCurrentBroadcast(broadcastId)) {
            return;
        }

        let $popup = $('.video-viewers-popup');

        let viewersCount = $popup.data('viewers-count');

        viewersCount--;
        if (viewersCount < 0) {
            viewersCount = 0;
        }

        $popup.data('viewers-count', viewersCount);
        $('.video-viewers-btn').html(viewersCount);

        $popup.find('.video-viewers-popup-header').find('em').html(viewersCount);
        $(`.video-viewers-list li[data-id='${memberId}']`).remove();

         // we can also send message that user left the room
    },

    _isCurrentBroadcast(broadcastId) {
        return String(broadcastId) === String(this.postId);
    },

    // TODO: Do we need this??
    _fixMobileVideScreenSize() {
        if(isMobile()) {
            $('#publisher-video').css('height', $(window).height() / 2);

            if(isSafari()) {
                $('#live').css('padding-bottom', 125);
            }
        }
    }
}
