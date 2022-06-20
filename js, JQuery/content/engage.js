"use strict";

/**
 * Engage handles the following hash uris:
 *      #engage/<slug>              Stream, Channels, Directs
 *      #engage/<slug>/<messageId>  Stream, Channels, Directs, with message to highlight
 *      #engage/channel/<slug>      Alias for #engage/<slug>
 *      #engage/post/<postId>       Single-post view
 *      #engage/member/<memberId>   Member posts
 */
 class Engage {
    /**
     * @param {ContentManager} manager
     * @param {string} type
     * @param {string} id
     * @param {string} highlight
     */
    constructor(manager, type, id, highlight = null) {
        this.manager = manager;
        this.type = type;
        this.id   = id;
        this.highlightPost = highlight;

        this.isDashboard = window.community.id === null;

        this.initState();
        this.setTheme();

        $('#appLd').data('EngageObject', this);
    }

    /**
     * Initialize properties to their initial/default state
     */
    initState() {
        this.viewsReportQueue = {}; // Initialize queue of views pending report

        this.emojiPopup = this.manager.render('emojiPopup').fetch();
        this.emojiGifPopup = this.manager.render('emojiGifPopup').fetch();
        this.searchGifDebounce = null;

        this.members = [];

        this.masked = (localStorage.getItem("masked") === 'true');

        this.loadDataXHR = null;

        this.drafts = [];
    }

    /**
     * Bootstrap the engage page
     */
    bootstrap() {
        this.clearContent();

        if (this.type !== 'channel') {
            $('#engage .postForm').remove();
        }

        $('#page-title-header').toggleClass('isDashboard', this.isDashboard);
        $('.channelSettings').toggleClass('hidden', this.isDashboard);
        $('.searchByMember').toggleClass('hidden', this.type !== 'channel');
        $('.searchByMemberFilter').toggleClass('hidden', this.type !== 'channel');
        $('.engageBackBtn').toggleClass('hidden', this.widget !== 'gallery');
    }

    /**
     * Set handler for theme hooks
     */
    setTheme() {
        // Set theme hooks handler
        this.theme = (this.type === 'channel' && mainData.channel.theme) || 'timeline';

        switch (this.theme) {
            case 'chat':
                this.themeHandler = new Chat(this);
                break;
            case 'video':
                this.themeHandler = new Video(this);
                break;
            default:
                this.themeHandler = new Timeline(this);
                break;
        }
    }

    profileWidget(profile) {
        this.widget = 'profile';
        this.profile = profile;

        this.init();
        this.initialized();
    }

    galleryWidget() {
        this.widget = 'gallery';

        this.init();
    }

    themeHook(hook, ...args) {
        if (this.themeHandler && this.themeHandler[hook]) {
            return this.themeHandler[hook](...args);
        }
    }

    init() {
        this.bootstrap();

        // set Direct by default masked for admin if channel is masked
        if (member.isCommunityAdmin) {
            this.masked = mainData.channel.masked == 1;
            localStorage.setItem('masked', this.masked);
        }

        this.loadData().then(({ posts, root }) => {
            if (this.highlightPost) {
                this.loadHighlightedPost();
            } else if (this.type === 'post') {
                if (root) {
                    this._navigateToReply(posts[0]);
                } else {
                    const $post = this.getPostRef(posts[0].id);

                    this.toggleViewComments($post)
                        .then(() => this.scrollToElement($post));
                }

                setPageTitle(
                    possessiveForm(posts[0].memberName, root ? translate('reply') : translate('post')),
                    community.name
                );
            }

            this._getDraft(0, null, true);

            this.refreshPostForm();
        });

        this.themeHook('init');
    }

    async loadHighlightedPost() {
        if (this.theme !== 'timeline') {
            return; // Not yet implemented
        }

        const $post = this.getPostRef(this.highlightPost);

        if ($post.length) { // Post is already loaded, just promote it to the top
            $post.insertBefore('.posts:first');
        } else {
            await this.loadPost(this.highlightPost).then(({ posts, root }) => {
                if (root) {
                    this._navigateToReply(posts[0]);
                }
            });
        }

        this.scrollToElement($('.postForm'));
    }

    initialized() {
        this.resetAlertsTimeout = setTimeout(() => this.resetAlerts(), 30000);
        this.logViewsInterval = setInterval(() => this.logViews(), 500);

        this.pusherEventHandlers = {
            'new.comment.squirrel': this.autoLoadPost.bind(this),
            'deleted.comment.squirrel': this.autoDeletePost.bind(this),
            'updated.comment.squirrel': this.autoUpdatePost.bind(this),
            'viewers.comment.squirrel' : this.autoUpdateViewers.bind(this),
        }

        for (event in this.pusherEventHandlers) {
            pusherManager.on(event, this.pusherEventHandlers[event]);
        }

        $('#engage').on('open.sidebar.squirrel', () => {
            $('body > header > div > div.proIco').click();
        });

        if (community._additionalInfoRequired) {
            new AdditionalInfo(this.manager).showAdditionalDataPopup(community);
        }
    }

    unregister() {
        clearTimeout(this.resetAlertsTimeout);
        clearInterval(this.logViewsInterval);

        for (event in this.pusherEventHandlers) {
            pusherManager.off(event, this.pusherEventHandlers[event]);
        }

        this.themeHook('unregister');
    }

    sendViewsReport() {
        const queue = Object.values(this.viewsReportQueue);

        if (! queue.length || this.processingViewsReport || throttled('engage', 5000)) {
            return;
        }

        this.processingViewsReport = true;

        $.post(urlFrom('comment_viewers/report'), { queue }).then(() => {
            queue.forEach(({ postId }) => delete(this.viewsReportQueue[postId]))
        }).always(() => this.processingViewsReport = false);
    }

    _localSave(message, parentId) {
        if (message.length > 3) {
            let drafts = JSON.parse(localStorage.getItem("drafts")) || [];

            const draftExist = this._draftExist(drafts, parentId);

            if (draftExist == -1) {
                drafts.push({
                    parentId: parentId,
                    message: message,
                    channelId: mainData.channel.id || 0
                });
            } else {
                drafts[draftExist].message = message;
            }

            localStorage.setItem("drafts", JSON.stringify(drafts));
        }
    }

    _draftExist(drafts, parentId) {
        if (mainData.channel.id) {
            return drafts.findIndex(item => (item.parentId == parentId && item.channelId == mainData.channel.id));
        } else {
            return drafts.findIndex(item => (item.parentId == parentId));
        }
    }

    _populateDraft(parentId, message) {
        parentId = (typeof parentId == 'undefined') ? 0 : parentId;

        const draftExist = this._draftExist(this.drafts, parentId);

        if (message.length > 3) {
            if (draftExist == -1) {
                this.drafts.push({parentId: parentId, message: message});
            } else {
                this.drafts[draftExist].message = message;
            }
        } else {
            if (draftExist > -1) {
                this.drafts.splice(draftExist, 1);
                this._removeFromDraft(parentId, false);
            }
        }
    }

    _removeFromDraft(parentId, toSplice = true) {
        if (toSplice) {
            const draftExist = this._draftExist(this.drafts, parentId);

            if (draftExist > -1) {
                this.drafts.splice(draftExist, 1);
            }
        }

        $.post(urlFrom('drafts/delete'), {channelId: mainData.channel.id, parentId: parentId});

        // delete locally
        let drafts = JSON.parse(localStorage.getItem("drafts")) || [];

        const draftExistLocal = this._draftExist(drafts, parentId);

        if (draftExistLocal != -1) {
            drafts.splice(draftExistLocal, 1);
            localStorage.setItem("drafts", JSON.stringify(drafts));
        }
    }

    _getDraft(parentId, $target, needSet) {
        let drafts = JSON.parse(localStorage.getItem("drafts")) || [];

        const draftExist = this._draftExist(drafts, parentId);

        if (draftExist > -1) {
            if (needSet) {
                this._setValue(parentId, $target, drafts[draftExist].message, 300);
            } else {
                return drafts[draftExist].message;
            }
        }
    }

    _setValue(parentId, $target, value, timeout) {
        setTimeout(function(){
            if (parentId == 0) {
                $target = $('.writePost textarea');
                $target.val(value);
                $('.writePost .bTn .sndBtn.cnclBtn, .writePost button.cancelButton').show();
                $target.trigger('keyup');
                $target[0].style.height = $target[0].scrollHeight + 10 + 'px';
                $target.focus();

            } else {
                $target.val(value);
                $target.parents('form.frmCmnt:first').addClass('expndHT');
                $target.focus();
            }
        }, timeout);
    }

    clearContent() {
        $('#engage .cmntLst').empty();
    }

    refreshPostForm() {
        if (! $('#engage .postForm, .popup .postForm').length) {
            return;
        }

        const data = this.getMaskData({avatarClickable: member.isCommunityAdmin ? 'clickable' : ''});

        let postForm = this.manager.render('postForm', data, true).fetch();
        $('.postForm').html(postForm);
        $('.popup[data-popup="new-post"] .writePost').replaceWith(postForm.clone());

        let postDraft = JSON.parse(localStorage.getItem('newPostDraft'));
        if (postDraft !== null && postDraft.hasOwnProperty('text')) {
            $('.postForm .txtBox').val(postDraft.text);
        }
    }

    loadData(type, id, maxPostDate = null) {
        id = id || this.id;
        type = type || this.type;

        const tab = $('#engage li.active .fi-user-alt').length ? 'me' : 'others';
        const feedUrl = urlFrom(`engage/feed`);
        const channelUrl = urlFrom(`engage/${ type }/${ id }`);
        const dashboardSubpageURLS = ['recentPosts'];
        const memberIds = $('.searchByMemberFilter').first().find('[name="store[]"]').map((_, store) => store.value).get();

        // todo conditionally use feed url once we have the community null dashboard routing working.
        const url = this.isDashboard && !dashboardSubpageURLS.includes(type) && this.type === 'channel' ? feedUrl : channelUrl;

        this.loadDataXHR && this.loadDataXHR.abort();
        this.loadDataXHR = $.post(url, {maxPostDate, tab, memberIds});

        return this.loadDataXHR.then(response => {
            if (this.bottomReached = response.lastBatch) {
                $("#cmntLoader").fadeOut();
            }

            $('#getVideoConferenceLink').data('channel-id', response.channelId);

            const posts = response.root ? [response.root] : response.posts;

            this.addContent('#engage .cmntLst', posts, this.manager.MODE_APPEND);

            this.themeHook('initSeenAvatars');

            return response;
        }).fail(response => {
            if (response.status == 404) {
                handleInvalidChannelUri();
            }
        });
    }

    loadSubComments($parent) {
        if ($parent.data('repliesLoaded')) {
            return Promise.resolve();
        }

        $parent.data('repliesLoaded', true);

        const $replyBox = $parent.find('.postCmnt:first');
        const communityId = $parent.data('community-id');
        const channelId = $parent.data('channel');
        const parentId  = $parent.data('post-id');
        const $loader = $parent.find('.postCmnt:first .repliesLoader');

        this._getDraft(parentId, $replyBox.find('.leavCmnt.topReply:last').find('textarea.txtBox'), true);

        if (this._repliesCount($parent) > 0) {
            setTimeout(() => $loader.removeClass('hidden'), 200);
        }

        return $.post(
                urlFrom(`engage/replies/${ channelId }/${ parentId }`),
                {communityId: communityId}
        ).then(response => {
            const loadedReplies = response.posts.length;
            const actualReplies = parseInt($parent.find('.view-comments:first .cmntCnt').html());

            $loader.remove();

            this.addContent($parent.find('.postCmnt:first'), response.posts, this.manager.MODE_PREPEND);

            if (loadedReplies < actualReplies && $replyBox.find('> .alertMsg').length === 0) {
                $replyBox.prepend($('<div />', {
                    class: 'alertMsg mb-10',
                    text: translate('Comments of non-connections are hidden')
                }));
            }

            // Add emoji list to post comment box
            $parent.find('.postCmnt:first .emojiLst').append(
                this.manager.render('emojis').fetch().find('.emojiLst').html()
            );
        }).fail(showNetworkError).catch(() => $parent.data('repliesLoaded', false));
    }

    getPostRef(postId) {
        return $(`.postData[data-post-id='${postId}']`);
    }

    isCurrentChannel(channelId) {
        if (mainData.channel.id == channelId) {
            return true;
        }

        const channel = member.channelsNotified.find(channel => channel.slug === this.id);

        return channel && channel.id == channelId;
    }

    _skipAutoLoadPost(memberId, channelId, isUnhidden, isShared) {
        return (this.type === 'channel' && ! this.isCurrentChannel(channelId))
            || (member.id == memberId && ! isUnhidden && ! isShared && this.type !== 'channel');
    }

    autoLoadPost({ memberId, channelId, postId, isUnhidden, isShared, parentId }) {
        if (this._skipAutoLoadPost(memberId, channelId, isUnhidden, isShared, parentId)) {
            return;
        }

        this.loadPost(postId);
    }

    loadPost(postId) {
        let data = {
            theme: this.theme
        };

        return $.post(urlFrom(`engage/post/${postId}`), data).then(response => {
            this.themeHook('autoLoadPost', response.posts[0]);

            return response;
        }).catch($.noop); // Not every post that pusher sends us is visible to current member
    }

    autoUpdatePost({ postId }) {
        const $post = this.getPostRef(postId);

        if ($post.length) {
            $.get(urlFrom(`engage/post/${postId}`)).then(response => {
                if (response.posts.length) {
                    this.addSinglePost($post, response.posts[0], this.manager.MODE_REPLACE);
                }
            }).fail($.noop); // Fail silently?
        }
    }

    autoUpdateViewers({ memberId, postIds, memberAvatar }) {
        this.themeHook('autoUpdateViewers', memberId, postIds, memberAvatar);
    }

    autoDeletePost({ postId }) {
        const $post = this.getPostRef(postId);

        if (! $post.length) {
            return;
        }

        this.themeHook('autoDeletePost', $post);
    }

    // TODO: This should be a temporary workaround to the fact
    // that Safari does not implement the css property
    // overflow-anchor: auto; which keeps the view static even
    // when new content is loaded above the viewport
    // This hack sets the scroll position properly, but due to the limitations
    // of adjusting the scroll position after content is loaded, there is a slight
    // visible jump
    // https://caniuse.com/#feat=css-overflow-anchor
    addSinglePostAndPreventScroll($container, post, mode) {
        const $html = $('html');
        const scrollHeight = $html[0].scrollHeight;
        const scrollTop = $html.scrollTop();

        const $post = this.addSinglePost($container, post, mode);

        const newScrollHeight = $html[0].scrollHeight;
        const newScrollTop = $html.scrollTop();
        // Chrome & Firefox auto compensate, but Safari does not
        // In Safari the scrollTop will not change automatically
        if (scrollTop === newScrollTop) {
            const contentAdjustedScrollPosition = scrollTop + (newScrollHeight - scrollHeight);
            $html.scrollTop(contentAdjustedScrollPosition);
        }

        return $post;
    }

    /**
     * Remove any emoji from the provided post html
     *
     * @param {string} postHtml comment post text
     * @returns {string} postHtml without any emoji
     */
    removeEmoji(postHtml) {
        let emojiMatches = postHtml.match(/<svg[^>]*>([\s\S]*?)<\/svg>/gi);

        if (emojiMatches) {
            let emoji = emojiMatches.filter(image => {
                return image.indexOf("class='smiley'") != -1;
            });

            $(emoji).each(function (index, emoji) {
                postHtml = postHtml.replace(emoji, '');
            });
        }

        return postHtml;
    }

    /**
     * Check if there only 3 or less emoji without text, if it is return true
     *
     * @param {string} postHtml  comment post text
     * @returns boolean
     */
    hasBigEmojis (postHtml) {
        let emojiMatches = postHtml.match(/<svg[^>]*>([\s\S]*?)<\/svg>/gi);

        if (emojiMatches && emojiMatches.length <= 3) {
            let emoji = emojiMatches.filter(image => {
                return image.indexOf("class='smiley'") != -1;
            })

            $(emoji).each(function (index, emoji) {
                postHtml = postHtml.replace(emoji, '');
            })

            // If there only emoji in the post make them bigger
            if (! postHtml.length) {
                return true;
            }
        }

        return false;
    }
    /**
     * Should we display a translate button under the post?
     * @param {object} post
     * @returns boolean
     */
    offerTranslationForPost(post) {
        //Some posts have no text, only an attachment. No need to translate them.
        if (post.html.trim() === '') {
            return false;
        }

        return post.creator_id !== member.id
            && post.language !== null
            && post.language !== window.languageCode;
    }

    /**
     * Get the type of post.
     * @param {object} $post
     * @return {string} the type of message: 'post', 'comment', 'reply'
     */
    getPostType($post) {
        let generationsOfParents = $post.parents('.postCmnt').length;

        switch(generationsOfParents) {
            case 0:
                return 'post';
            case 1:
                return 'comment';
            default:
                return 'reply';
        }
    }

    isAlreadyRendered(post) {
        const $post = $(`#engage .posts[data-post-id="${ post.id }"]`);

        return $post.length > 0;
    }

    /**
     * Add a post to the timeline or elsewhere.
     *
     * @param {jQuery} $container  Either a selector or a jQuery object
     * @param {object} post
     * @param {int} mode           One of the this.manager.MODE_* modes
     * @returns the DOM element containing the new post
     */
    addSinglePost($container, post, mode) {
        if (this.isAlreadyRendered(post) && mode !== this.manager.MODE_REPLACE) {
            return;
        }

        if (post.body === null || post.body === false || post.html === null) {
            console.error('INVALID POST CONTENT: review post content and encryption: ', post);

            return $(); // This shouldn't happen, but it does. We cannot break a whole channel for it
        }

        const data = {
            ...post,
            deletedAccount: post.creator_id === null ? 'deletedAccount' : '',
            memberName: post.memberName || 'Squirrel User',
            isOwnPost: post.creator_id === member.id,
            offerTranslation: this.offerTranslationForPost(post),
            reactionsHTML: this.reactionsHTML(post.reactions),
            hasAttachments : (post.attachments.length > 0),
            attachmentsHTML: this.attachmentsHTML(post.creator_id, post.attachments, post, post.community.id),
            attachmentFilesHTML: this.attachmentFilesHTML(post.creator_id, post.attachments, post.community.id),
            attachmentUrlHTML: this.attachmentUrlHTML(post.creator_id, post.attachments, post.community.id),
            htmlWithoutEmojiLength: this.removeEmoji(post.html).length
        };

        if (post.sharedPost) {
            let sharedPostCommunityId = post.sharedPost.community ? post.sharedPost.community.id : post.community.id;

            data.sharedCommentAttachmentsHtml = {
                'files': this.attachmentsHTML(post.sharedPost.creatorId, post.sharedPost.attachments, post.sharedPost, sharedPostCommunityId),
                'urls': this.attachmentUrlHTML(post.sharedPost.creatorId, post.sharedPost.attachments, sharedPostCommunityId),
                'attachments': this.attachmentFilesHTML(post.sharedPost.creatorId, post.sharedPost.attachments, sharedPostCommunityId),
            }

            // fix to prevent errors for css class logic
            if (typeof post.sharedPost.attachments === 'undefined') {
                post.sharedPost.attachments = [];
            }
        }

        const template = this.themeHook('singlePostTemplate', post);

        mode = this.themeHook('singlePostInsertMode', mode) || mode;

        this.themeHook('addSinglePost', mode, data);

        let $seenList, $seenListContent;

        if (mode === this.manager.MODE_REPLACE) {
            //if there are any seen avatars on the post, store them.
            $seenList = $container.find('.seen-list');
            if ($seenList.length) {
                $seenListContent = $seenList.html();
            }
        }

        const $post = this.manager.render(template, data, true).in($container, mode);

        // if there were seen avatars before the replace, put them back.
        if (mode === this.manager.MODE_REPLACE && $seenListContent) {
            $post.find('.seen-list').removeClass('hidden').html($seenListContent);
        }

        // Link data to new post dom element for future use
        $post.data('text', html_entity_decode(post.body))
            .data('reactions', post.reactions)
            .data('updated_at', this.themeHook('postDateForSorting', post))
            .data('created_at', post.created_at)
            .data('memberId', post.creator_id)
            .data('memberType', post.memberType)
            .data('hasAttachments', post.attachments.length > 0);

        let postType = this.getPostType($post);

        const $replyContainer = $post.find('.replyContainer');

        $replyContainer.append(
            this.manager.render('replyForm', this.getMaskData(this.buildMaskDataArray(post, $post))).fetch()
        );

        if (postType === 'post') {
            $replyContainer.removeClass('hidden');
        }

        if (this.isDashboard && postType === 'post') {
            this.themeHook('applyCommunityPrefix', $post, data);
            this.themeHook('displayChannelInfo', $post);
        }

        const imageThumbs = $post.find('.image.gallery-item .thumb');

        imageThumbs.on('load', function() {
            $(this).siblings('.lq-thumb').hide();
            $(this).css('opacity', 1);
        });

        const lqThumbs = $post.find('.image.gallery-item .lq-thumb');

        lqThumbs.on('load', function() {
            const $this = $(this);
            $this.addClass(($this.width() > $this.height()) ? 'h-100' : 'w-100');
        });

        $('#engage .alertMsg.noPosts').remove();

        $post.toggleClass('notViewed', ! post.viewed);

        this.themeHook('afterAddSinglePost', $post, post.id);

        $post.toggleClass('highlighted', this._isHighlightable(post) && ! post.viewed);
        $post.find('.view-comments').toggleClass('highlighted', post.hasUnreadReplies);

        $post.find('.post-content').toggleClass('big_emojies', this.hasBigEmojis(post.html));

        // Remove reply button for level-3 and beyond
        if (postType === 'reply') {
            $post.find('.reply, .view-comments').remove();
            $post.find('.replyContainer').remove();
        }

        // Remove share button from subcomments
        if (post.parent_id) {
            $post.find('[data-popup="share"]').remove();
        }

        if (mainData.channel.type === 'Direct') {
            $post.find('div.icoBtn.popBtn[data-popup="share"]').remove();
        }

        // Don't let leave comment for broadcast from feed or engage. users need to enter the room
        if (parseInt(post.live) === 1) {
            $post.find('.replyContainer').remove();
        }

        $(document).trigger(`engage.post-${ post.id }.loaded`);

        // init MagnificPopup for preview images
        initMagnificPopup($post.find('.multi[data-gallery], .single[data-gallery]:has(.image.gallery-item)'));

        initVideoJs();

        this.themeHook('afterAddSinglePost');

        return $post;
    }

    buildMaskDataArray(post, $post) {
        let avatarClickable = member.managedCommunities.includes(parseInt(post.community.id));

        return {
            postId: post.id,
            avatarClickable: avatarClickable ? 'clickable' : '',
            maskAvatar: avatarClickable ? post.community.maskAvatar : member.avatar,
            maskName: avatarClickable ? post.community.maskName : (member.first_name + ' ' + member.last_name),
            placeholder: this.getPostType($post) === 'post' ? translate('Write a comment...') : translate('Write a reply...'),
        }
    }

    /**
     * Add content (posts) to the timeline or elsewhere.
     *
     * @param {jQuery} $container  Either a selector or a jQuery object
     * @param {array} posts        A list of objects with post data
     * @param {int} mode           One of the this.manager.MODE_* modes
     */
    async addContent($container, posts, mode) {
        this.themeHook('beforeAddContent', posts);

        if (! posts.length && ! $('.posts.postData, .alertMsg.noPosts').length) {
            $('#appLd #engage .inter.roadMap').append($('<div>', {
                class: 'alertMsg noPosts',
                text: await this.generateNoPostsText()
            }));
        }

        $.each(posts, (_, post) => this.addSinglePost($container, post, mode));

        this.themeHook('afterAddContent', posts);
    }

    async generateNoPostsText () {
        if (this.profile) { // Profile page
            return translate("{{ firstName }} has not made any posts yet.", { firstName: this.profile.firstname });
        }

        let channelMembers = null;

        await $.post(urlFrom('common/searchUsers'), {
            channelSlug: mainData.channel.slug || null
        }).then(({ items }) => {
            channelMembers = items;

            channelMembers.push({
                id: member.id,
                label: member.first_name + ' ' + member.last_name
            });
        });

        let filteredMemberIds = $('.searchByMemberFilter').first().find('[name="store[]"]').map((_, store) => store.value).get();
        let filteredMembersCount = filteredMemberIds.length;
        let endText = mainData.channel && mainData.channel.type == 'Direct' ? ` ${translate('in this conversation')}.` : ` ${translate('in this channel.')}`;

        if (!filteredMembersCount) {
            //No posts in non-filtered channel
            return translate('There are no posts') + endText;
        } else if (filteredMembersCount > 1) {
            //In filter many users
            return translate('There are no posts that match the current filter') + endText;
        } else {
            //In filter one user
            let filteredMember = channelMembers.filter(channelMember => channelMember.id == filteredMemberIds[0])[0];
            return translate('There are no posts by') + ' ' + filteredMember.label  + endText;
        }
    }

    reactionsHTML(reactions) {
        const list = [];
        const found = {};

        $.each(reactions, (_, reaction) => {
            if ( ! found[reaction.reaction]) {
                list.push(`<svg>
                            <use xlink:href="${get_emoji_url(reaction.reactionId)}"></use>
                        </svg>`);

                found[reaction] = true;
            }
        });

        return /* template */`
            <div class="reactions">${ list.join('') }</div>
            ${ this.themeHook('showReactionsCount', reactions) ? `<u>${ reactions.length }</u>` : ''}
        `;
    }

    attachmentsHTML(posterId, attachments, post, communityId) {
        const list = [];

        posterId = posterId || 'deleted';

        $.each(attachments, (_, attachment) => {
            if (!attachment.file) {
                return true;
            }

            const {STREAM_VIDEOS_FROM_AMS, ANT_MEDIA_SERVER} = window.app.constants;
            const type = attachment.type.toLowerCase();
            const src_regex = /(http(s?)):\/\//;

            attachment.src = src_regex.test(attachment.file.toLowerCase())
                ? attachment.file
                : get_file_url(attachment.file, posterId, null, communityId);
            attachment.thumb  = get_file_url(attachment.file, posterId, 'p1760x800', communityId);
            attachment.lqThumb = get_file_url(attachment.file, posterId, 'p50x50', communityId);
            attachment.poster = get_poster_url(attachment.file, posterId, communityId);
            attachment.file = attachment.file;
            attachment.id = attachment.id;

            attachment = this.themeHook('addPostDataToAttachment', attachment, post) || attachment;

            if (['mp4', 'mov', 'qt', 'avi', 'mpg', 'm3u8'].includes(type)) {
                attachment.videoType = getVideoType(attachment.file);

                const isMediaServerEnabled = !!STREAM_VIDEOS_FROM_AMS.trim();
                const attachmentVideoTemplate = this.themeHook('attachmentVideoTemplate') || 'attachmentVideo';

                if (isMediaServerEnabled) {
                    attachment.src = `//${STREAM_VIDEOS_FROM_AMS}/${community.id}/${posterId}/${attachment.file}`;
                }

                attachment.alternateSrc = attachment.src.replace(".m3u8", ".mp4");
                attachment.alternateVideoType = getVideoType(attachment.alternateSrc);

                list.push(this.manager.render(attachmentVideoTemplate, attachment).html());
            }

            if (['jpg', 'jpeg', 'png'].includes(type)) {
                list.push(this.manager.render('attachmentImage', attachment).html());
            }

            if (['gif'].includes(type)) {
                list.push(this.manager.render('attachmentGif', attachment).html());
            }

            if (['live'].includes(type)) {
                attachment.source = `//${ANT_MEDIA_SERVER}/play.html?name=${attachment.file}&playOrder=webrtc,hls`;

                list.push(this.manager.render('attachmentLive', attachment).html());
            }
        });

        return list.join('');
    }

    attachmentFilesHTML(posterId, attachments, communityId) {
        const list = [];

        $.each(attachments, (_, attachment) => {
            const type = attachment.type.toLowerCase();
            const filename = attachment.filename ? attachment.filename : attachment.file;

            if (type !== 'download') {
                return;
            }

            list.push(`
                <div class="uploaded-file">
                    <img src="${base_url}/assets/images/site_icon/icon-clip.svg" class="file-icon" alt="">
                    <a class="file" href="${attachment.file}" download="${ filename }" target="_blank">
                        ${ getEllipsisString(filename) }
                    </a>
                    <i class="fi-cross del_file hidden" data-filename="${ filename }" data-fileid="${attachment.id}"></i>
                </div>
            `)
        });

        return list.join('');
    }

    submitForm($form) {
        const formWrap = $form.find('.comment-attach-container.form-attach');
        const form = formWrap.find('form');
        const formBtn = form.find('button');
        const data = encodeURIComponent(JSON.stringify(form.serializeArray()));

        formBtn.attr('disabled', true);

        $.post(urlFrom('forms/submit'), {
            slug: formWrap.data('slug'),
            data: data
        }).then(response => {
            if (response.success) {
                showMessage(response.message);
                formWrap.hide();
            }

            formBtn.attr('disabled', false);
        }).fail(showNetworkError);
    }

    attachmentUrlHTML(posterId, attachments, communityId) {
        const list = [];

        $.each(attachments, (_, attachment) => {
            const type = attachment.type.toLowerCase();
            const id = attachment.id;

            if (['form'].includes(type)) {
                list.push(this.manager.render('attachmentFormWrap', {id, slug: attachment.file}).html());

                new Forms(this.manager, attachment.file)
                    .widget().then(({name, intro, formElements, lastSubmitDateMessage}) => {
                        this.manager.render('attachmentForm', {name, intro, formElements, lastSubmitDateMessage})
                            .in('#formAttach_' + id, this.manager.MODE_APPEND);

                        $('[data-toggle="tooltip"]').tooltip();
                });
            }

            if (['url'].includes(type)) {
                const embedVideoUrl = $.fn.urlpreview('getVideoEmbedUrl', attachment.url);

                if (attachment.file) {
                    attachment.imageSrc = get_file_url(attachment.file, posterId, null, communityId);
                } else {
                    attachment.imageSrc = attachment.url_image;
                }

                attachment.attachmentUrlMediaHtml =
                    embedVideoUrl
                        ? this.manager.render('attachmentUrlVideo', {embedVideoUrl: embedVideoUrl}).html()
                        : (
                            attachment.imageSrc
                                ? this.manager.render('attachmentUrlImage', attachment).html()
                                : ''
                        );
                attachment.embedVideoClass = embedVideoUrl ? 'embed-video' : '';
                list.push(this.manager.render('attachmentUrl', attachment).html());
            }
        });

        return list.join('');
    }

    resetAlerts() {
        const messageId = $('.cmntLst .postBlk:first').data('post-id');

        if (messageId && this.type === 'channel' && ! this.isDashboard) {
            $.post(urlFrom(`sidebar/updateRead/${ messageId }`))
                .then(() => updateBubbles(true));
        }
    }

    /**************************************
     **  EVENT HANDLERS  ******************
     **************************************/

    hideActionDropDown($post) {
        $post.find('._header:first .dropDown .dropLst').removeClass('active')
    }

    windowScrolled() {
        this.logViews();

        this.themeHook('windowScrolled');
    }

    logViews() {
        // Don't over-do it, just check every once in a while
        if (throttled('engage.logViewer', 200)) {
            return;
        }

        $('.posts.notViewed').each((_, post) => {
            const $post = $(post);

            // Count every time we see this post in the screen ...
            if (this._isPostVisible($post.find('.txt, .postWrite:first').get(0))) {
                $post.data('inViewportCount', ($post.data('inViewportCount') || 0) + 1);

                // ... and if we see it enough times, add it to the queue (to be reported to the backend)
                if ($post.data('inViewportCount') >= 5) {
                    this.viewsReportQueue[$post.data('post-id')] = {
                        postId: $post.data('post-id'),
                        channelId: $post.data('channel')
                    };

                    $post.removeClass('notViewed highlighted');

                    $post.parents('.postCmnt').each(function() {
                        if ( ! $(this).find('.highlighted').length) {
                            $(this).closest('.postBlk').find('.view-comments').removeClass('highlighted');
                        }
                    });
                }
            }
        });

        this.sendViewsReport();
    }

    /**
     * Return whether a post should be highlighted if not viewed yet by current member.
     *
     * @param {object} post
     */
    _isHighlightable(post) {
        if (! this.themeHook('isHighlightable', post)) {
            return false;
        }

        const $post = $(`#engage .posts[data-post-id="${ post.id }"]`);
        const isRootPost = $post.closest('.postCmnt').length === 0;
        const isReplyToCurrentMember = $post.parents(`.postData[data-member-id="${ member.id }"]`).length;
        const isCurrentMemberMentioned = post.body.includes(`@${ member.first_name} ${member.last_name}`);

        return post.creator_id != member.id
            && (isRootPost || isReplyToCurrentMember || isCurrentMemberMentioned);
    }

    _isPostVisible(post) {
        const position = post.getBoundingClientRect();
        const tolerance = 0; // Don't force the whole post to be in the screen

        return $(post).is(':visible')
            && ((position.top + tolerance >= 0)
                || (position.bottom - tolerance <= (window.innerHeight || document.documentElement.clientHeight)))
            && ((position.left + tolerance >= 0)
                || (position.right - tolerance <= (window.innerWidth || document.documentElement.clientWidth)));
    }

    loadMore(maxPostDate) {
        this.loadingMore = true;
        let loadDataId = (typeof this.id !== 'undefined') ? this.id : mainData.channel.slug;

        return this.loadData(this.type, loadDataId, maxPostDate).always(() => {
            this.loadingMore = false;
        });
    }

    getPostCommunityId($post) {
        if (this.theme === 'chat') {
            return community.id;
        }

        // if it's a comment or reply, there will be a post and it will be in the data
        if ($post) {
            return $post.data('community-id');
        }

        // todo: get the communityId from the dropdown value once that's been implemented.
        // for now return the window's community id.
        return community.id;
    }

    _createPost($form, $post) {
        const $textInput = $form.find('textarea');
        const $buttons   = $form.find('button');
        const channelId  = $post ? $post.attr('data-channel') :
                                   ($textInput.attr('data-channel') ? $textInput.attr('data-channel') : mainData.channel.id);
        const communityId = parseInt($textInput.attr('data-community') ? $textInput.attr('data-community') : this.getPostCommunityId($post));

        if ( $textInput.val().trim() === '' && $form.find("input.attach").length === 0 && $form.find(".url-preview").length === 0) {
            return Promise.resolve();
        }

        let formData = new FormData($form[0]);
            formData.append('channelId', channelId);
            formData.append('message', $textInput.val().trim());
            formData.append('friendsIds', $textInput.data('friends-ids'));
            formData.append('masked', this.masked && member.managedCommunities.includes(communityId) ? 1 : 0);
            formData.append('communityId', communityId);

        const $parentPost = $form.parent().find(".repliedToContent .parentPost");

        if ($parentPost.length) { // for quoting a post in chat only.
            formData.append('parentId', $parentPost.data('post-id'));
        }

        $textInput.attr('disabled', true);
        $buttons.attr('disabled', true).find('i.spinner').removeClass('hidden');

        return $.post({
            url: urlFrom('comments/create'),
            data: formData,
            processData: false,
            contentType: false
        }).always(() => {
            $textInput.attr('disabled', false);
            $buttons.attr('disabled', false).find('i.spinner').addClass('hidden');
            $('.popup[data-popup="new-post"] .crosBtn').trigger('click');

            this.themeHook('postCreated');
            this.refreshNewPostDraft();

            if ($form.find('input[data-type^="video-"]').length) {
                $.alert({
                    title: translate('Info'),
                    content: html_entity_decode(translate("We are converting your video. It will be available soon!")),
                    buttons: {Okay: {}}
                });
            }
        });
    }

    createPost(_, $form) {
        this._createPost($form).then(response => {
            this._removeFromDraft(0);
            let isCurrentChannel = parseInt(mainData.channel.id) === parseInt($form.find('.txtBox').data('channel'));

            if (this.isDashboard || isCurrentChannel) {
                this.addContent('#engage .cmntLst', response.posts, this.manager.MODE_PREPEND);
            }

            this.refreshPostForm();
            this.themeHook('afterCreatePost', $form);
            let createdPost = response.posts[0];

            if (! isCurrentChannel && this.themeHook('newPostPopupOpened') && typeof createdPost !== 'undefined') {
                let channelURL = createdPost.community.id + '#engage/' + createdPost.channel.slug
                showMessage(translate('Post created!') +
                    ' <a href="' + channelURL + '"><u>' + translate('View it')  + '</u></a>'
                );
            }
        }).catch((response) => {
            if (response.status == 404) {
                this.refreshPostForm();
            }
        });
    }

    createReply($post, $form) {
        const $responses = $post.find('.responses:first');
        const $repliesBox = $post.find('.replyContainer:last');
        const $commentArea = $repliesBox.find('> .leavCmnt > .frmCmnt .relative');
        const $textInput = $commentArea.find('textarea');
        const $buttons = $commentArea.find('.addMedia').children();
        const message = $textInput.val().trim();
        const attach = $form.find('input.attach').val();
        const postReplying = {
            id: $post.data('post-id'),
            community: {id: $post.data('community-id')}
        }

        if (!message.length && !attach) {
            return showError(translate('A post cannot be empty. Please provide some content.'));
        }

        $commentArea.addClass('disabled');
        $textInput.attr('disabled', true);
        $buttons.attr('disabled', true);

        this._createPost($form, $post).then(response => {
            this._removeFromDraft($post.data('post-id'));
            $post.find('> .postCmnt > .leavCmnt.topReply').remove();

            this.addContent($responses, response.posts, this.manager.MODE_APPEND);

            $commentArea.removeClass('disabled');
            $textInput.attr('disabled', false);
            $buttons.attr('disabled', false);

            this.manager
                .render('replyForm', this.getMaskData(this.buildMaskDataArray(postReplying, $post)))
                .in($repliesBox, this.manager.MODE_APPEND);
        }).catch((response) => {
            if (response.status == 404) {
                $post.find('> .postCmnt > .leavCmnt.topReply').remove();

                this.manager
                    .render('replyForm', this.getMaskData(this.buildMaskDataArray(postReplying, $post)))
                    .in($repliesBox, this.manager.MODE_APPEND);
            }

            $commentArea.removeClass('disabled');
            $textInput.attr('disabled', false);
            $buttons.attr('disabled', false);
        });
    }

    replyKeyPressedHandle ($post, $target, event) {
        let textarea = $($target).hasClass('txtBox') ? $($target)[0] : $($target).find('textarea')[0];

        this._localSave(textarea.value, $post.data('post-id'));

        event.preventDefault();
        event.stopPropagation();

        if (typeof event.originalEvent !== 'undefined' && event.originalEvent.type == 'submit'){
            this.createReply($post, $target, event);
        }
    }

    autoExpandPostTextArea ($post, $target) {
        autoSize($target[0]);
        this._localSave($target[0].value, 0);
    }

    addPhotoVideo($post, $target) {
        this.closeAddMediaPopup($post, $target);
        let popupInput = $('.popup:visible .photoVideoInput');
        if (popupInput.length > 0) {
            popupInput.trigger('click');
        } else {
            $('#engage .photoVideoInput:first').trigger('click');
        }

    }

    addFile() {
        $('#engage .fileInput:first').trigger('click');
    }

    addReplyPhotoVideo(_, $button) {
        $button.closest('form').find('.commentMediaInput').trigger('click');
    }

    detachAttachment(_, $deleteBtn) {
        const fileName = $deleteBtn.data('filename');
        const fileId = $deleteBtn.data('fileid');

        // only if we in edit mode
        if (fileId) {
            const deleteAttachInput = `<input type="hidden" name="delete_attach[]" class="delete_attach" value="${fileId}">`
            $deleteBtn.closest('.postWrite').find('.post-attach').prepend(deleteAttachInput);
            $deleteBtn.closest('.image').addClass('hide');
            $deleteBtn.closest('.videoBlk').addClass('hide');
            $deleteBtn.closest('.uploaded-file').addClass('hide');

            let $post = $deleteBtn.closest('.postData');
            let hasAttachments = $post.find('.videoBlk, .image, .uploaded-file').not('.hide').length > 0;
            $post.data('hasAttachments', hasAttachments);
        } else {
            //Remove deleted gif media from form
            if (! fileName) {
                let imgUrl = $deleteBtn.closest('.image').find('img, source').attr('src');
                let mediaId = imgUrl.split('media/')[1].split('/')[0];

                $deleteBtn.closest('.writePost, .postCmnt, .chatForm').find('input.attach[value*="' + mediaId + '"]').remove();
            }

            $.post(urlFrom('uploader/remove_post_attachment'), {
                attachmentId: fileName,
            }).always(() => {
                $deleteBtn.closest('.writePost, .postCmnt, .chatForm').find(`.attach[value="${ fileName }"], .attach[data-file="${ fileName }"]`).remove();
                $deleteBtn.closest('.image').remove();
                $deleteBtn.closest('.uploaded-file').remove();
                let newPostDraft = JSON.parse(localStorage.getItem('newPostDraft'));

                if (newPostDraft !== null) {
                    newPostDraft.attachments.forEach((currentValue, index) => {
                        if (currentValue.data.fileName === fileName) {
                            newPostDraft.attachments.splice(index, 1);
                        }
                    } );

                    localStorage.setItem('newPostDraft', JSON.stringify(newPostDraft));
                }
            });
        }
    }

    editPost($post) {
        this.hideActionDropDown($post);

        $post.find('.postWrite:first').addClass('postEdit');
        $post.find('.pull-right.viewmore').hide();
        $post.find('.postWrite:first .del-button').removeClass('hidden');

        const $textarea = $post.find('.postWrite:first .postEditBox textarea.txtBox');

        $textarea.prop('readonly', false).val($post.data('text')).focus();

        let friendsIds = $textarea.data('friends-ids');

        if (typeof friendsIds == 'undefined') {
            friendsIds = [];
        }

        Array.prototype.forEach.call($post.find('p.post-content a.mention'), mention => {
            let mention_id = $(mention).data('mention_id');
            friendsIds.push(mention_id);
        });

        $textarea.data('friends-ids', friendsIds);

        const postEdit = $textarea.parents('.postEdit').first();
        const attachments = postEdit.find('.post-attach .image, .post-attach .videoBlk, .embed-video, .attachment-files .uploaded-file');

        if (! $textarea.val() && attachments.length == 0) {
            $textarea.addClass('hidden');
        } else {
            postEdit.find('.post-attach').addClass('edit-attach');
            postEdit.find('.uploaded-file .del_file').removeClass('hidden');
        }

        $textarea.unbind().mentionable(
            urlFrom('load/message_mentions'),
            {minimumChar: 3, maxTags: 4}
        );

        this.themeHook('postEdited', $post);
    }

    updatePost($post) {
        const postId = $post.data('post-id');
        const content = $post.find('.postEditBox:first textarea').val();
        const attachmentToDelete = $post.find('.postWrite:first').find('.edit-attach').find('input.delete_attach').map((_, attach) => attach.value).get();

        let textarea = $post.find('.postWrite:first .postEditBox textarea.txtBox');
        let friendsIds = $(textarea).data('friends-ids');

        if ( ! content && ! $post.data('hasAttachments')) {
            return showError(translate('A post cannot be empty. Please provide some content.'))
        }

        $.post(urlFrom(`comments/update/${ postId }`), {
            attachmentToDelete: attachmentToDelete,
            content,
            friendsIds
        }).then(response => {
            if ( ! response.success) {
                return showGenericError();
            }

            $post.data('text', html_entity_decode(response.body))
                .find('.post-content:first').html(response.html).end()
                .find('.postWrite:first').removeClass('postEdit').end()
                .find('textarea:first').prop('readonly', true).val('').end()
                .find('.pull-right.viewmore').show().end()
                .find('.post-content').removeClass('big_emojies');

            $post.find('.postWrite:first').find('.post-attach').removeClass('edit-attach');

            $post.find('.uploaded-file .del_file').addClass('hidden');

            $post.find('.image.hide').remove();
            $post.find('.uploaded-file.hide').remove();

            // clean up predelete input
            $post.find('.postWrite:first').find('.post-attach').find('input').remove();

            // check number of media, in case if it less then 4 remove plus class
            const mediaNumber = $post.find('.postWrite:first').find('.post-attach').find('div:not(".hide")').length;;
            if (mediaNumber >= 4) {
                $post.find('.postWrite:first').find('.post-attach').removeClass('.plus')
            }

            if (this.hasBigEmojis(response.html)) {
                $post.find('.post-content').addClass('big_emojies');
            }

            if (response.body) {
                $post.find('.post-content').removeClass('hidden');
            }
        }).fail(showNetworkError);
    }

    cancelPost($post, $target) {
        $target.hide();
        $('.writePost textarea.autoExpand').val('');
        $('.writePost textarea.autoExpand').css('height', '40px');
        $target.closest('form').find('input.attach').remove();
        let $popup = $target.closest('.popup[data-popup="new-post"]');
        $popup.find('.new_Post').html('');
        $popup.find('.files-container').html('');
        $target.closest('form').find('.comment-attach-container').remove();

        $('.popup[data-popup="new-post"] h2 .draft-title').remove();
        this.refreshNewPostDraft();
        this._removeFromDraft(0);
        $popup.find('.crosBtn').trigger('click');
    }

    cancelEditPost($post) {
        $post.find('.postWrite:first').removeClass('postEdit')
             .find('textarea').prop('readonly', true).val('');

        $post.find('.postWrite:first').find('.post-attach').removeClass('edit-attach');

        $post.find('.uploaded-file .del_file').addClass('hidden');

        $post.find('.pull-right.viewmore').show();

        // makes predeleted images vissible again
        $post.find('.postWrite:first').find('.post-attach').find('.image').removeClass('hide');
        $post.find('.postWrite:first').find('.attachment-files').find('.uploaded-file').removeClass('hide');

        let hasAttachments = $post.find('.videoBlk, .image, .uploaded-file').not('.hide').length > 0;
        $post.data('hasAttachments', hasAttachments);

        // clean up predelete input
        $post.find('.postWrite:first').find('.post-attach').find('input').remove();

        this.refreshNewPostDraft();
    }

    _repliesCounterRef($post) {
        return $post.find('.view-comments:first .cmntCnt');
    }

    _repliesCount($post) {
        return parseInt(this._repliesCounterRef($post).html());
    }

    _updateRepliesCounter($parent, delta = 1) {
        const $counter = this._repliesCounterRef($parent);
        const parentId = $parent.data('post-id');

        // If they're responding to a comment, it's a reply, if not it's a comment.
        let type = $parent.hasClass('comment') ? 'reply' : 'comment';

        this._updateCounter($counter, delta, type);

        $parent.find('.view-comments:first').removeClass('hidden');

        // Double-check with backend the actual counter, then update it
        $.get(urlFrom(`posts/repliesCount/${ parentId }`))
            .then(({ count }) => $counter.html(this._counterHtml(count, type)));
    }

    _updateCounter($counter, delta = 1, type) {
        $counter.html((_, count) => {
            return this._counterHtml(parseInt(count) + delta, type);
        });
    }

    _counterHtml(count, type) {
        let message = '';

        if (type === 'comment') {
            message = count === 1 ? translate('COMMENT') : translate('COMMENTS');
        } else if (type === 'reply') {
            message = count === 1 ? translate('reply') : translate('replies');
        }

        return count + ' ' + message;
    }

    deletePost($post) {
        this.hideActionDropDown($post);
        const type = ($post.data('type') === "message") ? "message" : "post";
        const postId = $post.data('post-id');
        const confirmationText = `<p>${translate('You are about to delete a {{ type }}. This action cannot be undone', {type: type})}.</p>`;

        confirm('Please confirm', confirmationText).then(() => {
            $.ajax(
                urlFrom(`comments/delete/${ postId }`)
            ).then(() => {
                // Update parent's reply counter
                this._updateRepliesCounter($post.parents('.postBlk:first'), -1);

                $post.remove();
            }).fail(showGenericError);
        });
    }

    pinPost($post) {
        if ($post.data('pinning')) {
            return;
        }

        $post.data('pinning', true);

        $.post(urlFrom(`pins/pinPost/${ $post.data('post-id') }`)).then(() => {
            this.hideActionDropDown($post);

            $post.find('._header:first .dropDown .add-pin')
                    .toggleClass('add-pin pinned')
                    .find('a > span').html('Pinned');

            $post.find('._header:first > button.pinned').removeClass('hidden');
        })
        .fail(showNetworkError)
        .always(() => $post.data('pinning', false));
    }

    followPost($post) {
        const postId = $post.data('post-id');
        const followed = $post.attr('data-followed') === 'true';

        $.post(urlFrom(`api/post/${postId}/${followed ? 'unfollow' : 'follow'}`))
            .then(() => {
                this.hideActionDropDown($post);
                $post.find('.follow a span').html(followed ? 'Follow' : 'Unfollow')
                $post.attr('data-followed', followed ? 'false' : 'true');
            })
            .fail(showNetworkError);
    }

    mutePost($post) {
        const postId = $post.data('post-id');
        const muted = $post.attr('data-muted') === 'true';

        $.post(urlFrom(`api/post/${postId}/${muted ? 'unmute' : 'mute'}`))
            .then(() => {
                this.hideActionDropDown($post);
                $post.find('.mutePost a span').html(muted ? 'Mute' : 'Unmute')
                $post.attr('data-muted', muted ? 'false' : 'true');
            })
            .fail(showNetworkError);
    }

    unpinPost($post) {
        if ($post.data('unpinning')) {
            return;
        }

        confirm(translate('Unpin'), translate('Are you sure you want to unpin this post?'), translate('Yes')).then(() => {
            $post.data('unpinning', true);

            $.post(urlFrom(`pins/unpinPost/${ $post.data('post-id') }`)).then(() => {
                this.hideActionDropDown($post);

                $post.find('._header:first .dropDown .pinned')
                        .toggleClass('pinned add-pin')
                        .find('a > span').html(translate('Pin it'));

                $post.find('._header:first > button.pinned').addClass('hidden');
            }).fail(showNetworkError).always(() => $post.data('unpinning', false));
        });
    }

    translatePost($post, $target) {
        $($target).hide();
        $.post(urlFrom('translate/index'), {
            postId: $post.data('post-id'),
            translatedLocale: window.locale
        }).then(response => {
            if (response.success) {
                $($target).after( "<p class='translatedPost'>" + response.translation.translated_text + "</p>" );
            }
        });
    }

    async goToReplyBox($post, $target) {
        if ($target.parent().hasClass('deletedAccount')) {
            return;
        }

        const $replyContainer = $post.find('.replyContainer:last').removeClass('hidden');
        const textArea = $replyContainer.find('> .leavCmnt textarea');
        $(document).trigger('focusElementEv', textArea);

        const offset = ($(window).height() - textArea.outerHeight(true)) / 3;
        this.scrollToElement(textArea, offset);
    }

    quoteMessage($post) {
        this.themeHook('quoteMessage', $post);
    }

    openBroadcast($post, $target) {
        const postId  = $post.data('post-id');
        const channelId = $post.data('channel');
        const communityId = $post.data('community-id');

        window.location = `${communityId}#live/${channelId}/${postId}`;
    }

    async toggleViewComments($post, $target) {
        $target = $target || $post.find('.view-comments').first();

        let postType = this.getPostType($post);

        const $comments = $post.find('.postCmnt:first');
        const $commentElements = $comments.find('.comment');

        // we only want to toggle the hidden class if we've already loaded the posts. if we haven't yet loaded them, then we skip toggling.
        // this is because on first load, the comments section isn't hidden (even though there isn't content in it) so that any new comments will appear right away.
        if ($post.data('repliesLoaded')) {
            $comments.toggleClass('hidden-replies');

            if ($comments.hasClass('hidden-replies')) {
                $commentElements.addClass('hidden')
                if (postType !== 'post') {
                    // we only ever hide the reply form. the comment form is always visible.
                    // we don't use toggleClass since the reply form may already be visible (if they previously clicked the reply button) making it the opposite of the comments.
                    $post.find('.replyContainer:first').addClass('hidden');
                }

                return;
            } else {
                $commentElements.removeClass('hidden')
            }
        }

        // make sure the reply container is visible, just in case it was previously hidden.
        if (postType !== 'post') {
            $post.find('.replyContainer:first').removeClass('hidden');
        }

        await this.loadSubComments($post);

        const $viewComments = $target.is('.view-comments') ? $target : $target.parents('.view-comments');

        const $comment = $viewComments.hasClass('highlighted')
                            ? $post.find('.postCmnt .postBlk.highlighted')
                            : $post.find('.postCmnt .postBlk');

        const offset = ($(window).height() - $comment.outerHeight(true)) / 3;
        this.scrollToElement($comment, offset);
    }

    scrollToElement(targetEl, offset = 100) {
        if (typeof targetEl.offset() === "undefined") {
            return;
        }

        $('html, body').animate({
            scrollTop: targetEl.offset().top - offset
        }, 500);
    }

    closeDropdown() {
        $('.dropCnt.dropLst').removeClass('active');
    }

    toggleEmojiPopup($post, $target) {
        if ($target && $target.parent().hasClass('deletedAccount')) {
            return;
        }

        //it may have been clicked from a dropdown. if so close the dropdown.
        this.closeDropdown();

        const $container = $post.find('.emotiThumb:first');

        if ($container.find('.emojiLst').length) {
            this.emojiPopup.toggleClass('active');
            $('body').toggleClass('flow');
        } else {
            this.emojiPopup.appendTo($container).addClass('active');
            $('body').addClass('flow');
        }
    }

    openEmojiGifPopup($post, $target) {
        const openFromPost = $post.length > 0;

        const $container = openFromPost
            ? $target.closest('.addMedia')
            : this.themeHook('rootEmojiContainer');

        this.closeAddMediaPopup($post, $target);

        $('body').addClass('flow');

        this.emojiGifPopup.appendTo($container)
            .find('.nav-tabs .tab:first').click().end()
            .addClass('active');
    }

    closeEmojiGifPopup() {
        $('body').removeClass('flow');
        $('#appLd').find('[data-model="emoji-gif-popup"]').remove();
    }

    insertEmoji(_, $emoji) {
        $emoji.parents('[data-model="emoji-gif-popup"]').removeClass('active');

        const $textArea = this.themeHook('postInputBox');

        const cursor = $textArea[0].selectionStart;

        const $dataEl = $emoji.is('svg.smiley') ? $emoji : $emoji.parents('svg.smiley');

        $textArea.val((_, prev) => {
            return prev.substring(0, cursor) + $dataEl.data('reaction') + prev.substring(cursor)
        });

        $textArea.trigger('input');

        if (! this.themeHook('newPostPopupOpened')) {
            $('body').removeClass('flow');
        }
    }

    insertReplyEmoji($post, $emoji) {
        $emoji.parents('[data-model="emoji-gif-popup"]').removeClass('active');

        const $postCmnt = $post.find('.postCmnt.replyContainer');
        const cursor  = $postCmnt.find(' > .leavCmnt:first > .frmCmnt textarea:first')[0].selectionStart;

        const $dataEl = $emoji.is('svg.smiley') ? $emoji : $emoji.parents('svg.smiley');

        $postCmnt.find(' > .leavCmnt:first > .frmCmnt textarea:first').val((_, prev) => {
            return prev.substring(0, cursor) + $dataEl.data('reaction') + prev.substring(cursor)
        });

        $('body').removeClass('flow');
    }


    /**
     * Loads post reactions and viewers and displays them in a popup
     *
     * @param {*} $post
     * @param {*} element The element the event was triggered on
     * @param {Event} event
     */
    async interactionsPopup($post, element, event) {
        const _this = this;
        const reactionList = $post.data('reactions');
        const groupedList = {};

        const isViewer = $(event.currentTarget).is('.viewed_pop_btn') || $(event.currentTarget).parent('.viewed_pop_btn').length > 0;

        // Remove previous instances, if any
        $('#engage').find('.popup[data-popup="interactions"]').remove();

        // TODO Load reactions here when the API is made available,
        // since the reactions will not be loaded with the post in the future

        if (typeof $post.data('viewers') === 'undefined') {
            const response = await $.post(`messages/viewers/${ $post.data('post-id') }`);

            if (! response || ! response.viewers) {
                return showError('Failed to fetch viewers list');
            }

            $post.data('viewers', response.viewers);
        }

        const viewers = Object.values($post.data('viewers'));

        const $popup = this.manager.render(
            'interactions',
            {
                reactionCount: reactionList.length,
                viewerCount: viewers.length,
                viewerActive: isViewer
            }
        ).fetch();
        // Set reactors list
        $.each(reactionList, (_, data) => {
            let connectButtonHTML = this.getConnectButtonHTML(this.manager, data);
            groupedList[data.reaction] = (groupedList[data.reaction] || 0) + 1;

            // TODO Update this template to match new emojis
            $popup.find('#post-reactions > .who_People').append(/* template */`
                <li>
                    <div class="ico prfBtn" data-member-id="${ data.mask_id }">
                        <img src="${ data.memberAvatar }">
                        <!-- <img src="${ get_emoji_url(data.reaction) }"> -->
                        <svg class="smiley">
                            <use xlink:href="${ get_emoji_url(data.reactionId) }"></use>
                        </svg>
                    </div>
                    <span class="prfBtn" data-member-id="${ data.mask_id }">
                        ${ data.memberName }
                        <strong>${ data.creatorName || '' }</strong>
                    </span>

                    ${ connectButtonHTML }
                </li>
            `);
        });

        // Set viewers list
        $.each(viewers, (_, viewer) => {
            let connectButtonHTML = this.getConnectButtonHTML(this.manager, {...viewer, 'member_id' : viewer.memberId});
            let $viewerRow = this.manager.render('popupMemberRow', viewer).fetch();
            $viewerRow.append(connectButtonHTML);

            $popup.find('#post-viewers > .who_People').append($viewerRow)
        });

        $('body').addClass('flow');

        $popup.appendTo($post).fadeIn();
    }

    getConnectButtonHTML(contentManager, data) {
        const isCurrentMember = parseInt(data.member_id) === parseInt(member.id);

        if (isCurrentMember || ! data.ableToConnect || data.connectionStatus === 'established') {
            return '';
        }

        let $connectButton = contentManager.render('requestConnectionButton', { id: data.member_id }).fetch();

        if (data.connectionStatus === 'requested') {
            $connectButton.prop('disabled', true).html(
                '<span class="connection-sent-text">' +
                    translate('Friend Request Sent') +
                '</span>'
            );
        }

        return '<span class="connect-button">' + $connectButton.html() + '</span>';
    }

    react($post, $emoji) {
        $.post(app_url + 'comments/react', {
            'messageId': $post.data('post-id'),
            'reaction': $emoji.is('svg.smiley') ? $emoji.data('alt') : $emoji.parents('svg.smiley').data('alt'),
            'masked': this.masked && member.isCommunityAdmin ? 1 : 0
        }).then(response => {
            if ( ! response.success) {
                showGenericError();
            }

            // Hide emojis popup
            this.toggleEmojiPopup($post);

            // Update current member's reaction
            const $reactButton = this.themeHook('emojiButton', $post);

            $reactButton
                .find('use')
                .attr('xlink:href', $emoji.attr('xlink:href'));

            $reactButton
                .addClass('reacted')
                .removeClass('hidden');

            // Update reactions
            $post.data('reactions', response.reactions)
                 .find('.who_React:first')
                 .html( this.reactionsHTML(response.reactions) );
        }).fail(showNetworkError);
    }

    changeTab() {
        $('.engage-tab').toggleClass('active');
        $('#searchStreamForm').toggleClass('hidden');

        const placeholder = $('.autocomplete-engage').data('placeholder');
        const everyoneTab = $('.engage-tab.active').attr('for') === 'everyone';

        $('.autocomplete-engage').attr('placeholder', placeholder).val('').removeAttr('readonly');
        $('.searchByMember').toggle(everyoneTab);
        $('.searchByMemberFilter').html('');

        this.clearContent();
        this.loadData();
    }

    showAddMediaPopup() {
        const $popup = this.manager.render('mediaPopup').fetch();
        // // Remove previous instances, if any
        $('#appLd').find('.popup[data-popup="addMedia"]').remove();

        $('body').addClass('flow');
        $popup.appendTo($('#appLd')).fadeIn();

        this.themeHook('showMediaPopup');
    }

    closeAddMediaPopup($post, $target) {
        $($target).parents('.small-popup:first').find('.crosBtn').trigger('click');
    }

    searchByMember() {
        const showingMembers = $('.searchByMemberFilter').first().find('[name="store[]"]').map((_, store) => Number(store.value)).get();
        const showingCount = showingMembers.length;

        const params = {
            channelSlug: typeof mainData.channel.slug !== 'undefined' ? mainData.channel.slug : null,
            includeCurrentMember: false
        };

        $.post(
            '/common/searchUsers',
            params
        ).then(response => {
                //remove any members the current member
                let members = response.items.filter(
                    member => member.id !== window.member.id
                );

                if (members.length === 0) {
                    return;
                }

                let $popup = $('body').find('.popup[data-popup="memberFilter"]');

                if ($popup.length > 0 && showingCount == 0) {
                    $($popup).remove();
                    $popup = $('body').find('.popup[data-popup="memberFilter"]');
                }

                if ($popup.length == 0) {
                    $popup = this.manager.render('memberFilter', {selected: showingCount}).fetch();
                    $popup.appendTo($('body'))
                } else {
                    $.each($popup.find('.who_People li input[type="checkbox"]'), function( key, element ) {
                        if (! element.checked) {
                            $(element).parent().remove();
                        }
                    });
                }

                let mainDiv = $popup.find('.who_People');

                for (const member of members) {
                    if (showingMembers.includes(member.id)) {
                        continue;
                    }

                    mainDiv.append(/* template */`
                        <li data-member-id="${ member.id }" class="search-item">
                            <div class="ico prfBtn" data-member-id="${ member.id }">
                                <img src="${ member.img }">
                            </div>
                            <span class="prfBtn item-label" data-member-id="${ member.id }">${ member.label }</span>
                            <input class="checkbox"
                                type="checkbox"
                                value="${ member.id }"
                                data-member-id="${ member.id }"
                                ${ showingMembers.includes(member.id) ? 'checked' : '' }/>
                            <a href="#" class="search-item-select"></a>
                        </li>
                    `);
                }

                $($popup).fadeIn();

                $('body').addClass('flow');
        });
    }

    filterMembers($post, $target, event, includeCurrentMember = false){
        let params = {};
        params['store'] = $.map($('.who_People li input[type="checkbox"]:checked'), function(c){return c.value; });
        params['channelSlug'] = typeof mainData.channel.slug !== 'undefined' ? mainData.channel.slug : null;
        params['includeCurrentMember'] = includeCurrentMember;

        const searchTerm = $target[0].value.trim();
        const re = new RegExp(searchTerm, 'i');

        $('.popup[data-popup="memberFilter"] ul.who_People li.search-item').each((_, listItem) => {
            const text = $(listItem).find('.item-label').text().trim();

            $(listItem).toggleClass('hidden', ! text.match(re));
        })
    }

    clearSelectedMember() {
        $.each( $('.who_People li'), function( key, element ) {
            $(element).show();
        });
        $('#memberSelectedCount').html('0');
        $('#searchStreamForm input').val('');
        $.map(
            $('.popup[data-popup="memberFilter"] ul.who_People li.search-item input[type="checkbox"]:checked'),
            function(c) { $(c).prop( "checked", false ) }
        );
    }

    toggleMember($post, $target, event) {
        const $checkbox = $target.siblings('input[type="checkbox"]');

        $checkbox.prop('checked', !$checkbox.prop('checked'));

        const showingMembers = $.map(
            $('.popup[data-popup="memberFilter"] ul.who_People li.search-item input[type="checkbox"]:checked'),
            function(c) { return c.value; }
        );

        $('#memberSelectedCount').html(showingMembers.length);
    }

    saveMemberFilter($post, $target, event) {
        $('.searchByMemberFilter').html('');

        let $popup = $('body').find('.popup[data-popup="memberFilter"]');

        let selectedMemberCount = $popup.find('ul.who_People li.search-item input[type="checkbox"]:checked').length;
        let slectedMemebersEl = $('.selectedMembersCount').find('span.count');
        $('.selectedMembersCount').find('ul').html('');

        if (selectedMemberCount) {
            let showedMemberCount = 0;
            $popup.find('ul.who_People li.search-item input[type="checkbox"]:checked').each(function( index, el ) {
                let $el = $(el).parent();
                let $name = $el.find('span.prfBtn').html();
                let $ava = $el.find('div.prfBtn img').attr('src');

                if (showedMemberCount <= 1) {
                    $('.searchByMemberFilter').append(`
                        <li>
                            <input type="hidden" name="store[]" value="${el.value}">
                            <a>
                                <img src="${ $ava }" title="${ $name }">
                            </a>
                        </li>
                    `);

                    showedMemberCount ++;

                } else {
                    $('.searchByMemberFilter').append(`
                        <li class="hide">
                            <input type="hidden" name="store[]" value="${el.value}">
                        </li>
                    `);

                    $('.selectedMembersCount').find('ul').append(`
                        <li>
                            <img src="${ $ava }" title="${ $name }">
                            <span>${ $name }</span>
                        </li>
                    `);
                }
            });

            let otherSelectedMemberCount = selectedMemberCount - showedMemberCount;

            if (otherSelectedMemberCount > 0) {
                slectedMemebersEl.html('+' + otherSelectedMemberCount);
                slectedMemebersEl.show();
            } else {
                slectedMemebersEl.hide();
            }
        } else {
            slectedMemebersEl.hide();
        }

        $('body').removeClass('flow');

        $target.parents('._inner:first').find('.crosBtn').trigger('click');

        this.clearContent();
        this.loadData();
    }

    loadGifs($post) {
        const emojisWidget = $post.find('.addMedia [data-model="emoji-gif-popup"] .emoji-widget');
        const loader = emojisWidget.find('.gifData .appLoad');
        const gifLst = emojisWidget.find('ul.gifLst');

        loader.removeClass('hidden');
        gifLst.addClass('hidden');

        $.ajax({
            url: 'https://api.giphy.com/v1/gifs/trending',
            method: 'get',
            data: {
                api_key: '5A1supzh2FV1cEqvkU3n54SLRlcfc7OF',
                lang: 'en',
                offset: 0,
                limit: 24,
                rating: 'G'
            }
        }).done(function (response) {
            let gifsHtml = '';

            for (const gif of response.data) {
                const images = gif.images;
                gifsHtml += `<li><div><img src="${images.fixed_height.url}" data-url="${images.original.url}"></div></li>`;
            }

            setTimeout(function () {
                const searchInput = emojisWidget.find('.emoji-widget #gifs-tab input');
                searchInput.focus().val('');
                loader.addClass('hidden');
                gifLst.html(gifsHtml).removeClass('hidden');
            }, 1000);
        });
    }

    searchGifs($post) {
        clearTimeout(this.searchGifDebounce);

        this.searchGifDebounce = setTimeout(function () {
            let input = $post.find('input.txtBox.sgf');

            let query = $(input).val();
            if (empty(query)) return false;

            let mnBx = $post.find('.addMedia [data-model="emoji-gif-popup"] .emoji-widget');

            mnBx.find('.appLoad').removeClass('hidden');
            mnBx.find('ul.gifLst').html('').addClass('hidden');
            let xhr = $.get("https://api.giphy.com/v1/gifs/search?api_key=5A1supzh2FV1cEqvkU3n54SLRlcfc7OF&q=" + query + "&limit=25&offset=0&rating=G&lang=en");
            xhr.done(function (rs) {
                let $html = '';
                for (let i = 0; i < rs.data.length; i++) {
                    let giphyURL = rs.data[i].images.original.url;
                    let giphySmURL = rs.data[i].images.fixed_height.url;
                    $html += '<li><div><img src="' + giphySmURL + '" data-url="' + giphyURL + '" alt=""></div></li>';
                }
                mnBx.find('.appLoad').addClass('hidden');
                mnBx.find('ul.gifLst').html($html).removeClass('hidden');
            });
        }, 250)
    }

    insertGif($post, $gif) {
        let form = $post.find('form.postMedia:first, .postCmnt:not(.hidden) > .leavCmnt > .frmCmnt');
        let att = $gif.attr('src');
        let url = $($gif).data('url');

        if ($post.parents('.popup[data-popup="new-post"]').length > 0) {
            form = form.add($('#engage .writePost .postMedia'));
        }

        this.closeEmojiGifPopup();

        // Not sure what this is checking? Not valid with new layout
        if ($(this).parents('ul.gifCnt:first').hasClass('cattSR')) {
            form.next(".new_Post").find('.del_pic:first').trigger('click');
            form.append('<input type="hidden" name="attach[]" class="attach gif" value="' + url + '" data-att="' + att + '">');
            form.next(".new_Post").html(generateGifBoxTemplate(att));
        } else {
            form.append('<input type="hidden" name="attach[]" class="attach gif" value="' + url + '" data-att="' + att + '">');

            this.themeHook('insertGif', form, att);
        }

        saveAttachmentsDraft('gif', {att: att, url: url});

        $('.dropCnt.dropLst').removeClass('active');
        $('body').removeClass('flow');
        form.find('textarea').focus();

        if (form.is('form.postMedia:first')) {
            form.find('textarea.cmntBxMain').trigger('input');
        }
    }

    openSinglePost($post) {
        location.hash = `#engage/post/${ $post.data('post-id') }`;
    }

    async _navigateToReply(reply) {
        await this.loadSubComments(this.getPostRef(reply.root_id));

        if (reply.root_id != reply.parent_id) {
            await this.loadSubComments(this.getPostRef(reply.parent_id));
        }

        const $reply = this.getPostRef(reply.id).addClass('highlighted');

        $reply.parents('.postCmnt').removeClass('hidden');

        setTimeout(() => {
            $(document.documentElement).add('body, html').animate({
                scrollTop: $reply.offset().top - 100
            }, 1000);

            setTimeout(() => $reply.removeClass('highlighted'), 2000);
        }, 300);
    }

    getMaskData(data) {
        let maskData;
        let isDataEmpty = (typeof data === 'undefined');

        if (this.masked && member.isCommunityAdmin) {

            if (! this.isDashboard) {
                maskData = {
                    memberName: community.mask.name,
                    memberAvatar: community.mask.avatar
                };
            } else if (!isDataEmpty) {
                maskData = {
                    memberName: data.maskName,
                    memberAvatar: data.maskAvatar
                };
            } else {
                maskData = {
                    memberName: '',
                    memberAvatar: ''
                };
            }

        } else {
            maskData = {
                memberName: member.first_name + ' ' + member.last_name,
                memberAvatar: get_avatar_url(member.avatar, member.id, 'p50x50')
            };
        }

        return data ? {...data, ...maskData } : maskData;
    }

    setMaskData() {
        if (member.managedCommunities.length === 0) {
            return;
        }

        // togle state
        this.masked = ! this.masked;

        $('.popup-content .communityAdminToggle .maskedContentSwitch > input').prop('checked', this.masked);

        const maskData = this.getMaskData();
        const postingAs = this.masked ? $('.userPic.clickable[data-avatar]').eq(0).attr('data-maskname') : maskData.memberName;

        // update avatar
        this.refreshMaskedAvatar(maskData);

        // save state
        localStorage.setItem("masked", this.masked);

        showMessage(translate('Now posting as ') + postingAs, 1000);
    }

    refreshMaskedAvatar(maskData) {
        const masked = this.masked;
        $('.userPic.clickable[data-avatar]').each(function (){
            let _this = $(this);
            let clickedCommunity = parseInt($(this).siblings('.postContentWrapper').find('.txtBox').data('community'));

            if (isNaN(clickedCommunity)) {
                clickedCommunity = parseInt($(this).parents('.postBlk').eq(0).data('community-id'));
            }

            let maskAllowed = masked && member.managedCommunities.includes(clickedCommunity)
            _this.find('img')
                .attr('src', () => {return maskAllowed ? _this.attr('data-maskavatar') : maskData.memberAvatar})
                .attr('title', () => {return 'Post as ' + (maskAllowed ? _this.attr('data-maskname') : maskData.memberName)})
        });
    }

    refreshNewPostDraft() {
        localStorage.setItem('newPostDraft', JSON.stringify(
            {
                community: null,
                channel: null,
                text: '',
                attachments: []
            }
        ));
    }
};
