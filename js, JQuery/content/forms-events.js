"use strict";

/**
 * Factory of event handlers for Forms events.
 *
 * $(#appLd).on(eventName, targetSelector,
 *      formHandler(formsMethodName)
 * );
 */
const formHandler = (formMethod) => event => {
    const formObject = $('#communityForm').data('FormObject');

    if (formObject) {
        const method = formObject[formMethod];

        if (method) {
            event.stopPropagation(); // TODO : remove once old handlers are deleted

            method.call(formObject, $(event.target), event);
        } else {
            console.log(`Form.${formMethod} was called but is not registered.`);
        }
    }
}


/**
 * Set up forms-related event listeners below.
 */

$(function() {
    $('#appLd').on('submit', '#formWrapper form',
        formHandler('submitForm')
    );

});