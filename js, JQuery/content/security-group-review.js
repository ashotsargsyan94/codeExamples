function SecurityGroupReview(manager, memberId, fieldId, securityGroupId) {
    this.manager = manager;
    this.memberId = memberId;
    this.fieldId = fieldId;
    this.securityGroupId = securityGroupId;
}

SecurityGroupReview.prototype = {
    init() {
        const url = urlFrom(`additionalFields/field/${this.memberId}/${this.fieldId}/${this.securityGroupId}`);
        const appLd = $('#appLd');

        $.get(url).then(response => {
            $('.label').html(response.field.label);
            $('.memberName').html(response.memberName);
            $('.securityGroup').html(response.securityGroup);

            if (response.memberBelongsToSecurityGroup) {
                appLd.find('form').addClass('hidden');
                appLd.find('#memberBelongsToSecurityGroupMessage').removeClass('hidden');
            }
        });

        $('#appLd .btn.yes').on('click', () => {
            const url = urlFrom(`additionalFields/reviewSecurityGroup/${this.memberId}/${this.fieldId}/${this.securityGroupId}`)

            $.post(url).then(response => {
                if (response.success) {
                    appLd.find('form').addClass('hidden');
                    appLd.find('#memberAddedSuccessfullyMessage').removeClass('hidden');
                }
            });
        });

        $('#appLd .btn.no').on('click', () => {
            window.goBack();
        });

    }
}
