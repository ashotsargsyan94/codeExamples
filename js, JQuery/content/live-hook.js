function Broadcast(live) {
    this.live  = live;
    this.manager = live.manager;
}

Broadcast.prototype = {
    init() {
        this.manager.render('localVideo').in('#broadcast', this.manager.MODE_PREPEND);

        //this._fixMobileVideScreenSize();

        SquirrelLive.init(function() {
            // callback when streaming has started.
            this.startPublish();
        }.bind(this));

        $('#postLive textarea').focus();
        $('.video-viewers-btn').hide();
        $('.video-timer').hide();
        $('#stop_publish_button').hide();

        $('body').removeClass('android-keyboard-fix');

        $('.comment-compose img').attr('src', get_avatar_url(member.avatar, member.id, 'p100x100'));
        $('.comment-compose img').attr('alt', member.first_name +' '+ member.last_name);

        $('.broadcast-preloader').hide();
    },

    unregister() {
        if (SquirrelLive.isPublishing()) {
            SquirrelLive.stop(this.live.streamId);
            location.reload();
        }

        if (this.live.postId) {
            this.setPostInVisible();
        }
    },

    setPostVisible() {
        $.post(urlFrom('broadcast/setPostVisible'), {
            postId: this.live.postId
        });
    },

    setPostInVisible() {
        $.post(urlFrom('broadcast/setPostInvisible'), {
            postId: this.live.postId,
            saveStream: this.live.saveStream
        });
    },

    showInProgressMessage() {
        $('#start_publish_button').attr("disabled", true);
        $('#message-in-progress').show();
    },

    hideInProgressMessage() {
        $('#start_publish_button').attr("disabled", false);
        $('#message-in-progress').hide();
    },

    createPostAfter() {
        if (this.live.streamId) {
            return;
        }

        this.showInProgressMessage();

        return this.createStream().then(response => {
            if (! response.success) {
                return showGenericError();
            }

            SquirrelLive.start(response.streamId);
        }).fail(showGenericError);
    },

    startPublish() {
        $('#stop_publish_button').show();
        $('.video-viewers-btn').show();
        this.startComments();
        this.hideInProgressMessage();
        this._timer();

        setTimeout(() => {
            this.setPostVisible();
        }, 3000);
    },

    stopPublish() {
        // SquirrelLive.stop(this.streamId);
        window.location = community.id + "#engage/" + this.live.channel.slug;
        location.reload();
    },

    createStream() {
        return $.post(urlFrom('broadcast/createStream'), {
            postId: this.live.postId
        }).then((response) => {
            if (! this.live.streamId && response) {
                this.live.streamId = response.streamId
            }

            return response;
        }).fail(showNetworkError);
    },

    stopStreaming(event) {
        event.preventDefault();
        event.stopPropagation();

        const _this = this;
        return $.confirm({
            title: translate("Finishing broadcasting"),
            content: translate("Do you want to post this video?"),
            buttons: {
                ok: {
                    text: translate("Yes"),
                    action: function() {
                        showMessage(translate("Your video is processing. You will be notified when it is available!"));
                        _this.live.saveStream = 1;
                        _this.stopPublish();
                    }
                },
                close: {
                    text: translate("No"),
                    action: function() {
                        _this.stopPublish();
                    }
                },
                cancel: {
                    text: translate("Cancel"),
                }
            }
        });
    },

    startComments() {
        $('#postLive textarea').attr('disabled', false).val('');
        $('#postLive button[type="submit"]').attr('disabled', false).find('i.spinner').addClass('hidden');
        $('#start_publish_button').hide();
        $('#cancel_publish_button').hide();
        $('#streaming_button_footer').hide();
        $('.cmntBxMain').attr('placeholder', translate('Write a comment...'));
        $('#send_comment_button').show();
        $('.btnBlk').css('display', 'flex');
        $('#video_header .left_info').css('visibility', 'visible');
        $('#stream_comments').show();

        // fix to set proper height
        this.live.fixChatHeight();
    },

    closeStreaming(event) {
        event.preventDefault();
        this.stopPublish();
    },

    _timer() {
        $('.video-cancel-btn').hide();
        $('.video-timer').show();

        let outTimer = document.querySelector('.video-timer span.time');

        setInterval(function () {
            this.live.total_time += 1;
            let hours = Math.floor(this.live.total_time / 3600),
                minutes = Math.floor(this.live.total_time / 60) % 60,
                seconds = Math.floor(this.live.total_time) % 60;

            if (hours < 10) hours = '0' + hours;
            if (minutes < 10) minutes = '0' + minutes;
            if (seconds < 10) seconds = '0' + seconds;

            outTimer.innerHTML = hours + ':' + minutes + ':' + seconds;
        }.bind(this), 1000);
    },
}

function BroadcastView(live) {
    this.live  = live;
    this.manager = live.manager;
}

BroadcastView.prototype = {
    init() {
        const {ANT_MEDIA_SERVER} = window.app.constants;
        const parentId = this.live.id;

        // fix to set proper height
        this.live.fixChatHeight();

        $.post(urlFrom('broadcast/getStream'), {
            postId: parentId
        }).then((response) => {
            const streamId = response.stream.streamId;
            const channelId = response.channelId;
            const broadcasterName = response.memberName;
            const broadcasterAvatar = response.memberAvatar;
            const contentTypeOrder = isMobile() ? 'webrtc,hls' : 'hls,webrtc';

            $('#stream_comments')
                .append(this.live.processMessage(response.post));

            $.post(urlFrom(`engage/replies/${ channelId }/${ parentId }`)).then(response => {
                $('#stream_comments')
                    .append(this.live.loadMessages(response.posts))
                    .animate({ scrollTop: $('#stream_comments').height() + 5 }, 500);
            });

            this.manager.render('remoteVideo', {
                source: `//${ANT_MEDIA_SERVER}/play.html?name=${streamId}&playOrder=${contentTypeOrder}`,
                broadcasterName: broadcasterName,
                broadcasterAvatar: broadcasterAvatar
            }).in('#broadcast', this.manager.MODE_PREPEND);

            $('.comment-compose img').attr('src', get_avatar_url(member.avatar, member.id, 'p100x100'));
            $('.comment-compose img').attr('alt', member.first_name +' '+ member.last_name);

            this.live._loadViewers(parentId, $('.video-viewers-popup'));

            $('.broadcast-preloader').hide();

            $('#send_comment_button').attr('disabled',false);
            $('#send_comment_textarea').attr('disabled',false);
        }).fail(() => {
            this.manager.render('notAvailable', {
                source: null
            }).in('#broadcast', this.manager.MODE_PREPEND);

            $('.comment-compose img').attr('src', get_avatar_url(member.avatar, member.id, 'p100x100'));
            $('.comment-compose img').attr('alt', member.first_name +' '+ member.last_name);

            $('.broadcast-preloader').hide();
        });
    },

    unregister() {
        $.post(urlFrom('broadcast/leave'), {
            postId: this.live.id
        });
    },

    closeStreaming(event) {
        event.preventDefault();
        window.location = community.id + "#engage/" + this.live.channel.slug;
    },

    autoDeletePost(postId) {
        if (postId != this.live.id) {
            return;
        }

        $('.live').hide();

        showMessage(translate("This live broadcast has ended"), 10000);
    }
}
