"use strict";

/**
 * Factory of event handlers for Connections events.
 *
 * $(#appLd).on(eventName, targetSelector,
 *      connectionsHandler(connectionsMethodName)
 * );
 */
const connectionsHandler = (connectionsMethod) => event => {
    const connectionsObject = $('#connections').data('ConnectionsObject');

    if (connectionsObject) {
        const method = connectionsObject[connectionsMethod];

        if (method) {
            event.stopPropagation(); // TODO : remove once old handlers are deleted

            method.call(connectionsObject, $(event.target), event);
        } else {
            console.log(`ConnectionsObject.${connectionsMethod} was called but is not registered.`);
        }
    }
}

/**
 * Set up connections-related event listeners below.
 */
$(function() {
    $('#appLd').on('click', '.viewMore.friends',
        connectionsHandler('viewMoreFriends')
    );

    $('#appLd').on('click', '.viewMore.community',
        connectionsHandler('viewMoreCommunityMembers')
    );

    $('#appLd').on('click', '.viewLst > li',
        connectionsHandler('toggleviewLst')
    );

    $('#appLd').on('click', '#searchConnections button',
        connectionsHandler('toggleSearchInput')
    );
});
