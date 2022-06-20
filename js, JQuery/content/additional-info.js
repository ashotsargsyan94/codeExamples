"use strict";

function AdditionalInfo(manager) {
    this.manager = manager;
    this.communities = [];

    $('#additional-info').data('AdditionalInfoObject', this);
}

AdditionalInfo.prototype = {
    init() {
        this.loadData().then(
            this.setContent.bind(this)
        )
    },

    loadData() {
        return $.post(urlFrom('community/listAdditionalFieldsRequired')).fail(showNetworkError);
    },

    setContent({ communities }) {
        this.clearContent();

        if (communities.length > 0) {
            let communitiesList = '';
            this.communities = communities;

            $.each(communities, (_, community) => {
                communitiesList += /* template */`
                    <li class="community-list">
                        <div class="ico"><img src="${ community.logo }" alt=""></div>
                        <strong>
                            ${ community.short_name }
                            <br/>
                            <div class="ellipsis description">${ community.description }</div>
                        </strong>
                        <div class="bTn">
                            <a data-community-id="${community.id}" class="showAdditionalInfo webBtn smBtn smplBtn">
                                ${ community._additionalInfoRequired ? translate('Submit') : translate('Edit') }
                            </a>
                        </div>
                    </li>`;
            });

            $('#communityWrapper').html(`
                <ul class="grpChnlLst scrollbar">
                    ${communitiesList}
                </ul>
            `);
        } else {
            $('#communityWrapper').html(`<p>${translate('Any of communities required additional information')}</p>`);
        }
    },

    clearContent() {
        $('#communityWrapper').empty();
    },

    prepareAdditionalInfoPopup(target) {
        const communityId = target.data('community-id');
        const communityIndex = this.communities.findIndex(item => (item.id == communityId));

        if (communityIndex > -1) {
            this.showAdditionalDataPopup(this.communities[communityIndex]);
        } else {
            showError(translate('Community not found'));
        }
    },

    showAdditionalDataPopup(communityItem) {
        $(`.popup[data-popup=join-community]`).addClass('required').html(
            this._additionalDataTemplate(this._prepareForm(
                communityItem.additional_fields,
                communityItem._additionalInfoRequiredSubmit),
                ! communityItem._additionalInfoRequired
            )
        ).fadeIn();

        $('#additionalFields').data('community-id', communityItem.id);

        $('[data-toggle="tooltip"]').tooltip();
    },

    additionalFieldsSubmit(target, event) {
        event.preventDefault();

        const data = encodeURIComponent(JSON.stringify(
            target.serializeArray()
        ));

        const communityId = target.data('community-id');

        $.post(urlFrom('community/additionalFieldsSubmit'), {
            data: data,
            communityId: communityId
        }).then(response => {
            if (response.success) {
                showMessage(response.message, 1000);

                $('[data-popup="join-community"]').slideUp();

                this.init();

                if (communityId == community.id) {
                    community._additionalInfoRequiredSubmit = response.additionalInfoRequiredSubmit;
                    community._additionalInfoRequired = false;
                }
            }
        }).fail(showNetworkError);
    },

    _prepareForm(fields, data) {
        let formElements = '';
        let isRequired;

        fields = fields || [];
        data = data === '' ? [] : JSON.parse(data);

        for (const index in fields) {
            isRequired = fields[index].required ? 'required' : '';
            formElements += this._getElement(fields[index], false, data, isRequired);
        }

        return formElements;
    },

    _getValue(elItem, data, parentId) {
        let value = '';
        let valueIndex;

        if (data == null) {
            return value;
        }

        if (parentId) {
            valueIndex = data.findIndex(item => (item.value == elItem.id));
        } else {
            valueIndex = data.findIndex(item => (item.id == elItem.id));
        }

        if (valueIndex > -1) {
            value = data[valueIndex].value;
        }

        if (value && (elItem.type == 'checkbox' || elItem.type == 'radio')) {
            return 'checked';
        } else if (value && elItem.type == 'option') {
            return 'selected';
        }

        return value;
    },

    _getElement(elItem, parentId, data, isRequired) {
        let element = '';

        switch(elItem.type) {
            case 'text':
                element += this._getLabel(elItem , 'form-check-label');
                element += '<input class="form-control" type="text" name="' + elItem.id + '" value="' + this._getValue(elItem, data, parentId) + '" ' + isRequired + '>';
                element = '<div class="form-group">' + element + '</div>';
                break;
            case 'textarea':
                element += this._getLabel(elItem, 'form-check-label');
                element += '<textarea class="form-control" name="' + elItem.id + '" ' + isRequired + '>' + this._getValue(elItem, data, parentId) + '</textarea>';
                element = '<div class="form-group">' + element + '</div>';
                break;
            case 'checkbox':
                if (parentId) {
                    element += '<input class="form-check-input" type="checkbox" name="' + parentId + '" value="' + elItem.id + '" id="frm_el_' + elItem.id + '" ' + this._getValue(elItem, data, parentId) + ' ' + isRequired + '>';
                    element += this._getLabel(elItem, 'form-check-label');
                    element = '<div class="form-check">' + element + '</div>';
                } else {
                    element += this._getLabel(elItem, 'form-check-label');
                    element += '<input class="form-check-input" type="checkbox" name="' + elItem.id + '" value="' + elItem.id + '" id="frm_el_' + elItem.id + '" ' + this._getValue(elItem, data, parentId) + ' ' + isRequired + '>';
                    element = '<div class="form-group">' + element + '</div>';
                }
                break;
            case 'radio':
                if (parentId) {
                    element += '<input class="form-check-input" type="radio" name="' + parentId + '" value="' + elItem.id + '" id="frm_el_' + elItem.id + '" ' + this._getValue(elItem, data, parentId) + ' ' + isRequired + '>';
                    element += this._getLabel(elItem, 'form-check-label');
                    element = '<div class="form-check">' + element + '</div>';
                } else {
                    element += this._getLabel(elItem, 'form-check-label');
                    element += '<input class="form-check-input" type="radio" name="' + elItem.id + '" value="' + elItem.id + '" id="frm_el_' + elItem.id + '" ' + this._getValue(elItem, data, parentId) + ' ' + isRequired + '>';
                    element = '<div class="form-group">' + element + '</div>';
                }
                break;
            case 'radio_group':
            case 'checkbox_group':
                element += this._getLabel(elItem, 'form-check-label');
                element += this._getSubElements(elItem, data);
                element = '<div class="form-group">' + element + '</div>';
                break;
            case 'option':
                element += '<option value="' + elItem.id + '" ' + this._getValue(elItem, data, parentId) + '>' + elItem.label + '</option>';
                break;
            case 'dropdown':
                element += this._getLabel(elItem, 'form-check-label');
                element += '<select class="form-control" name="' + elItem.id + '" ' + isRequired + '><option></option>' + this._getSubElements(elItem, data) + '</select>';
                element = '<div class="form-group">' + element + '</div>';
                break;
        }

        return element;
    },

    _getSubElements(parent, data) {
        let subElements = '';
        let isRequired;
        for (const index in parent.group) {
            isRequired = parent.required ? 'required' : '';
            subElements += this._getElement(parent.group[index], parent.id, data, isRequired);
        }

        return subElements;
    },

    _getLabel(elItem, elClass) {
        const icon = (typeof elItem.icon != 'undefined' && elItem.icon != '')
                ? '<img src="/assets/images/site_icon/' + elItem.icon + '" alt="" width="20px" class="mr-1 mb-1 icon"/> '
                : '';

        const hint = (typeof elItem.hint != 'undefined' && elItem.hint != '' )
                ? '<span class="pl-1 text-primary" data-toggle="tooltip" data-placement="top" title="' + elItem.hint + '"><i class="fas fa-info-circle" aria-hidden="true"></i></span>'
                : '';

        return '<div style="display:inline-block"><label for="frm_el_' + elItem.id + '" class="' + elClass + '">' +  icon + elItem.label + '</label>' + hint + '</div>';
    },

    _additionalDataTemplate(additionalFields, isEdit) {
        let translate = window.translate;
        const crosBtn = isEdit ? '<div class="crosBtn"></div>' : '';
        const submitBtn = isEdit ? translate('Edit') : translate('Submit');

        if (additionalFields) {
            return`
                <div class="tableDv">
                <div class="tableCell">
                    <div class="contain">
                        <div class="_inner additional-info">
                            <h2><a class="stepBack fi-arrow-left step backBtn" href="javascript:void(0)" /> </h2>
                            ${crosBtn}
                            <h3>${translate('This community requires additional info to join.')}</h3>
                            <p>${translate('Please complete the fields below.')}</p>
                            <div class="step step-1">
                                <form action="" method="post" id="additionalFields" data-community-id="">
                                    ${additionalFields}

                                    <button type="submit" class="btn btn-primary">${submitBtn}</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            `;
        } else {
            return`
                <div class="tableDv">
                <div class="tableCell">
                    <div class="contain">
                        <div class="_inner additional-info">
                            <h2><a class="stepBack fi-arrow-left step hidden" /> </h2>
                            ${crosBtn}
                            <h3>${translate("This community doesn't require additional info to join.")}</h3>
                        </div>
                    </div>
                </div>
            </div>
            `;
        }
    }
};
