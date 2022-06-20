"use strict";

/**
 * Form handles the following hash uris:
 *      #forms/<slug>
 *
 * @param {ContentManager} manager
 * @param {string} slug
 */
function Forms(manager, slug) {
    this.manager = manager;
    this.slug = typeof slug != 'undefined' ? slug : null;
    this.elements = [];

    $('#communityForm').data('FormObject', this);
}

Forms.prototype = {

    init() {
        $('#appLd').removeClass('hidden');

        this.loadData().then(response => {
            if (response.success) {
                this.setContent(response);
            } else {
                showError(response.message);

                $('#formWrapper').append(response.message);
            }
        });
    },

    async widget() {
         return this.loadData().then(response => {
            if (response.success) {

                const lastSubmitDateMessage = (response.lastSubmit != null)
                    ? 'Last submitted: ' + moment(response.lastSubmit.created_at).format('L')
                    : '';

                return {
                    name: response.form.name,
                    intro: response.form.intro,
                    formElements: this.prepareForm(response.form.options),
                    lastSubmitDateMessage: lastSubmitDateMessage
                };
            } else {
                return response.message;
            }
        });
    },

    loadData() {
        return new Promise((resolve, reject) => {
            if (! this.slug) {
                reject('Uri to form is wrong');
            }

            $.get({
                url: base_url + `/forms/index/${this.slug}`,
                success: resolve,
                error: reject,
            });
        });
    },

    setContent({ form, lastSubmit}) {
        this.clearContent();

        const lastSubmitDateMessage = (lastSubmit != null) ? 'Last submitted: ' + moment(lastSubmit.created_at).format('DD/MM/YYYY') : ''

        this.manager.render('form', {
            name: form.name,
            intro: form.intro,
            formElements: this.prepareForm(form.options),
            lastSubmitDateMessage: lastSubmitDateMessage
        }).in('#formWrapper', this.manager.MODE_INSERT);

        $('[data-toggle="tooltip"]').tooltip();
    },

    clearContent() {
        $('#formWrapper').empty();
    },

    prepareForm(options) {
        let formElements = '';
        this.elements = options || [];

        for (const index in this.elements) {
            formElements += this.getElement(this.elements[index], false, this.elements[index].required);
        }

        return formElements
    },

    getElement(elItem, parentId, isRequired) {
        let element = '';
        let required = isRequired ? 'required="required"' : '';

        switch(elItem.type) {
            case 'text':
                element += this.getLabel(elItem , 'form-check-label');
                element += `<input class="form-control" type="text" name="${elItem.id}" ${required}>`;
                element = `<div class="form-group">${element}</div>`;
                break;
            case 'textarea':
                element += this.getLabel(elItem, 'form-check-label');
                element += `<textarea class="form-control" name="${elItem.id}" ${required}></textarea>`;
                element = `<div class="form-group">${element}</div>`;
                break;
            case 'checkbox':
                if (parentId) {
                    element += `<input class="form-check-input" type="checkbox" name="${parentId}" value="${elItem.id}" ${required}>`;
                    element += this.getLabel(elItem, 'form-check-label');
                    element = `<div class="form-check">${element}</div>`;
                } else {
                    element += this.getLabel(elItem, 'form-check-label');
                    element += `<input class="form-check-input" type="checkbox" name="${elItem.id}" value="${elItem.id}" ${required}>`;
                    element = `<div class="form-group">${element}</div>`;
                }
                break;
            case 'radio':
                if (parentId) {
                    element += `<input class="form-check-input" type="radio" name="${parentId}" value="${elItem.id}" ${required}>`;
                    element += this.getLabel(elItem, 'form-check-label');
                    element = `<div class="form-check">${element}</div>`;
                } else {
                    element += this.getLabel(elItem, 'form-check-label');
                    element += `<input class="form-check-input" type="radio" name="${elItem.id}" value="${elItem.id}" ${required}>`;
                    element = `<div class="form-group">${element}</div>`;
                }
                break;
            case 'radio_group':
            case 'checkbox_group':
                element += this.getLabel(elItem, 'form-check-label');
                element += this.getSubElements(elItem);
                element = `<div class="form-group">${element}</div>`;
                break;
            case 'option':
                element += `<option value="${elItem.id}">${elItem.label}</option>`;
                break;
            case 'dropdown':
                element += this.getLabel(elItem, 'form-check-label');
                element += `<select class="form-control" name="${elItem.id}" ${required}><option></option>${this.getSubElements(elItem)}</select>`;
                element = `<div class="form-group">${element}</div>`;
                break;
        }

        return element;
    },

    getSubElements(parent) {
        let subElements = '';
        for (const index in parent.group) {
            subElements += this.getElement(parent.group[index], parent.id, parent.required);
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

        return `<div style="display:inline-block"><label class="${elClass}">${icon} ${elItem.label}</label>${hint}</div>`;
    },

    submitForm($form, event) {
        event.preventDefault();
        $form.find('button').attr("disabled", true);
        const data = encodeURIComponent(JSON.stringify($form.serializeArray()));

        $.post(urlFrom('forms/submit'), {
            slug: this.slug,
            data: data
        }).then(response => {
            if (response.success) {
                showMessage(response.message);
                $form.find('.lastSubmit').html('Last submitted: ' + moment().format('L'));
                $form.find('button').attr("disabled", false);
            }

            // TODO send to proper place
            window.goBack();

        }).fail(showNetworkError);
    }
}
