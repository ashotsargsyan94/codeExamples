"use strict";

/******************************************
 ***** TIMELINE THEME
 ******************************************/

/**
 * @param {Engage} engage
 */
function Timeline(engage) {
    this.engage  = engage;
    this.manager = engage.manager;
}

Timeline.prototype = {
    init() {
        this.addCommunityDropdownToSharePopup();
    },
    addCommunityDropdownToSharePopup() {
        if ($('#share-community-dropdown').length > 0) {
            return;
        }

        this.manager.render('communityDropdown', {
            dropdownId: 'share-community-dropdown',
            defaultCommunityId: window.community.id || 1
        }).in('.share-community-dropdown-container', this.manager.MODE_APPEND);
    },
    singlePostTemplate(postData) {
        return postData.parent_id ? 'comment' : 'post';
    },

    postDateForSorting(postData) {
        return postData.updated_at;
    },

    autoLoadPost(post) {
        if (post.muted) {
            return;
        }

        if (! post.parent_id) {
            this.engage.addSinglePostAndPreventScroll('#engage .cmntLst', post, this.manager.MODE_PREPEND);
        } else {
            const $parentPost = this.engage.getPostRef(post.parent_id);
            const $levelRoot = $parentPost.find('> .postCmnt.responses.comments');

            if ($parentPost.data('repliesLoaded')) {
                const $post = this.engage.addSinglePostAndPreventScroll($levelRoot, post, this.manager.MODE_APPEND);

                // Move reply box
                const activeElement = document.activeElement;
                $levelRoot.find('> .leavCmnt.topReply').insertAfter($post);
                activeElement.focus();
            }

            this.engage._updateRepliesCounter($parentPost, +1);

            $parentPost.add(this.engage.getPostRef(post.root_id))
                .find('.view-comments:first').addClass('highlighted');
        }

        if (post.shared_post && member.id == post.creator_id) {
            window.scrollTo(0, 0);
        }
    },

    applyCommunityPrefix($post, data) {
        const communityPrefix = this.manager.render('communityPrefix', {
            id: data.community.id,
            name: data.community.name,
            short_name: data.community.short_name,
            logo: data.community.logo
        }).html();

        $post.prepend(communityPrefix);
    },

    displayChannelInfo($post) {
        $post.find('.channelBtn').removeClass('hidden');
    },

    autoDeletePost($post) {
        this.engage._updateRepliesCounter($post.parents('.postBlk:first'), -1);

        $post.remove();
    },

    showReactionsCount(reactions) {
        return reactions.length > 0;
    },

    insertGif($form, attribute) {
        $form.next(".new_Post").append(/* template */`
            <div class="image"><img src="${ attribute }">
                <div><i class="fas fa-trash del_pic"></i></div>
            </div>
        `);
    },

    emojiButton($post) {
        return $post.find('.emotiThumb:first svg.dropBtn');
    },

    newPostPopupOpened() {
        return $('.popup[data-popup="new-post"]').is(':visible');
    },

    rootEmojiContainer() {
        return this.newPostPopupOpened() ?
            $('.popup-content-container .dropDown.addMedia') : $('.postMedia .txtBoxOut .dropDown.addMedia');
    },

    postInputBox() {
        return this.newPostPopupOpened() ?
            $('.popup-content-container textarea') : $('.postMedia textarea:first');
    },

    autoUpdateViewers(viewerId, postIds) {
        postIds.forEach(postId => {
            const $post = this.engage.getPostRef(postId).removeData('viewers');

            if (viewerId != $post.data('member-id')) {
                let postType = this.engage.getPostType($post);
                let $counter;

                if (postType === 'post') {
                    $counter = $post.find('.post-stats:first .viewed_pop_btn .cmntCnt');
                } else {
                    $counter = $post.find('._footer:first .viewed_pop_btn .cmntCnt');
                }

                this.engage._updateCounter($counter, 1, postType);

                $counter.siblings('em').remove();
            }
        });
    },

    isHighlightable() {
        return true; // All posts are highlightable in timeline theme
    },

    windowScrolled() {
        if (this.engage.loadingMore || this.engage.bottomReached) {
            return;
        }

        const scrolled = $(window).scrollTop() + $(window).height();
        const triggerScroll = $(document).height() - 200;
        const maxPostDate = $('#engage .cmntLst:first > .postBlk:last').data('updated_at');

        if (maxPostDate && scrolled > triggerScroll) {
            this.engage.loadMore(maxPostDate);
        }
    },
};


/******************************************
 ***** CHAT THEME
 ******************************************/

/**
 * @param {Engage} engage
 */
function Chat(engage) {
    this.engage  = engage;
    this.manager = engage.manager;
}

