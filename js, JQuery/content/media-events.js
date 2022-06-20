"use strict";

/**
 * Factory of event handlers for Media events.
 *
 * $(#appLd).on(eventName, targetSelector,
 *      mediaHandler(mediaMethodName)
 * );
 */
const mediaHandler = (mediaMethod) => event => {
    const mediaObject = $('#mediaTabContent').data('MediaObject');

    if (mediaObject) {
        const method = mediaObject[mediaMethod];

        if (method) {
            method.call(mediaObject, $(event.target), event);
        } else {
            console.log(`Media.${mediaMethod} was called but is not registered.`);
        }
    }
}


/**
 * Set up media tab related event listeners below.
 */

$(function() {
    $(document).on('click', '#mediaTabContent .nav-tabs li',
        mediaHandler('changeTab')
    );

    $(window).scroll(
        mediaHandler('windowScrolled')
    );

    $(document).on("click", "#mediaTabContent .viewLst > li:nth-child(1) > button", function() {
        $("#mediaTabContent").removeClass("listView");
        $("#mediaTabContent .viewLst > li").removeClass("active");
        $(this).parent().addClass("active");
    });
    $(document).on("click", "#mediaTabContent  .viewLst > li:nth-child(2) > button", function() {
        $("#mediaTabContent").addClass("listView");
        $("#mediaTabContent .viewLst > li").removeClass("active");
        $(this).parent().addClass("active");
    });
});
