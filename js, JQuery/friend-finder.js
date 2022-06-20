import getInviteCode from './get-invite-code.js';

const webView = window.nsWebViewInterface;

export function updateSMSInviteList(contacts) {
    const $smsInviteList = $('#smsInviteList');
    $smsInviteList.html('');
    contacts.forEach((contact) => {
        const template = smsInviteTemplate(contact);
        const $invite = $(template).appendTo($smsInviteList);
        $invite.find('button').click((event) => {
            event.preventDefault();
            event.stopPropagation();
            // Don't allow any more taps on this button.
            $(this).attr('disabled', true);
            sendSMSInvite(contact);
        });
    });
}

export function updateFriendFinderList(friends) {
    const $friendFinderList = $('#friendFinderList');
    $friendFinderList.html('');

    const friendsText = friends.length === 1 ? translate('Friend') : translate('Friends');
    $('#numFriendsFound').html(`${friends.length} ${friendsText} ${translate('Found')}`);

    friends.forEach((friend) => {
        const template = friendInviteTemplate(friend);
        const $invite = $(template).appendTo($friendFinderList);

        $invite.find('button').click((event) => {
            event.preventDefault();
            event.stopPropagation();

            // Don't allow any more taps on this button
            $(this).attr('disabled', true);

            return $.post(urlFrom(`friends/sendRequest/${ friend.id }`)).then(() => {
                markRequestAsSent($(`#friend-${ friend.id }`), translate('Friend request sent!'));
            }).catch((error) => {
                webView.emit('alert', translate('Oops! We were unable to send your friend request.'));
                $(this).attr('disabled', false);
                console.error(error);
            });
        });
    });
}

function markRequestAsSent($element, message) {
    // Remove Send button & lessen opacity
    $element.find('button').remove();
    $element.find('.inr').css('opacity', 0.5);
    const sentTemplate = /* template */`
        <div class="invite-sent">${message}</div>
    `;
    $element.find('.invite-sent').remove();
    $(sentTemplate).appendTo($element.find('.inr'));
}

function sendSMSInvite(contact) {
    webView.on('smsInviteSent', (contact_id) => {
        markRequestAsSent($(`#contact-${contact_id}`), translate('Sent!'));
    });
    getInviteCode().then(({ success, inviteCode }) => {
        if (success === true) {
            let message = `${translate('Join me on Squirrel. Say goodbye to advertisements and data mining. Say hello to Squirrel, your new and improved social network.')} \n\n${translate("Use my referral code {{ inviteCode }} and check it out here.", { inviteCode })} \nhttps://www.isquirrel.com`;

            webView.emit('sendSMSInvite', { contact, message });
        } else {
            webView.emit('alert', translate('Oops! We were unable to retrieve your invite code'));
        }
    }).catch((error) => {
        webView.emit('alert', translate('Oops! We were unable to retrieve your invite code'));
    });
}

function friendInviteTemplate(friend) {
    return /* template */`
        <li id="friend-${friend.id}">
            <div class="inr">
                <div class="ico"><img src="${friend.avatar}"></div>
                <span>${friend.display_name}</span>
                <button class="plusBtn"></button>
            </div>
        </li>
    `;
}

function smsInviteTemplate(contact) {
    return /* template */`
        <li id="contact-${contact.contact_id}">
            <div class="inr">
                <span>${contact.display_name}<small>${contact.phone}</small></span>
                <button class="submtBtn"></button>
            </div>
        </li>
    `;
}