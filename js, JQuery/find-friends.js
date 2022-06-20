/**
 * Find friends in Squirrel that match the given contact list
 * @param {array} contacts - { email, phone }
 * @returns An array of friends found in Squirrel { id, display_name, avatar }
 */
export default function findFriends(contacts) {
    return new Promise((resolve, reject) => {
        // Eliminate fields that we don't need to send to improve speed and data usage
        const filtered = contacts.map((c) => ({ phone: c.phone, email: c.email }));

        $.ajax({
            url: urlFrom('friends/by-contacts'),
            type: 'POST',
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify({ contacts: filtered }),
            dataType: 'json',
            async: false,
            success: (data) => {
                resolve(data.friends);
            },
            error: reject,
        })
    });
};
