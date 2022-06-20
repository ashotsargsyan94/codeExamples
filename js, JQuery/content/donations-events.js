"use strict";

/**
 * Factory of event handlers for Donations events.
 *
 * $(#appLd).on(eventName, targetSelector,
 *      donationsHandler(donationMethodName)
 * );
 */
const donationsHandler = (donationMethod) => event => {
    const donationObject = $('#donations').data('DonationsObject');

    if (donationObject) {
        const method = donationObject[donationMethod];

        if (method) {
            method.call(donationObject, $(event.target), event);
        } else {
            console.log(`Donation.${donationObject} was called but is not registered.`);
        }
    }
}

/**
 * Set up donations tab related event listeners below.
 */
$(function() {
    $(document).on('click', '#gift-type .btn',
        donationsHandler('giftTypeToggle')
    );

    $(document).on('click', '#gift-frequency .btn',
        donationsHandler('giftFrequencyToggle')
    );

    $(document).on('click', '#payment-next .btn',
        donationsHandler('nextHandle')
    );

    $(document).on('click', '#payment-pay .btn',
        donationsHandler('payHandle')
    );

    $(document).on('input', '#payment-amount',
        donationsHandler('amountChange')
    );
});
