"use strict";

/**
 * Factory of event handlers for Gallery events.
 *
 * $(#appLd).on(eventName, targetSelector,
 *      galleryHandler(galleryMethodName)
 * );
 */
const galleryHandler = (galleryMethod) => event => {
    const galleryObject = $('#gallery').data('GalleryObject');

    if (galleryObject) {
        const $card = $(event.target).closest('.card-root');
        const method = galleryObject[galleryMethod];

        if (method) {
            event.stopPropagation(); // TODO : remove once old handlers are deleted

            method.call(galleryObject, $card, $(event.target), event);
        } else {
            console.log(`Gallery.${galleryMethod} ${translate('was called but is not registered')}.`);
        }
    }
}


/**
 * Set up gallery-related event listeners below.
 */

$(function() {
    $('#appLd').on('click', '#gallery .engageBackBtn',
        galleryHandler('hidePostModal')
    );

    $('#appLd').on('click', 'li.gallery-tab:not(.active)',
        galleryHandler('changeTab')
    );

    $('#appLd').on('click', '#gallery [data-model="gallery"] .navigation:not(.disabled)',
        galleryHandler('navigate')
    );

    $('#appLd').on('click', '#gallery [data-button="gallery"], #gallery [data-button="gallery-video"]',
        galleryHandler('showPostModal')
    );

    $('#appLd').on('click', '.searchByMember',
        galleryHandler('searchByMember')
    );

    $('#appLd').on('click', '.backToStream',
        galleryHandler('backToStream')
    );

    $('#appLd').on('click', '#gallery .nav-tabs li:not(.active)',
        galleryHandler('changeType')
    );

    $(document).on('click', '.who_People li input[type="checkbox"]',
        galleryHandler('toggleMember')
    );

    $(document).on('click', '#clearSelected',
        galleryHandler('clearSelectedMember')
    );

    $(document).on('click', '#saveMemberFilter',
        galleryHandler('saveMemberFilter')
    );

    $(document).on('keyup', '#searchStreamForm input',
        galleryHandler('filterMembers')
    );

    $(window).scroll(
        galleryHandler('fillScreenWithMedia')
    );
});

$(document).on('click', '#cancelMemberFilter', function(e){
    $(this).parents('._inner:first').find('.crosBtn').trigger('click');
});