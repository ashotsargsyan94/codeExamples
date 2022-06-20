"use strict";

/**
 * Factory of event handlers for Certification events.
 *
 * $(#appLd).on(eventName, targetSelector,
 *      certificationHandler(certificationMethodName)
 * );
 */
const certificationHandler = (certificationMethod) => event => {
    const certificationObject = $('#badges').data('CertificationObject');

    if (certificationObject) {
        const method = certificationObject[certificationMethod];

        if (method) {
            event.stopPropagation(); // TODO : remove once old handlers are deleted

            method.call(certificationObject, $(event.target), event);
        } else {
            console.log(`Certification.${certificationMethod} was called but is not registered.`);
        }
    }
}


/**
 * Set up forms-related event listeners below.
 */

$(function() {
    $('#appLd').on('click', '#formWrapper button.passCetification',
        certificationHandler('passCetification')
    );

    $('#appLd').on('click', '#formWrapper button.failCetification',
        certificationHandler('failCetification')
    );

    $('#appLd').on('click', '#badges [data-button="badge"]',
        certificationHandler('showBadgeModal')
    );

    $(document).on('click', '.removeBadge',
        certificationHandler('removeBadge')
    );
});