"use strict";

function Privacy(manager) {
    this.manager = manager;

    $('#privacy').data('PrivacyObject', this);
}

Privacy.prototype = {
    init() {
        this.loadData().then(
            this.setContent.bind(this)
        )
    },

    loadData() {
        return $.post(urlFrom('load/settings')).fail(showNetworkError);
    },

    setContent({user}) {
        $('.twoFASwitch input').prop('checked', user.mfa_enabled == true).css('pointer-events', 'initial');
    },

    updatePrivacySetting(target, event) {
        event.preventDefault();

        const key = target.get(0).name;
        const value = target.get(0).checked;

        $.post(urlFrom('account/updatePrivacy'), {
            key: key,
            value: value
        })
            .then(response => {
                if (response.success) {
                    showMessage(response.message, 1000);
                }
            })
            .fail(showGenericError)
            .always(() => {
                this.init();
            });
    }
};
