"use strict";

/**
 * Factory of event handlers for Engage events.
 *
 * $(#appLd).on(eventName, targetSelector,
 *      engageHandler(engageMethodName)
 * );
 */

var onTimeline = false;

function setOnTimeline() {
    onTimeline = window.isTimeline();
}

const engageHandler = (engageMethod, goOn) => event => {
    const engageObject = $('#appLd').data('EngageObject');

    if (onTimeline && engageMethod !== 'unregister') {
        // block any calls when we're on timeline unless it's 'unregister' since it was called by the previous page but onTimeline has already changed to the new page.
        return;
    }

    if (engageObject) {
        const $post = $(event.target).closest('.postBlk');
        const method = engageObject[engageMethod];

        if (method) {
            if ( ! goOn) {
                event.preventDefault();
                event.stopPropagation(); // TODO : remove once old handlers are deleted
            }

            method.call(engageObject, $post, $(event.target), event);
        } else {
            console.log(`Engage.${engageMethod} was called but is not registered.`);
        }
    }
}


/**
 * Set up engage-related event listeners below.
 */
$(function() {
    const $appLd = $('#appLd');
    const $document = $(document);
    setOnTimeline();

    $document.on('navigation.engage.initialized', function() {
        setOnTimeline();
        engageHandler('initialized')
    });

    $document.on('navigation.pagechange', function() {
        setOnTimeline();
        engageHandler('unregister')
    });

    $appLd.on('click', '.postBlk',
        engageHandler('logViews', true)
    );

    $appLd.on('submit', 'form.postMedia',
        engageHandler('createPost')
    );

    $appLd.on('keyup submit', 'form.frmCmnt',
        engageHandler('replyKeyPressedHandle', true)
    );

    $appLd.on('keyup submit', 'div.postForm textarea.txtBox',
        engageHandler('autoExpandPostTextArea', true)
    );

    $appLd.on('click', '.addPhotoVideo',
        engageHandler('addPhotoVideo')
    );

    $appLd.on('click', '.addFile',
        engageHandler('addFile')
    );

    $appLd.on('click', '.new_Post .del_pic, .postEdit .post-attach .image .del_pic, .postEdit .post-attach .videoBlk .del_pic, .uploaded-file .del_file',
        engageHandler('detachAttachment')
    );

    $appLd.on('click', '.addCommentMedia',
        engageHandler('addReplyPhotoVideo')
    );

    $appLd.on('click', '.editPost .editpst',
        engageHandler('editPost')
    );

    $appLd.on('click', '.cmntLst .delpst',
        engageHandler('deletePost')
     );

    $appLd.on('click', '.postWrite.postEdit .saveBtn',
        engageHandler('updatePost')
    );

    $appLd.on('click', '.postWrite.postEdit .cancelButton',
        engageHandler('cancelEditPost')
    );

    $appLd.on('click', '.postBlk .icoBtn.view-comments',
        engageHandler('toggleViewComments')
    );

    $appLd.on('click', '.postBlk .icoBtn.open-broadcast',
        engageHandler('openBroadcast')
    );

    $appLd.on('click', '.postBlk .icoBtn.reply',
        engageHandler('goToReplyBox')
    );

    $appLd.on('click', '.translate',
        engageHandler('translatePost')
    );

    $('#appLd').on('click', '.postBlk .icoBtn.reply-bubble',
        engageHandler('quoteMessage')
    );

    $('#appLd').on('click', `.postBlk .icoBtn.emotiThumb,
                            #engage [data-mautoExpandPostTextAreaodel="emoji-popup"] .emojiBackBtn`,
        engageHandler('toggleEmojiPopup')
    );

    $appLd.on('click', `.addEmojiGif, #engage .postCmnt button.replyEmojiGif`,
        engageHandler('openEmojiGifPopup')
    );

    $appLd.on('click', `div[data-model="emoji-gif-popup"] .emojiGifBackBtn`,
        engageHandler('closeEmojiGifPopup')
    );

    $appLd.on('click', '.addMedia .addGif, .chatCreatePost .addGif',
        engageHandler('loadGifs', true)
    );

    $appLd.on('keyup', '.addMedia .emoji-widget #gifs-tab > input',
        engageHandler('searchGifs')
    );

    $appLd.on('click', '.addMedia .emoji-widget ul.gifLst > li img[data-url]',
        engageHandler('insertGif')
    );

    $appLd.on('click', '.postMedia .addMedia .tab-content .emojiLst svg, .postMedia .chatCreatePost .tab-content .emojiLst svg',
        engageHandler('insertEmoji')
    );

    // Could be done better (use existing insertEmoji?) but will work for now
    $appLd.on('click', '#engage .postCmnt .addMedia [data-model="emoji-gif-popup"] .tab-content .emojiLst svg',
        engageHandler('insertReplyEmoji')
    );

    $appLd.on('click', '.add-pin',
        engageHandler('pinPost')
    );

    $appLd.on('click', '#engage .pinned',
        engageHandler('unpinPost')
    );

    $appLd.on('click', '.follow',
        engageHandler('followPost')
    );

    $appLd.on('click', '.mutePost',
        engageHandler('mutePost')
    );

    $appLd.on('click', '.rctPopBtn, .viewed_pop_btn',
        engageHandler('interactionsPopup')
    );

    $appLd.on('click', '#timeline .emotiThumb svg[data-reaction]',
        engageHandler('react')
    );

    $appLd.on('click', '.addMediaPopup',
        engageHandler('showAddMediaPopup')
    );

    $document.on('click', '#btnAddMediaCancel',
        engageHandler('closeAddMediaPopup')
    );

    $appLd.on('click', 'li.engage-tab:not(.active)',
        engageHandler('changeTab')
    );

    $appLd.on('click', '.postBlk .timeAgo, .openPost',
        engageHandler('openSinglePost', true)
    );

    $document.on('click', '.searchByMember',
        engageHandler('searchByMember')
    );

    $appLd.on('submit', '.comment-attach-container.form-attach form',
        engageHandler('submitForm')
    );

   $document.on('click', '.popup[data-popup="memberFilter"] .who_People li a.search-item-select',
        engageHandler('toggleMember')
    );

   $document.on('click', '#clearSelected',
        engageHandler('clearSelectedMember')
    );

   $document.on('click', '#saveMemberFilter',
        engageHandler('saveMemberFilter', true)
    );

   $document.on('click', '#cancelMemberFilter', function(e){
        if (onTimeline) {
            return;
        }

        $(this).parents('._inner:first').find('.crosBtn').trigger('click');
    });

   $document.on('keyup', '#searchStreamForm input',
        engageHandler('filterMembers')
    );

    $document.on('click', '.userPic.clickable[data-avatar], .popup-content .maskedContentSwitch > input',
        engageHandler('setMaskData', true)
    );

   $document.on('click', '.writePost .bTn .sndBtn.cnclBtn, .writePost button.cancelButton',
        engageHandler('cancelPost')
    );

    $(window).scroll(
        engageHandler('windowScrolled')
    );
});

$(document).on('keydown', '#timeline .frmCmnt textarea[name="message"]', function (e) {
    if (e.keyCode === 13 && e.ctrlKey) {
        e.preventDefault();
        $(this).parents('form').submit();
    }
});

$(document).on('input blur', '.writePost textarea.autoExpand', function(event) {
    if (onTimeline) {
        return;
    }

    const $postBox   = $(event.target);
    const hasMessage = !! $postBox.val();
    const hasAttachs = $postBox.parents('form.postMedia').find('input[name="attach[]"]').length > 0;

    $('.writePost .bTn .sndBtn.cnclBtn, .writePost button.cancelButton').toggle(hasMessage || hasAttachs);
});

$(document).on('focusElementEv', function(_, element) {
    element.focus();
});
