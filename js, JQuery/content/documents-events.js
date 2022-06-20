"use strict";

const documentsHandler = documentsMethod => function (event) {
    const documentsObject = $('#documents').data('DocumentsObject');

    if (documentsObject) {
        const method = documentsObject[documentsMethod];

        if (method) {
            event.stopPropagation(); // TODO : remove once old handlers are deleted

            method.call(documentsObject, $(this), event);
        } else {
            console.log(`Documents.${documentsMethod} was called but is not registered.`);
        }
    }
}

$(function() {
    $(document).on('click', '#documents .document-list .clickHandler',
        documentsHandler('openDocument')
    );

    $(document).on('click', '#documents .document .members, #documents .document-list .itemDetails .members',
        documentsHandler('showMembers')
    );

    $(document).on('click', '#documents [data-button="gallery-pdf"]',
        documentsHandler('showMediaModal')
    );

    $('#appLd').on('click', '#documents .post-widget .engageBackBtn',
        documentsHandler('hideMediaModal')
    );
})
