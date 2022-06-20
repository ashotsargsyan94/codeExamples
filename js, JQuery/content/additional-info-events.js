"use strict";

/**
 * Factory of event handlers for Additional Info events.
 *
 * $(#appLd).on(eventName, targetSelector,
 *      additionalInfoHandler(additionalInfoMethodName)
 * );
 */
const additionalInfoHandler = (additionalInfoMethod) => event => {
    const additionalInfoObject = $('#additional-info').data('AdditionalInfoObject');

    if (additionalInfoObject) {
        const method = additionalInfoObject[additionalInfoMethod];

        if (method) {
            event.stopPropagation(); // TODO : remove once old handlers are deleted

            method.call(additionalInfoObject, $(event.target), event);
        } else {
            console.log(`AdditionalInfo.${additionalInfoMethod} was called but is not registered.`);
        }
    } else if (additionalInfoMethod == 'additionalFieldsSubmit') {
        event.preventDefault();
        additionalFieldsSubmit();
    }
}


/**
 * Set up forms-related event listeners below.
 */

$(function() {
    $('#appLd').on('click', '.showAdditionalInfo',
        additionalInfoHandler('prepareAdditionalInfoPopup')
    );

    $(document).on('submit', 'form#additionalFields',
        additionalInfoHandler('additionalFieldsSubmit')
    );
});

function additionalFieldsSubmit() {
    const data = encodeURIComponent(JSON.stringify(
        $('form#additionalFields').serializeArray()
    ));

    const communityId = $('form#additionalFields').data('community-id');

    $.post(urlFrom('community/additionalFieldsSubmit'), {
        data: data,
        communityId: communityId
    }).then(response => {
        if (response.success) {
            showMessage(response.message, 1000);

            $('[data-popup="join-community"]').slideUp();

            if (communityId == community.id) {
                community._additionalInfoRequiredSubmit = response.additionalInfoRequiredSubmit;
                community._additionalInfoRequired = false;
            }
        }
    }).fail(showNetworkError);
}

$(document).on('click', '.additional-info .backBtn', function () {
    let urlParts = parseURL(window.location);

    if (window.history.length < 2) {
        //there's nothing to go back to, go to root community
        window.location.href = urlFrom();
    } else {
        let referrerParts = document.referrer ? parseURL(document.referrer) : {};

        if (referrerParts.hostname == urlParts.hostname && referrerParts.pathname !== urlParts.pathname) {
            window.history.back();
            setTimeout(() => window.location.reload(), 100);
        } else {
            window.location.replace(urlFrom());
        }
    }
});
