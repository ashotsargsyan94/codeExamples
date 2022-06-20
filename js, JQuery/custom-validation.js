String.prototype.replaceAll = function(search, replace){
    return this.split(search).join(replace);
}

$.validator.addMethod("numbersAndLetters", function (value, element) {
    return /\p{L}/u.test(value) && /\p{N}/u.test(value);
}, translate('At least one number and one letter'));

$.validator.addMethod("customPhone", function (value, element) {
    value = value.replace(/\s+/g, "").replace(/\D/g, "");
    return value.length > 9 && value.length < 13;
}, translate("Please specify a valid phone number"));

$.validator.addMethod("monthDay", function (value, element) {
    const day = value,
        month = $('#frmSetting #month').val(),
        date = new Date(`2020/${month}/${day}`);
    return date.getDate() == day || (!day && !month);
}, translate("Non-existent date"));

function filterPhone (input) {
    let value = input.val();
    value = '+' + value.replace(/[a-z A-Zа-яА-Я._+!@#\$%\^\&*]/g, "");
    input.val(value);
}

function initSettingsValidation() {
    $('#frmChangePass').validate({
        rules: {
            password: {
                required: true,
            },
            new_password: {
                required: true,
                minlength: 8,
                numbersAndLetters: true
            },
            confirm_password: {
                required: true,
                minlength: 8,
                equalTo: '#new_password'
            }
        },
        errorPlacement: function (error, element) {
            error.appendTo(element.parent());
        },
    });
    $('#frmSetting').validate({
        ignore: [],
        rules: {
            first_name: {
                required: true,
            },
            last_name: {
                required: true,
            },
            phone: {
                required: true,
                customPhone: true
            },
            email: {
                required: true,
                email: true
            },
            day: {
                monthDay: true,
            },
            country: {
                required: true,
                number: true
            },
            city: {
                required: true,
            },
            zip: {
                required: true,
            },
            address: {
                required: true,
            },
            profile_heading: {
                required: true,
            }
        },
        errorPlacement: function (error, element) {
            error.appendTo(element.parent());
        },
    });
    $('#frmSetting').on('change input', function(){
        $('#frmSetting').valid();
    })

    filterPhone($('#frmSetting #phone'));

    $('#frmSetting #phone').on('change input', function(){
        filterPhone($(this));
    })
}

$(document).ready(function () {
    $('#frmForgot').validate({
        rules: {
            email: {
                required: true,
                email: true
            }
        },
        errorPlacement: function (error, element) {
            error.appendTo(element.parent());
        },
    });

    $('#frmReset').validate({
        rules: {
            password: {
                required: true,
                minlength: 8,
                numbersAndLetters: true
            },
            confirm_password: {
                required: true,
                minlength: 8,
                equalTo: '#password'
            }
        },
        errorPlacement: function (error, element) {
            error.appendTo(element.parent());
        },
        messages: {
            confirm_password: {
                equalTo: translate("Passwords don't match!")
            }
        }
    });

    $('#frmChangeEmail').validate({
        rules: {
            email: {
                required: true,
                email: true
            }
        },
        errorPlacement: function (error, element) {
            error.appendTo(element.parent());
        },
    });
});
