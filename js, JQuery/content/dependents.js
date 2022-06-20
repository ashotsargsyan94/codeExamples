"use strict";

function Dependents(manager, editPhoto) {
    this.manager = manager;
    this.editPhoto = editPhoto;

    $('#dependents').data('DependentsObject', this);
}

Dependents.prototype = {
    init() {
        this.loadData().then(
            this.setContent.bind(this)
        );
    },

    loadData() {
        return $.post(urlFrom('dependents/index'))
            .fail(showGenericError);
    },

    setContent({dependents}) {
        this.clearContent();

        dependents.length
            ? this.addDependents(dependents)
            : this.noDependentsMessage();
    },

    addDependents(dependents) {
        $.each(dependents, (_, dependent) => {
            const data = {
                ...dependent,
                type: ucfirst(dependent.type),
                image: get_temp_file_url(dependent.avatar, dependent.parent_id) // Need to change this. Temp files are... well, temporary
            };

            this.manager
                .render('dependentsCard', data)
                .in('#depend #dependentsList', this.manager.MODE_APPEND);
        });
    },

    clearContent() {
        $('#depend #dependentsList').empty();
    },

    noDependentsMessage() {
        $('#depend #dependentsList').html(`
            <li>
                <h4 class="no-content">${translate("You don't have any dependents yet")}!</h4>
            </li>
        `)
    },

    url(fileName, memberId, thumbDir) {
        return get_file_url(fileName, memberId, thumbDir);
    }
};

//@todo: see how to refresh dependents after adding a new one
function get_dependents_html(response) {
    let html = '';
    var obj = (typeof response.dependents !== 'undefined') ? response : JSON.parse(response);

    /**
     * for poedit to scrape db vars for dependent.type
     */
    translate('Guest');
    translate('Kid');

    if (obj.dependents.length > 0) {
        $.each(obj.dependents, function (_, dependent) {
            html += /* template */`
                <li>
                    <div class="inner">
                        <div class="ico">
                            <a
                                href="javascript:void(0)"
                                class="dependentsOptions"
                                data-popup="dependents-options"
                                data-dependent-id="${dependent.id}"
                                data-dependent-member-id="${dependent.registered}"
                                data-dependent-first_name="${dependent.first_name}"
                                data-dependent-last_name="${dependent.last_name}"
                                data-dependent-email="${dependent.email}"
                                data-dependent-registered="${dependent.registered}"
                                data-dependent-status="${dependent.status}"
                            >
                                <img src="${ get_temp_file_url(dependent.avatar, dependent.parent_id) }" alt="avatar">
                            </a>
                        </div>
                        <div class="txt">
                            <h4>
                                <a
                                    href="javascript:void(0)"
                                    class="dependentsOptions"
                                    data-popup="dependents-options"
                                    data-dependent-id="${dependent.id}"
                                    data-dependent-member-id="${dependent.registered}"
                                    data-dependent-first_name="${dependent.first_name}"
                                    data-dependent-last_name="${dependent.last_name}"
                                    data-dependent-email="${dependent.email}"
                                    data-dependent-registered="${dependent.registered}"
                                    data-dependent-status="${dependent.status}"
                                >
                                    ${dependent.first_name} ${dependent.last_name}
                                </a>
                            </h4>
                            <div>${ ucfirst(dependent.type) }</div>
                        </div>
                        <a href="javascript:void(0)" class="fi-chevron-right"></a>
                    </div>
                </li>`;
        });
    } else {
        html = `<li>${translate('No dependents')}</li>`;
    }
    return html;
}

