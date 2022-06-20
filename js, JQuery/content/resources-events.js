"use strict";

/**
 * Factory of event handlers for Resources events.
 *
 * $(#appLd).on(eventName, targetSelector,
 *      resourcesHandler(mediaMethodName)
 * );
 */
const resourcesHandler = (resourcesMethod) => event => {
    const resourcesObject = $('#resourcesTabContent').data('ResourcesObject');

    if (resourcesObject) {
        const method = resourcesObject[resourcesMethod];

        if (method) {
            method.call(resourcesObject, $(event.target), event);
        } else {
            console.log(`Resources.${resourcesMethod} was called but is not registered.`);
        }
    }
}

/**
 * Set up resources tab related event listeners below.
 */

$(function () {
    $(document).on('click', '#resourcesTabContent .nav > div, #resourcesTabContent .itemsList .folder',
        resourcesHandler('changeTab')
    );

    $(document).on('click', '#resourcesTabContent .back',
        resourcesHandler('goBack')
    );

    $(document).on("click", "#resourcesTabContent .viewLst > li:nth-child(1) > button", function () {
        $("#resourcesTabContent").removeClass("listView");
        $("#resourcesTabContent .viewLst > li").removeClass("active");
        $(this).parent().addClass("active");
    });

    $(document).on("click", "#resourcesTabContent  .viewLst > li:nth-child(2) > button", function () {
        $("#resourcesTabContent").addClass("listView");
        $("#resourcesTabContent .viewLst > li").removeClass("active");
        $(this).parent().addClass("active");
    });

    $(document).on('click', '#resourcesTabContent [data-button="gallery-audio"], #resourcesTabContent [data-button="gallery-video"], #resourcesTabContent [data-button="gallery-pdf"]',
        resourcesHandler('showMediaModal')
    );

    $('#appLd').on('click', '#resourcesTabContent .post-widget .engageBackBtn',
        resourcesHandler('hideMediaModal')
    );

    $(document).on('click', '#nav li.active[data-nav-tab=resources]', function() {
        window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
});
