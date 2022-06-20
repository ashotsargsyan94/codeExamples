import { updateBioCharCount } from "./helpers.js";

const SignUp = (function() {
    const NO_ERROR = null;

    const $errorBox = $('div.signup-alerts:first');

    const showGenericError = message => {
        $errorBox
            .html('').slideUp(200)
            .html( message ).slideDown(500);
    };

    const hideGenericError = () => {
        clearTimeout(messageTimeoutId);

        var messageTimeoutId = setTimeout(() => {
            $errorBox.slideUp(500).html('');
        }, 1000);
    };

    const showError = (field, message) => {
        $('#' + field).addClass('error');

        if (message) {
            $('#error_' + field).html(message);
        }
    };

    const hideError = field => {
        $('#error_' + field).html('');
        $('#' + field).removeClass('error');
    };

    /**
     * Move focus to next field (if any) on Enter, after validation.
     */
    $('#signup-form input.first_fieldset').on('keypress', function(e) {
        if (e.which == 13) { // Enter key
            e.preventDefault();

            const $field = $(e.target);

            if ($field.is(':required') && ! $field.val().trim()) {
                showError($field.attr('id'));
            }

            const auditResult = auditField($field.attr('id'));
            const $nextField = $field.parents('.txtGrp').next('.txtGrp');

            if (auditResult !== NO_ERROR) {
                showError($field.attr('id'), auditResult);
            } else if ( ! $nextField.length) {
                $('#signup-submit').click();
            } else {
                $nextField.find('input').focus();
            }
        }
    });

    $('.first_fieldset').on('input', function() {
        hideError($(this).attr('id'));
    });

    $('.first_fieldset').on('blur', function() {
        const auditResult = auditField($(this).attr('id'));

        if (auditResult !== NO_ERROR) {
            showError($(this).attr('id'), auditResult);
        }
    });

    /**
     * Validate value of a given field.
     * @param {string} field
     * @return string|null
     */
    const auditField = field => {
        const value = $('#' + field).val().trim();

        if (value.length === 0) {
            if (field === 'invite_code') {
                return NO_ERROR;
            }

            return translate('This field is required');
        }

        switch (field) {
            case 'first_name':
            case 'last_name':
                return value.length >= 2
                    ? NO_ERROR
                    : translate('This field has to be at least 2 characters long');
            case 'email':
                return /^([a-zA-Z0-9_\+\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/.test(value)
                    ? NO_ERROR
                    : translate('Please provide a valid email');
            case 'password':
                if (! /^[\s\S]{8,}$/u.test(value)) {
                    return translate('The password is too short');
                } else if ( ! /^(?=\P{L}*\p{L})(?=\P{N}*\p{N})[\s\S]{8,}$/u.test(value)) {
                    return translate('At least one number and one letter');
                } else {
                    return NO_ERROR;
                }
            case 'invite_code':
                return /^[a-zA-Z0-9]{3,7}$/.test(value)
                    ? NO_ERROR
                    : translate("This doesn't look like a valid Invite Code");
            default:
                return NO_ERROR;
        }
    };

    /**
     * When the user writes a valid email, check the backend to see if it's already in use.
     */
    (function() {
        let xhrEmailAvailable, timeoutEmailAvailable;

        $('#email').on('input', function() {
            const email = this.value;

            // Cancel previous ajax and reset active timeout (if either set)
            xhrEmailAvailable && xhrEmailAvailable.abort();
            clearTimeout(timeoutEmailAvailable);

            if (auditField('email') === NO_ERROR) {
                timeoutEmailAvailable = setTimeout(function() {
                    xhrEmailAvailable = $.post({
                        url: base_url + 'signup/emailAvailable',
                        data: { email },
                        success: data => {
                            if ( ! data.success) {
                                showError('email', translate('This email is already in use. Please <a class="loginBtn cursor-pointer">login</a>'));
                            }
                        }
                    });
                }, 300); // Avoid throtling while the user writes non-stop
            }
        });
    })();

    /**
     * Send data to server to register new member
     */
    const $signupButton = $('#signup-submit');

    $signupButton.on('click', function(e) {
        if ( ! validateSignupForm()) {
            $('.first_fieldset.error').first().focus();
            return false;
        }

        $signupButton.attr('disabled', true);
        $signupButton.find('i').removeClass('hidden');

        $.post(base_url + 'signup/process', fetchSignupData())
            .then(data => {
                localStorage.setItem('token', data.token);
                location.href = location.href;
            })
            .catch(({ responseJSON }) => {
                if (responseJSON.field) {
                    showError(responseJSON.field, responseJSON.error);
                } else {
                    showGenericError(responseJSON.error || 'Something went wrong.');

                    $('#first-signup-screen').one('input', hideGenericError);
                }
            })
            .always(() => {
                $signupButton.find('i').addClass('hidden');
                $signupButton.attr('disabled', false);
            });
    });

    $('#cancel-signup').on('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        location.href = urlFrom();
    });

    /**
     * Custom fields validation on SignUp initial screen
     */
    const validateSignupForm = function() {
        $('.first_fieldset').each(function() {
            const $field = $(this);
            const auditResult = auditField($(this).attr('id'));

            if (auditResult === NO_ERROR) {
                hideError($field.attr('id'));
            } else {
                showError($field.attr('id'), auditResult);
            }
        });

        return $('.first_fieldset.error').length === 0;
    };

    const fetchSignupData = function() {
        return {
            'first_name'  : $('#first_name').val(),
            'last_name'   : $('#last_name').val(),
            'email'       : $('#email').val(),
            'password'    : $('#password').val(),
            'invite_code' : $('#invite_code').val(),
            'subscription': 0,
            'locale'      : $('#locale').val(),
        };
    };

    /**
     * Save Bio button
     */
    $('#save_bio').click(() => {
        const bio = $('#bio').val();

        $.post(urlFrom('signup/saveBio'), { bio }).then(data => {
            if ( data.success) {
                $('#bio').parents('fieldset').hide().next('fieldset').fadeIn()
            } else {
                alert(translate('Failed to save Bio')); // TODO : give a proper feedback
            }
        });
    });

    /**
     * Once the user has reached the end of the sign up process, take
     * them to their account.
     */
    $('#completeSignup').click(e => {
        e.preventDefault();
        e.stopPropagation();

        // allow server to handle where to go next
        // because the user has already been authenticated
        // and is "logged in"
        window.location.reload();
    });

    // Used to trigger the setting of the char count when using the dev skip button
    $(document).on('click', '#confirm-screen > div.topBtns > button.nextBtn',  updateBioCharCount);

    $(document).on('input propertychange', '#bio', updateBioCharCount);

    $(document).on('click', '#signup .terms-conditions > a', function(e) {
        e.preventDefault();

        const $popup = $('div.popup[data-popup="tos-popup"]');
        $popup.find('h2').html($(this).html())
        $popup.find('iframe').attr('src', $(this).attr('href'));
        $popup.fadeIn();
    })

    $(document).on('click ','div.popup[data-popup="tos-popup"] .crosBtn', function() {
        const $popup = $('div.popup[data-popup="tos-popup"]');
        $popup.fadeOut();
    });

    $(document).on('click ', '#first-signup-screen a.loginBtn', () => {
        location.href = urlFrom('');
    });

    return {
        // Put exportable methods and properties here
    }
})();

/**
 * Post-signup tasks
 */
$(function() {
    if ($('#signup-submit').length) {
        return; // We're in the first screen (pre-signup)
    }

    $.post(Config.app_url + 'welcome_tasks', {
        tasks: [/*'stripe',*/ 'processInviteCode', 'mailchimp', 'firstNotifications']
    }).then(() => {
        console.log("Signup welcome tasks completed");
    }).fail(() => {
        console.log('Something went wrong while completing Signup welcome tasks');
    });
});