$(function() {
    $(document).on('click', '#depend .viewLst > li:nth-child(1) > button', function () {
        $('#depend').removeClass('listView');
        $('#depend .viewLst > li').removeClass('active');
        $(this).parent().addClass('active');
    });

    $(document).on('click', '#depend .viewLst > li:nth-child(2) > button', function () {
        $('#depend').addClass('listView');
        $('#depend .viewLst > li').removeClass('active');
        $(this).parent().addClass('active');
    });

    $(document).on('keyup', '#searchDepTxt', function () {
        var searchText = $(this).val();
        $('ul.depList > li').each(function () {
            if ($(this).text().toLowerCase().search(searchText) > -1) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
    });

    $(document).on('click', '.uploadImg', function (e) {
        e.preventDefault();
        $('.uploadFile').trigger('click');
        $('.uploadFile').data('file', $(this).data('type'));
    });

    $(document).on('click', '#addDependent', function (e) {
        e.preventDefault();
        $('#id').val('');
        resetForm();
        $('#depFormTitle').html(translate('Add new dependent'));
        $('#depend .btnSubmit').html(translate('Add'));
        $('#depend .btnSubmit').removeClass('dependentBtnDis');
        $('#depend .btnSubmit').addClass('dependentBtnEna');
        $('#depend .btnSubmit').attr('type', 'submit');
    });

    $(document).on('click', '.dependentsOptions', function (e) {
        e.preventDefault();
        $(".popup[data-popup= dependents-options]").fadeIn();
        $('.depOptions').data('dependent-id', $(this).data('dependent-id'));
        $('.depOptions').data('dependent-member-id', $(this).data('dependent-member-id'));
        $('#id').val($(this).data('dependent-id'));
        $('#first_name').val($(this).data('dependent-first_name'));
        $('#last_name').val($(this).data('dependent-last_name'));
        $('#email').val($(this).data('dependent-email'));
        $('#email').data('email', $(this).data('dependent-email'));
        $('#email_old').val($(this).data('dependent-email'));

        if ($(this).data('dependent-registered')) {
            $('.btnDelete').addClass('hidden');
            $('.btnDropIn').removeClass('hidden');
            $('.btnSendInvite').addClass('hidden');

            if ($(this).data('dependent-status') == 'active') {
                $('.btnActivate').removeClass('hidden');
                $('.btnInactivate').addClass('hidden');
            } else if ($(this).data('dependent-status') == 'inactive') {
                $('.btnActivate').addClass('hidden');
                $('.btnInactivate').removeClass('hidden');
            }
        } else {
            $('.btnDelete').removeClass('hidden');
            $('.btnDropIn').addClass('hidden');
            $('.btnSendInvite').removeClass('hidden');
            $('.btnInactivate').addClass('hidden');
            $('.btnActivate').addClass('hidden');
        }
    });

    $(document).on('click', '.btnEditDependent', function (e) {
        e.preventDefault();

        $('#dependentsOptions').fadeOut();
        $('#depFormTitle').html(translate('Edit dependent'));
        $('#depend .btnSubmit')
            .attr('type', 'submit')
            .removeClass('dependentBtnDis').addClass('dependentBtnEna')
            .html(translate('Save'));
        $('body').addClass('flow');
        $(".popup[data-popup= form-dependents]").fadeIn();
    });

    $(document).on('click', '.btnDelete', function (e) {
        e.preventDefault();

        const id = $(this).data('dependent-id');

        $.post(urlFrom('dependents/delete'), { id })
            .then(response => {
                $('#dependentsList').html(get_dependents_html(response));
                $(".popup[data-popup= dependents-options]").fadeOut();
            });
    });

    $(document).on('click', '.btnSendInvite', function (e) {
        e.preventDefault();

        const id = $(this).data('dependent-id');

        $.post(urlFrom('dependents/sendInvite'), { id })
            .then(response => {
                $('#dependentsList').html(get_dependents_html(response));
                $(".popup[data-popup= dependents-options]").fadeOut();
                showMessage('Email sent');
            });
    });

    $(document).on('click', '.btnActivation', function (e) {
        e.preventDefault();

        const id     = $(this).data('dependent-id');
        const status = $(this).data('dependent-status');

        $.post(urlFrom('dependents/activation'), { id, status }).then(response => {
            $('#dependentsList').html(get_dependents_html(response));
            $(".popup[data-popup= dependents-options]").fadeOut();
        });
    });

    $(document).on('submit', '#dependents', async function (e) {
        e.preventDefault();
        const emailInput = $('#email')

        if (emailInput.val() === '') {
            emailValid = true;
            emailAvailable = true;
        }

        validateFirstName();
        validateLastName();
        await validateEmail();

        const isEmailFieldPristine = emailInput.val() === emailInput.attr('data-email');
        const formValid = firstNameValid && lastNameValid && (emailValid || isEmailFieldPristine);

        if (!formValid) {
            return;
        }

        $('#depend .btnSubmit').removeAttr('type').attr('type', 'button');

        const formData = new FormData(this);
        formData.set("image", imageFile);

        $.post({
            url: urlFrom('dependents/addOrEdit'),
            data: formData,
            cache: false,
            contentType: false,
            processData: false
        }).then(response => {
                $('#dependents').trigger("reset");
                $('#dependentsList').html(get_dependents_html(response));
                $(".popup[data-popup= form-dependents]").fadeOut();
                $('.image_preview').empty();
                $('body').removeClass('flow');
            });
    });

    $(document).on('blur', '#dependents #first_name', validateFirstName);
    $(document).on('blur', '#dependents #last_name', validateLastName);
    $(document).on('blur', '#dependents #email', validateEmail);
    $(document).on('input change paste', '#dependents #email', updateButtonLabel);

    let firstNameValid = false;
    let lastNameValid = false;
    let emailValid = false;
    let emailAvailable = false;

    function resetForm() {
        $('#depend #first_name').val('');
        $('#depend #last_name').val('');
        $('#depend #email').val('');
        $('#depend #email').removeData('email');
        $('#depend #first_name').removeClass('error');
        $('#depend #last_name').removeClass('error');
        $('#depend #email').removeClass('error');
        $('#depend #error_fname').empty();
        $('#depend #error_lname').empty();
        $('#depend #error_email').empty();

        firstNameValid = false;
        lastNameValid = false;
        emailValid = false;
        emailAvailable = false;
    }

    function validateFirstName() {
        const firstName = $('#first_name');

        if (firstName.val()) {
            firstNameValid = true;
            firstName.removeClass('error');
            firstName.siblings('#error_fname').empty();
        } else {
            firstNameValid = false;
            firstName.addClass('error');
            firstName.siblings('#error_fname').html(translate('Please enter a first name'));
        }
    }

    function validateLastName() {
        const lastName = $('#last_name');

        if (lastName.val()) {
            lastNameValid = true;
            lastName.removeClass('error');
            lastName.siblings('#error_lname').empty();
        } else {
            lastNameValid = false;
            lastName.addClass('error');
            lastName.siblings('#error_lname').html(translate('Please enter a last name'));
        }
    }

    async function validateEmail() {
        const $email = $('#email');
        if ($email.val() === '') {
            emailValid = false;
            return;
        }

        updateButtonLabel();

        const emailStringValid = auditField('email');

        if (emailStringValid !== NO_ERROR) {
            $email.addClass('error');
            $email.siblings('#error_email').html(translate('Please enter a valid email'));
            emailValid = false;
            return;
        }

        if ($email.data('email') && $email.val() === $email.data('email')) {
            emailAvailable = true;
        } else {
            try {
                emailAvailable = await checkForInUseEmail($email.val());
            } catch (error) {
                showNetworkError();

                emailAvailable = false;
                emailValid = false;
            }
        }

        if (emailAvailable) {
            emailValid = true;
            $email.removeClass('error');
            $email.siblings('#error_email').empty();
        } else if (!emailAvailable) {
            emailValid = false;
            $email.addClass('error');
            $email.siblings('#error_email').html(translate('This email is already in use'));
        }
    }

    function checkForInUseEmail(email) {
        return new Promise(resolve => {
            $.post(urlFrom('dependents/checkEmail'), { email })
                .then(data => resolve(data.success));
        });
    }

    function updateButtonLabel() {
        const button = $('#depend .btnSubmit');

        const emailVal = $('#depend #email').val();

        if (emailVal) {
            button.html(translate('Send invite'));
        } else {
            button.html(translate('Add'));
        }
    }

    $('#depend .btnSubmit').attr('type', 'button');

    $(document).on('click', '#depend .crosBtn', (e) => {
        $('form#dependents').trigger('reset');

        $('#depend .btnSubmit')
            .attr('type', 'button')
            .removeClass('dependentBtnEna')
            .addClass('dependentBtnDis');
    });

    $(document).on('reset', 'form#dependents', () => {
        resetForm();
    });

    const NO_ERROR = null;

    function auditField(field) {
        const value = $('#' + field).val().trim();

        if (value.length === 0) {
            return NO_ERROR;
        }

        return /^([a-zA-Z0-9_\+\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/.test(value)
        ? NO_ERROR
        : translate('Please provide a valid email');
    };

    let reader = new FileReader(),
        imageFile;

    async function readFile() {
        let Dependents = $('#dependents').data('DependentsObject');
        imageFile = await Dependents.editPhoto(imageFile, 2400, 2400);
        reader.readAsDataURL(imageFile)
    }

    reader.onloadend = function(e) {
        try {
            $('#image_preview').attr('src', e.target.result);
        } catch (err) {
            console.log('error: ', err);
        }
    };

    $('#image').on('change', function() {
        imageFile = $('#image')[0].files[0];
        const allowedImg = ['jpg', 'jpeg', 'png'];
        if (allowedImg.includes(imageFile.name.split('.').pop().toLowerCase())) {
            $('.image_preview').html('<img id="image_preview" />');
            readFile();
        } else {
            $('.image_preview').html(`<p id="err_msg"> ${translate('Format not allowed')}</p>`);
        }
    });
});