Chat.prototype = {
    init() {
        if (window.isNative) {
            window.PullRefresh.setPassive(true);
        }

        // Hide back button for chat view in channels
        if (mainData.channel.type !== 'Direct')  {
            $('#engage .back-btn').addClass('hidden');
        }

        this.commentList = $('.scrollbar.cmntLst');

        this.chatBox = this.commentList.scroll(() => this.windowScrolled()).get(0);
        this.viewers = {};
        this.firstMessageId = null;
        this.scrollTimeoutId = 0;

        this.initSeenAvatars();
    },

    unregister() {
        if (window.isNative) {
            window.PullRefresh.setPassive(false);
        }
    },

    loadData() {
        $('#engage .cmntLst .posts').each((_, post) => this.addSeenAvatars($(post)));

        if ($('.postBlk .scroll-to-post:first').length > 0) {
            $('.postBlk .scroll-to-post:first')[0].scrollIntoView();
        } else if($('.postBlk .highlighted:first').length > 0) {
            $('.postBlk .highlighted:first')[0].scrollIntoView();
        }
    },

    beforeAddContent(posts) {
        if (this.engage.bottomReached && posts.length > 0) {
            //store the very first message's id so we can add a day header above it.
            this.firstMessageId = posts[posts.length - 1].id;
        }
    },

    afterAddContent(posts) {
        if (posts.length === 0) {
            return;
        }

        const firstPost = posts[posts.length - 1];

        const commentList = $('.chat.cmntLst');

        const divider = commentList.find('.divider.sticky')

        if (divider.length) {
            divider.remove();
        }

        commentList.prepend(`
            <div class="divider sticky">
                <span id="date-label" style="opacity: 0;">${firstPost.created_at}</span>
            </div>
        `);
    },

    postDateForSorting(postData) {
        return postData.created_at;
    },

    singlePostTemplate(postData) {
        return postData.memberType === 'gnome' ? 'themeChatInfoMessage' : 'themeChatBubble';
    },

    singlePostInsertMode(originalMode) {
        if (originalMode === this.manager.MODE_REPLACE) {
            return originalMode;
        }

        return originalMode === this.manager.MODE_PREPEND
            ? this.manager.MODE_APPEND
            : this.manager.MODE_PREPEND;
    },

    postCreated() {
        $('.chatInput').focus();
    },

    postEdited($post) {
        $post[0].scrollIntoView();
    },

    addSinglePost(mode, postData) {
        this.applyGrouping(mode, postData);
        this.applyDayHeader(mode, postData);
    },

    afterAddSinglePost($post, postId) {
        if (this.engage.highlightPost === postId) {
            // the post clicked on in the notification may not be new or may be in the middle of the blue ones.
            // this class allows us to scroll directly to it.
            $post.addClass('scroll-to-post');
        }
    },

    afterCreatePost($form) {
        $('.repliedToContent').empty().hide();
        $('.new_Post').html('');
        $('.chatInput').val('');
        $('.chatCreatePost textarea').val('').attr('style', ''); // Reset height, mostly.

        $form.find('input.attach').remove();
        $form.find('.url-preview').remove();
        $form.find('.new_Post').empty();
        $form.find('.files-container').empty();
    },

    quoteMessage($post) {
        const $postContent = $post.find('.post');

        this.engage.closeDropdown();

        $postContent.closest('.chatBlk').find('.repliedToContent').empty().show().html(
            `<div class="parentPost" data-post-id="${ $postContent.closest('.postBlk').data('post-id') }">
                        <strong>${ $postContent.data('membername') }</strong>
                        <br />
                        ${ $postContent.html() }
                        <i class="fas fa-times" onclick="$(this).closest('.repliedToContent').empty().hide()"></i>
                    </div>`
        );
    },

    autoLoadPost(post) {
        this.engage.addSinglePostAndPreventScroll('#engage .cmntLst', post, this.manager.MODE_PREPEND);
    },

    autoDeletePost($post) {
        if ($post.next().length === 0 && $post.prev().hasClass('date-header')) {
            $post.prev().remove();
        }
        $post.remove();
    },

    showReactionsCount() {
        return false;
    },

    showMediaPopup() {
        $('.go_live').addClass('hidden');
    },

    insertGif($form, attribute) {
        $form.next(".new_Post").append(generateGifBoxTemplate(attribute));
    },

    emojiButton($post) {
        return $post.find('.emotiThumb:last svg.dropBtn');
    },

    rootEmojiContainer() {
        return $('.postMedia .chatCreatePost');
    },

    postInputBox() {
        return $('.postMedia textarea.chatInput');
    },

    autoUpdateViewers(viewerId, postIds, memberAvatar) {
        let maxPostId = Math.max(...postIds);
        let $isViewerAdded = this.viewers.hasOwnProperty(viewerId);

        this.viewers[viewerId] = this.viewers[viewerId] || {};

        if ($isViewerAdded) {
            this.viewers[viewerId].messageId = maxPostId;
        } else {
            let oldPost = this.viewers[viewerId].messageId;
            this.viewers[viewerId] = {messageId: maxPostId, memberAvatar: memberAvatar};

            // remove viewer from old post
            this.addSeenAvatars($(`#engage .cmntLst .posts[data-post-id=${oldPost}]`));
        }

        this.addSeenAvatars($(`#engage .cmntLst .posts[data-post-id=${maxPostId}]`));
    },

    /**
     * Callback to trigger when the chat window scrolls
     * Updates and displays the floating date label with the date from the date header/message
     * that is visible at top of the comment list element
     */
    // TODO Call this method in some kind of debounce or throttle?
    windowScrolled() {
        //solution for current post not staying in viewport when user scrolls up to top chatbox
        if (this.chatBox.scrollTop == 0) {
            this.chatBox.scrollTop = 1;
        }

        const commentList = this.commentList;

        let currentLabel = null;
        const topLabel = $('#date-label');

        // Find the date-header or message closest to the date-label that is
        // still visible in the viewport of the cmntLst (offsetVal > 0)
        const closest = commentList.find('.date-header, .bubble')
            .filter(function () {
                const el = $(this);
                const offsetVal = (el.offset().top - commentList.offset().top) + el.height();
                return offsetVal > 0;
            })
            .first();

        // Take the first element and get the date value
        // If we get the date from the post data then we need to format it from UTC to local time
        if (closest.is('.bubble')) {
            const localTime = moment.utc(closest.data('created_at')).local().format('YYYY-MM-DD');
            currentLabel = this.getDayHeaderTitle(localTime);
        } else {
            currentLabel = closest.text();
        }

        // Update the date value if it is different
        if (currentLabel) {
            topLabel.css('opacity', 1);
            topLabel.text(currentLabel);

            // Clear the timeout to restart the timer for the date-label
            if (this.scrollTimeoutId) {
                clearTimeout(this.scrollTimeoutId);
            }
            // Hide the date-label after 3 seconds of being displayed
            this.scrollTimeoutId = setTimeout(() => {
                topLabel.css('opacity', 0);
            }, 3000)
        }

        const canLoadMore = ! this.engage.loadingMore && ! this.engage.bottomReached;
        const maxPostDate = commentList.find('.bubble:first').data('updated_at');

        if (canLoadMore && maxPostDate && this.chatBox.scrollTop < 150) {
            this.engage.loadMore(maxPostDate).then(() => this.windowScrolled(commentList));
        }
    },

    afterAddSinglePost() {
        const scrolled = this.chatBox.scrollHeight - (this.chatBox.scrollTop + this.chatBox.offsetHeight);

        let messages = $('.postBlk.bubble');
        let messagesCount = $('.postBlk.bubble').length;

        if (messagesCount > 2) {
            let penultimateScrolled = this.chatBox.scrollHeight - messages[messagesCount - 2].offsetTop + messages[messagesCount - 2].offsetHeight;

            if (scrolled <= penultimateScrolled) {
                this.chatBox.scrollTop = this.chatBox.scrollHeight;
            }
        }
    },

    isInfoMessage(postData) {
        return postData && postData.memberType === 'gnome';
    },

    isHighlightable(postData) {
        return ! this.isInfoMessage(postData);
    },

    /**
     * CHAT
     */
    applyGrouping(mode, postData) {
        const minutesTilReset = 5;

        // a pre-existing post being prepended into the top.
        if (mode === this.manager.MODE_PREPEND) {
            // todo: rewite this to be based on this post, not the next post. it's confusing.

            let nextPost = $('#engage .posts:first');

            if (!nextPost.length) {
                return;
            }

            let minutesBetweenMessages = minutes_between(nextPost.data('created_at'), postData.created_at);

            if (postData.creator_id !== nextPost.data('memberId')) {
                nextPost.addClass('include-group-header pt-0');
            } else if (this.isInfoMessage(postData)) {
                // an info message with an info message after it. no reason to do anything
                return;
            } else if (minutesBetweenMessages >= minutesTilReset) {
                nextPost.addClass('include-group-header').addClass('pt-0');
            } else {
                nextPost.removeClass('include-group-header pt-0');
            }

            return;
        }

        /**
         * A new or edited message.
         */

        if (this.isInfoMessage(postData)) {
            return;
        }

        let $previousPost;

        if (mode === this.manager.MODE_REPLACE) {
            let $currentPost = $(`#engage .posts[data-post-id='${postData.id}']`);
            $previousPost = $currentPost.prev('#engage .posts');
        } else {
            $previousPost = $('#engage .posts:last');
        }

        let minutesBetweenMessages = minutes_between($previousPost.data('created_at'), postData.created_at);

        if (postData.creator_id !== $previousPost.data('memberId')) {
            postData.includeGroupHeader = true;
        } else if (minutesBetweenMessages >= minutesTilReset) {
            postData.includeGroupHeader = true;
        } else {
            postData.includeGroupHeader = false;
        }
    },

    getDayHeaderTitle(date) {
        // moment translates the days of the week, but Today and yesterday must be done manually.
        const dictionary = {
            sameDay: '[' + translate('Today') + ']',
            lastDay: '[' + translate('Yesterday') + ']',
            lastWeek: 'dddd',
            sameElse: 'MMM DD, YYYY'
        };

        return moment(date).locale(window.locale).calendar(dictionary);
    },

    getDayHeaderTemplate(date) {
        return /* template */`
            <p class="date-header" data-date="date">${ this.getDayHeaderTitle(date) }</p>
        `;
    },

    /**
     * Adds a day header above a post if it's a new day
     * @param {string} mode
     * @param {object} postData
     */
    applyDayHeader(mode, postData) {
        if (mode === this.manager.MODE_REPLACE) {
            return;
        } else if (mode === this.manager.MODE_PREPEND) {
            let nextPost = $('#engage .posts:first');
            let nextDate = moment.utc(nextPost.data('created_at')).local().format('YYYY-MM-DD');
            let date = moment.utc(postData.created_at).local().format('YYYY-MM-DD');

            if (date !== nextDate) {
                nextPost.parent().prepend( this.getDayHeaderTemplate(nextDate) );
            } else if (postData.id == this.firstMessageId) {
                setTimeout(() => {
                    // delay it slightly so the first post gets added to the dom first.
                    $('.cmntLst:first').prepend( this.getDayHeaderTemplate(date) );
                }, 100);
            }

            return;
        }

        // new post being added
        let prevPost = $('#engage .posts:last');

        //convert the date to local time
        let prevDate = moment.utc(prevPost.data('created_at')).local().format('YYYY-MM-DD');
        let date = moment.utc(postData.created_at).local().format('YYYY-MM-DD');

        if (prevDate !== date) {
            prevPost.parent().append( this.getDayHeaderTemplate(date) );
        }
    },

    initSeenAvatars() {
        const channelSlug = mainData.channel.slug;

        $.post(urlFrom(`channels/viewersProgress/${ channelSlug }`)).then(response => {
            this.viewers = response.viewers;
            this.loadData();
        });
    },

    addSeenAvatars($post) {
        let data = $post.data();

        if (!data || this.isInfoMessage(data)) {
            return;
        }

        let maxAvatars = 3;
        let $postViewers = Object.fromEntries(Object.entries(this.viewers).filter(([key, value]) => value.messageId == data.postId));
        let $postSeenList = $post.find('.seen-list ul');

        $postSeenList.empty();

        let i = 0;

        for (const [id, viewer] of Object.entries($postViewers)) {
            //first off, hide any existing seen avatars for that user.
            $(`.seen-list li[data-member_id='${id}']`).remove();

            if (i++ < maxAvatars) {
                $postSeenList.append(/* template */`
                    <li data-member_id="${id}">
                        <div class="ico">
                            <img src="${ viewer.memberAvatar }" alt="avatar">
                        </div>
                    </li>
                `);
            } else {
                if (maxAvatars < Object.entries($postViewers).length) {
                    $postSeenList.append(/* template */`
                        <li>
                            <div class="ico-more">+${Object.entries($postViewers).length - maxAvatars}</div>
                        </li>
                    `);
                }

                break;
            }
        }

        if ($postSeenList.length) {
            $postSeenList.parent().removeClass('hidden');
        } else {
            $postSeenList.parent().addClass('hidden');
        }
    },
};

/******************************************
 ***** VIDEO THEME
 ******************************************/

/**
 * @param {Engage} engage
 */
function Video(engage) {
    this.engage = engage;
    this.manager = engage.manager;
}

Video.prototype = {
    singlePostTemplate() {
        return 'themeVideoPost';
    },

    attachmentVideoTemplate() {
        return 'themeVideoAttachment';
    },

    addPostDataToAttachment(attachment, post) {
        attachment.memberAvatar = post.memberAvatar;
        attachment.memberName   = post.memberName;
        attachment.postId       = post.id;
        attachment.body         = post.body;
    },

    windowScrolled() {
        if (this.engage.loadingMore || this.engage.bottomReached) {
            return;
        }

        const scrolled = $(window).scrollTop() + $(window).height();
        const triggerScroll = $(document).height() - 200;
        const maxPostDate = $('#engage .cmntLst:first > .postBlk:last').data('updated_at');

        if (maxPostDate && scrolled > triggerScroll) {
            this.engage.loadMore(maxPostDate);
        }
    },
};
