"use strict";

/**
 * Certification handles the following hash uris:
 *      #certification/<slug>
 *
 * @param {ContentManager} manager
 * @param {string} slug
 */
function Certification(manager, slug) {
    this.manager = manager;
    this.slug = typeof slug != 'undefined' ? slug : null;
    this.elemets = [];

    this.manager.render('cardPopup').in('#badges');

    $('#badges').data('CertificationObject', this);
}

Certification.prototype = {
    widget(memberId, container) {
        const uri =  `certifications/member/${ memberId }`;

        this.fetchData(uri).then(response => {
            this.setBadgesContent(response.badges, container);
        });
    },


    review() {
        $('#appLd').removeClass('hidden');

        if (! this.slug) {
            showError('Uri to form is wrong');
            return;
        }

        const url = urlFrom(`certifications/index/${this.slug}`);

        $.get(url).then(response => {
            this.setReviewContent(response.form);
        }).fail(({ responseJSON }) => {
            showError(responseJSON.error || 'Something went wrong. Please try again.');

            $('#formWrapper').append(responseJSON.error || '');
        });
    },

    fetchData(uri) {
        this.fetchingData = true;

        $("#cmntLoader").fadeIn();

        const lastLoadedId = $('#badges .mediaLst:first > .card-root:last').data('lastLoadedId') || null;

        this.jqXHR = $.post(urlFrom(uri), {lastLoadedId});

        this.jqXHR.always(() => this.fetchingData = false).then(response => {
            if (this.bottomReached = response.lastBatch) {
                $("#cmntLoader").fadeOut();
            }

            return response;
        }).catch(showNetworkError);

        return this.jqXHR;
    },

    setBadgesContent(badges, container) {
        if (badges.length > 0) {
            $('#badges-tab').removeClass('hide');
            this.addBadges(badges, container);
        }
    },

    addBadges(badges, container) {
        $.each(badges, (_, badge) => {
            const src_regex = /(http(s?)):\/\//;

            const data = {
                id: badge.id,
                image: src_regex.test(badge.image.toLowerCase())
                    ? badge.image
                    : get_file_url(badge.image, 'badges', 'p150x150'),
                title: badge.title,
                description: badge.description,
                owner: badge.member_id
            };

            this.elemets.push(data);

            this.manager
                .render('cardBadge', data)
                .in(container, this.manager.MODE_APPEND)
                .data('lastLoadedId', badge.id);
        });
    },

    removeBadge($btn) {
        const badgeId = $btn.data('bage-id');

        $.post(urlFrom('certifications/removeBadge'), { badgeId }).then(response => {
            showMessage(response.message);

            location.reload();
        }).fail(showNetworkError);
    },

    showBadgeModal($card) {
        const image = $($card).attr('src').replace("p150x150", "p400x400");
        const id = $($card).data('badge-id');
        const elementIndex = this.elemets.findIndex(item => item.id == id);

        if (elementIndex == -1) {
            showError(translate('Something went wrong'));
            return;
        }

        const badge = this.elemets[elementIndex];
        const removeBadgeBtn = member.id == badge.owner
            ? `<button class="btn btn-danger removeBadge" data-bage-id="${ id }">${ translate('Remove from Profile') }</button>`
            : ``;
        const badgeTemplate = `<div>
            ${removeBadgeBtn}
            <img src="${image}" alt="${badge.title}"/>
            <h2>${badge.title}</h2>
            <div>${badge.description}</div>
        </div>`;

        $('#badgeWrapper').html(badgeTemplate);
        $('body').addClass('flow');
        $('[data-popup="badge"]').show();
        $('#badges').addClass('blur');
    },

    setReviewContent(form) {
        this.clearContent();

        const lastSubmitDateMessage = (form.submited_at != null) ? 'Submitted at ' + moment(form.submited_at).format('DD/MM/YYYY') : ''

        this.manager.render('form', {
            certification: form.title,
            badge: get_file_url(form.image, 'badges', 'p150x150'),
            name: form.name,
            intro: form.intro,
            formElements: this.prepareForm(form._submitedData),
            lastSubmitDateMessage: lastSubmitDateMessage,
            submitBy: form.submited_by,
        }).in('#formWrapper', this.manager.MODE_INSERT);

        $('[data-toggle="tooltip"]').tooltip();
    },

    prepareForm(options) {
        let formElements = '';

        this.elements = options;

        for (const index in this.elements) {
            formElements += this.getElement(this.elements[index], false);
        }

        return formElements
    },

    getElement(elItem, parent) {
        let element = '';
        const checked = (elItem.id == (parent ? parent.value : elItem.value)) ? 'checked' : '';

        switch(elItem.type) {
            case 'text':
                element += this.getLabel(elItem , 'form-check-label');
                element += '<input class="form-control" type="text" name="' + elItem.id + '" value="' + elItem.value + '" disabled>';
                element = '<div class="form-group">' + element + '</div>';
                break;
            case 'textarea':
                element += this.getLabel(elItem, 'form-check-label');
                element += '<textarea class="form-control" name="' + elItem.id + '" disabled>' + elItem.value + '</textarea>';
                element = '<div class="form-group">' + element + '</div>';
                break;
            case 'checkbox':
                if (parent) {
                    element += '<input class="form-check-input" type="checkbox" name="' + parent.id + '" value="' + elItem.id + '" id="frm_el_' + elItem.id + '" disabled ' + checked + '>';
                    element += this.getLabel(elItem, 'form-check-label');
                    element = '<div class="form-check">' + element + '</div>';
                } else {
                    element += this.getLabel(elItem, 'form-check-label');
                    element += '<input class="form-check-input" type="checkbox" name="' + elItem.id + '" value="' + elItem.id + '" id="frm_el_' + elItem.id + '" disabled ' + checked + '>';
                    element = '<div class="form-group">' + element + '</div>';
                }
                break;
            case 'radio':
                if (parent) {
                    element += '<input class="form-check-input" type="radio" name="' + parent.id + '" value="' + elItem.id + '" id="frm_el_' + elItem.id + '" disabled ' + checked + '>';
                    element += this.getLabel(elItem, 'form-check-label');
                    element = '<div class="form-check">' + element + '</div>';
                } else {
                    element += this.getLabel(elItem, 'form-check-label');
                    element += '<input class="form-check-input" type="radio" name="' + elItem.id + '" value="' + elItem.id + '" id="frm_el_' + elItem.id + '" disabled ' + checked + '>';
                    element = '<div class="form-group">' + element + '</div>';
                }
                break;
            case 'radio_group':
            case 'checkbox_group':
                element += this.getLabel(elItem, 'form-check-label');
                element += this.getSubElements(elItem);
                element = '<div class="form-group">' + element + '</div>';
                break;
            case 'option':
                const selected = (elItem.id == (parent ? parent.value : elItem.value)) ? 'selected' : '';

                element += '<option value="' + elItem.id + '" ' + selected + '>' + elItem.label + '</option>';
                break;
            case 'dropdown':
                element += this.getLabel(elItem, 'form-check-label');
                element += '<select class="form-control" name="' + elItem.id + '" disabled><option></option>' + this.getSubElements(elItem) + '</select>';
                element = '<div class="form-group">' + element + '</div>';
                break;
        }

        return element;
    },

    getSubElements(parent) {
        let subElements = '';
        for (const index in parent.group) {
            subElements += this.getElement(parent.group[index], parent);
        }

        return subElements;
    },

    getLabel(elItem, elClass) {
        const icon = (typeof elItem.icon != 'undefined' && elItem.icon != '')
                ? '<img src="/assets/images/site_icon/' + elItem.icon + '" alt="" width="20px" class="mr-1 mb-1 icon"/> '
                : '';

        const hint = (typeof elItem.hint != 'undefined' && elItem.hint != '' )
                ? '<span class="pl-1 text-primary" data-toggle="tooltip" data-placement="top" title="' + elItem.hint + '"><i class="fas fa-info-circle" aria-hidden="true"></i></span>'
                : '';

        return '<div style="display:inline-block"><label for="frm_el_' + elItem.id + '" class="' + elClass + '">' +  icon + elItem.label + '</label>' + hint + '</div>';
    },

    clearContent() {
        this.bottomReached = false;

        $('#formWrapper').empty();
    },

    passCetification($form, event) {
        event.preventDefault();

        this._certificationReview($form, this.slug, 'pass');
    },

    failCetification($form, event) {
        event.preventDefault();

        this._certificationReview($form, this.slug, 'fail');
    },

    _certificationReview($form, slug, pass) {
        const comment = $('#certificationComment').val();
        this._disableButtons(true);
        $('.preloader').toggleClass('hide');
        $('#certificationComment').removeClass('error');

        if (! pass && comment.length == 0) {
            $('#certificationComment').addClass('error');
            $('.preloader').toggleClass('hide');
            this._disableButtons(false);

            return false;
        }

        $.post(urlFrom('certifications/review'), { slug, pass, comment }).then(response => {
            $form.find('.lastSubmit').html('Last submitted: ' + moment().format('DD/MM/YYYY'));

            showMessage(response.message);

            window.goBack();
        }).fail(({ responseJSON }) => {
            $('.preloader').toggleClass('hide');
            this._disableButtons(false);
            showError(responseJSON.error || 'Something went wrong. Please try again.');
        });
    },

    _disableButtons(isDisabled) {
        $('#passCetification').attr('disabled', isDisabled);
        $('#failCetification').attr('disabled', isDisabled);
    }
}
