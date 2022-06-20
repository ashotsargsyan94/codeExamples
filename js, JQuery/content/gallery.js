"use strict";

function Gallery(manager) {
    this.manager = manager;

    this.manager.render('postCard').in('#gallery');

    this.manager.newManager('engage').preload().then(engageManager => {
        this.engageManager = engageManager;
    });

    this.isDashboard = window.community.id === null;

    $('.channelSettings').addClass('hidden');
    $('.galleryBtn').addClass('hidden');

    if (this.isDashboard) {
        $('#page-title-header').addClass('isDashboard');
    } else {
        $('#page-title-header').removeClass('isDashboard');
    }

    $('#gallery').data('GalleryObject', this);

    this.tab = 'others';
}

Gallery.prototype = {
    init() {
        this.loadData();
    },

    widget(memberId, container, memberFName) {
        const uri = (memberId === 'community') ? 'gallery/community' : `gallery/member/${ memberId }`;
        const mediaType = 'images';

        this.loadData = () => this.fetchData(uri, { mediaType }).then(response => {
            this.setContent(response.attachments, container, memberFName, 'images');
        });

        this.loadData();
    },

    loadData() {
        const mediaType = $('#gallery .nav-tabs li.active').data('media-type');
        const container = mediaType === 'images' ? '#gallery .imgLst' : '#gallery .vidLst';
        const memberIds = $('.searchByMemberFilter [name="store[]"]').map((_, store) => store.value).get();
        const memberFName = ($('.searchByMemberFilter li').length === 1)
            ? $('.searchByMemberFilter li img').attr('title')
            : null;

        return this.fetchData(`gallery`, {
            memberIds,
            mediaType
        }).then(response => {
            this.setContent(response.attachments, container, memberFName, mediaType);
        });
    },

    fetchData(uri, data) {
        this.fetchingData = true;

        $("#cmntLoader").fadeIn();

        data.lastLoadedId = $('#gallery .mediaLst:first > .card-root:last').data('lastLoadedId') || null;

        this.jqXHR = $.post(urlFrom(uri), data);

        this.jqXHR.always(() => this.fetchingData = false).then(response => {
            if (this.bottomReached = response.lastBatch) {
                $("#cmntLoader").fadeOut();
            }

            return response;
        }).catch(showNetworkError);

        return this.jqXHR;
    },

    setContent(attachments, container, memberFName, mediaType) {
        // If we have a container then both will be rendered in the same container
        // Don't render a no content message then
        if (mediaType === 'images') {
            $('#gallery-media ul').addClass('imgLst').removeClass('vidLst');
            if (Object.keys(attachments).length > 0) {
                this.addImages(attachments, container);
            } else if (! $("#gallery-media ul .card-root").length) {
                this.noImagesMessage(memberFName);
            }
        } else {
            $('#gallery-media ul').addClass('vidLst').removeClass('imgLst');

            if (attachments.length > 0) {
                this.addVideos(attachments, container);
            } else if($("#gallery-media ul .card-root").length === 0) {
                this.noVideosMessage(memberFName);
            }
        }

        setTimeout(() => this.fillScreenWithMedia(), 500);
    },

    addImages(imageAttachments, container) {
        $.each(imageAttachments, (_, attachment) => {
            const src_regex = /(http(s?)):\/\//;

            const memberName = attachment.masked == 1
                                ? this.getMaskData(attachment).name
                                : attachment.first_name + ' ' + attachment.last_name;

            const data = {
                image: src_regex.test(attachment.file.toLowerCase())
                    ? attachment.file
                    : get_file_url(attachment.file, attachment.creator_id, 'p150x150', attachment.community_id),
                memberName: memberName,
                communityName: (community.id == null ? (translate('in ') + attachment.community_name) : '')
            };

            this.manager
                .render('imageCard', data)
                .in(container, this.manager.MODE_APPEND)
                .data('postId', attachment.message_id)
                .data('lastLoadedId', attachment.id);

        });
    },

    addVideos(videoAttachments, container) {
        $.each(videoAttachments, (_, attachment) => {
            const memberName = attachment.masked == 1
                                ? this.getMaskData(attachment).name
                                : attachment.first_name + ' ' + attachment.last_name;

            const memberAvatar = attachment.masked == 1
                                ? this.getMaskData(attachment).avatar
                                : get_avatar_url(attachment.avatar, attachment.creator_id, 'p100x100');

            const data = {
                videoType: attachment.type,
                videoPoster: get_poster_url(attachment.file, attachment.creator_id, attachment.community_id),
                avatarUrl: memberAvatar,
                memberName: memberName,
                timeAgo: attachment.time_ago,
            };

            this.manager
                .render('videoCard', data)
                .in(container, this.manager.MODE_APPEND)
                .data('postId', attachment.message_id)
                .data('lastLoadedId', attachment.id);
        });
    },

    clearContent() {
        $('#gallery .imgLst, #gallery .vidLst').empty();

        this.bottomReached = false;
        this.jqXHR && this.jqXHR.abort();

        return this;
    },

    noImagesMessage(memberFName) {
        const noContentMsg = ($('#gallery li.active .fi-users-alt').length || memberFName)
            ? (`${ memberFName ? translate(`{{ memberFName }} has not posted any images yet!`, { memberFName }) : translate("No images have been posted yet!") }`)
            : translate("You haven't posted any images yet!");

        $('#gallery .imgLst').html(`
            <li class="w-100 alertMsg"><span class="no-content">${ noContentMsg }</span></li>
        `);
    },

    noVideosMessage(memberFName) {
        const noContentMsg = ($('#gallery li.active .fi-users-alt').length || memberFName)
            ? (`${ memberFName ? translate(`{{ memberFName }} has not posted any videos yet!`, { memberFName }) : translate("No videos have been posted yet!") }`)
            : translate("You haven't posted any videos yet!");

        $('#gallery .vidLst').html(`
            <li class="w-100 alertMsg"><span class="no-content">${ noContentMsg }</span></li>
        `);
    },

    changeTab() {
        $('.gallery-tab').toggleClass('active');

        this.tab = $('#gallery li.active .fi-users-alt').length ? 'others' : 'me';

        const placeholder = $('.autocomplete-gallery').data('placeholder');
        const everyoneTab = $('.gallery-tab.active').attr('for') === 'others';

        $('.autocomplete-gallery').attr('placeholder', placeholder).val('').removeAttr('readonly');
        $('#searchStreamFormGallery *').toggle(everyoneTab);
        $('.searchByMemberFilter').toggle(everyoneTab);
        $('.searchByMember').toggle(everyoneTab);

        this.clearContent().loadData();
    },

    changeType() {
        $('.type-tab').toggleClass('active');

        this.clearContent().loadData();
    },

    searchByMember() {
        new Engage(this.engageManager, 'gallery', null).searchByMember();
    },

    backToStream() {
        window.goBack();
    },

    toggleMember() {
        new Engage(this.engageManager, 'gallery', null).toggleMember();
    },

    clearSelectedMember() {
        new Engage(this.engageManager, 'gallery', null).clearSelectedMember();
    },

    saveMemberFilter($post, $target, event) {
        new Engage(this.engageManager, 'gallery', null)._saveMemberFilter($post, $target, event);

        this.clearContent().loadData();
    },

    filterMembers($post, $target, event) {
        new Engage(this.engageManager, 'gallery', null).filterMembers($post, $target, event, true);
    },

    /**
     * @param {any} _
     * @param {JQuery<HTMLElement>} $target
     */
    navigate(_, $target) {
        const $post = $target.parents('.inside').find('.post-widget').find('.postBlk[data-post-id]')
        const $navEl = $target.is('a') ? $target.parent('.navigation') : $target;
        const next = $navEl.is('.navigation.next');
        const postId = $post.data('postId');

        const $galleryMedia = $post.parents('#gallery').find('.mediaLst').children();

        let index = -1;
        const galleryEls = $galleryMedia.toArray();

        for (let curr = 0; curr < galleryEls.length; curr++) {
            const currentPostId = parseInt($(galleryEls[curr]).data('postId'), 10);

            if (currentPostId === postId) {
                index = curr;
                break;
            }
        }

        if (index === -1 ||
            (!next && index === 0) ||
            (next && index === galleryEls.length - 1)
        ) {
            return;
        }

        let navigateTo = index;

        do {
            navigateTo = next ? navigateTo + 1 : navigateTo - 1;
        } while (parseInt($(galleryEls[navigateTo]).data('postId'), 10) === postId);

        // Close current popup
        const $back = $post.parent().siblings('.engageBackBtn').find('a');
        $back.trigger('click');

        // Open new popup
        $(galleryEls[navigateTo]).children().trigger('click');
    },

    checkNavigation(currPostId, $card) {
        const $galleryPopup = $('#gallery [data-model="gallery"]');

        const $navPrev = $galleryPopup.find('.navigation.previous');
        const $previousCards = $card.prevAll();
        const prevPostIds = [];

        $previousCards.each((_, prevEl) => {
            const postId = parseInt($(prevEl).data('postId'), 10);
            if (prevPostIds.indexOf(postId)) {
                prevPostIds.push(postId)
            }
        });

        if (!prevPostIds.length || prevPostIds.every(postId => postId === currPostId)) {
            $navPrev.addClass('disabled');
        } else {
            $navPrev.removeClass('disabled');
        }

        const $navNext = $galleryPopup.find('.navigation.next');
        const $nextCards = $card.nextAll();
        const nextPostIds = [];

        $nextCards.each((_, nextEl) => {
            const postId = parseInt($(nextEl).data('postId'), 10);
            if (nextPostIds.indexOf(postId)) {
                nextPostIds.push(postId)
            }
        });

        if (!nextPostIds.length || nextPostIds.every(postId => postId === currPostId)) {
            $navNext.addClass('disabled');
        } else {
            $navNext.removeClass('disabled');
        }
    },

    showPostModal($card) {
        const manager = this.engageManager;

        manager.render('widget').in('.post-widget', manager.MODE_INSERT);

        const postId = $card.data('postId');

        new Engage(manager, 'post', postId).galleryWidget();

        this.checkNavigation(parseInt(postId, 10), $card);
        $('body').addClass('flow');
        $('[data-model="gallery"]').addClass('animate__animated animate__zoomIn active');
        $('#gallery').addClass('blur');
    },

    hidePostModal(_, $target, event) {
        event.preventDefault();

        const video = $target.closest('.inter.roadMap').find('video').get(0);

        if (video) {
            video.pause();
            video.currentTime = 0;
        }

        $('body').removeClass('flow');
        $('[data-model="gallery"]').removeClass('animate__animated animate__zoomIn  active');
        $('#gallery').removeClass('blur');
    },

    fillScreenWithMedia() {
        if (this.fetchingData || this.bottomReached) {
            return;
        }

        const scrolled = $(window).scrollTop() + $(window).height();
        const triggerScroll = $(document).height() - 300;
        const loadedCards = $('#gallery .card-root').length;
        const minCardsPerPage = Math.floor($(window).height() / 20);

        if (scrolled > triggerScroll || loadedCards < minCardsPerPage) {
            this.loadData();
        }
    },

    getMaskData(attachment) {
        return member.communities[attachment.community_id].config.mask;
    },
}
