"use strict";

const pageLinksHandler = pageLinksMethod => function (event) {
    const pageLinksObject = $('#page-links').data('PageLinksObject');

    if (pageLinksObject) {
        const method = pageLinksObject[pageLinksMethod];

        if (method) {
            event.stopPropagation(); // TODO : remove once old handlers are deleted

            method.call(pageLinksObject, $(this));
        } else {
            console.log(`PageLinks.${pageLinksMethod} was called but is not registered.`);
        }
    }
}

$(function() {
    $(document).on('click', '#page-links .page_link',
        pageLinksHandler('openPageLink')
    );

    $(document).on('click', '#page-links .back-container',
        pageLinksHandler('closePageLink')
    );
})