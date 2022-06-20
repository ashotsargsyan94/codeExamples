"use strict";

/**
 * Factory of event handlers for Privacy events.
 *
 * $(#appLd).on(eventName, targetSelector,
 *      privacyHandler(privacyMethodName)
 * );
 */
const privacyHandler = (privacyMethod) => event => {
    const privacyObject = $('#privacy').data('PrivacyObject');

    if (privacyObject) {
        const method = privacyObject[privacyMethod];

        if (method) {
            method.call(privacyObject, $(event.target), event);
        } else {
            console.log(`Privacy.${privacyMethod} was called but is not registered.`);
        }
    }
}


/**
 * Set up privacy related event listeners below.
 */

$(function () {
    $(document).on("change", '#privacy .switchBtn > input',
        privacyHandler('updatePrivacySetting')
    );
});
