export default {
    add: function (birthdays, $placeholder, limit = null, message = null) {
        let $html = '';

        if (! birthdays.length) {
            return message ? $placeholder.html(message) : $placeholder.remove();
        }

        $.each(birthdays, function (i, birthday) {
            const canSendMessage = community.config.sidebar.directs || community.id === null;
            const birthdayIsToday = birthday.next_birthday === moment(new Date()).format('YYYY-MM-DD');

            const sendMsgHtml = /* template */`
                <span class="birthdayMessageContainer">
                    <div>
                        <a data-member="${ birthday.id }" class="messageMember" href="javascript:void(0)"> ${translate('Send them a message')}</a>
                    </div>
                    <div>
                        <a data-member="${ birthday.id }" class="ignoreBirthday" href="javascript:void(0)"> Ignore</a>
                    </div>
                <span>`;

            $html += /* template */`
                <div class="col"><div class="eventBlk">
                    <div class="_head">
                        <div class="icon">${birthday.format_day}<small>${birthday.format_month}</small></div>
                        <div class="name">
                            <h4>${birthday.first_name} ${birthday.last_name}</h4>
                            ${ canSendMessage && birthdayIsToday && ! birthday.is_seen ? sendMsgHtml : '' }
                        </div>
                        <div class="ico userPic">
                            <a href="#profile/${ birthday.id }">
                                <img
                                    src="${get_avatar_url(birthday.avatar, birthday.id, 'p100x100')}"
                                    alt="avatar" title="${birthday.first_name} ${birthday.last_name}"
                                />
                            </a>
                        </div>
                    </div>
                </div></div>`;
        });

        if (limit && birthdays.length > limit) {
            $html += /* template */`<div class="col more-events"><a href="#events">${translate('More')}...</a><div>`;
        }

        $placeholder.children('.appLoad').after($html);
        $placeholder.children('.appLoad').remove();
        $placeholder.removeClass('hidden');
    }
};
