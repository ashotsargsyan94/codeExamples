"use strict";

/**
 * Factory of event handlers for Live events.
 *
 * $(#appLd).on(eventName, targetSelector,
 *      liveHandler(galleryMethodName)
 * );
 */
const liveHandler = (liveMethod) => event => {
    const liveObject = $('#broadcast').data('LiveObject');

    if (liveObject) {
        const method = liveObject[liveMethod];

        if (method) {
            event.stopPropagation(); // TODO : remove once old handlers are deleted

            method.call(liveObject, $(event.target), event);
        } else {
            console.log(`Live.${liveMethod} was called but is not registered.`);
        }
    }
}


/**
 * Set up gallery-related event listeners below.
 */

$(document).on('navigation.live.initialized',
    liveHandler('initialized')
);

$(window).on('beforeunload',
    liveHandler('unregister')
);
$(document).on('navigation.pagechange',
    liveHandler('unregister')
);

$('#appLd').on('submit', 'form#postLive',
    liveHandler('submitForm')
);

$('#appLd').on('click', '#broadcast #start_publish_button', function(event){
    event.preventDefault();
    event.stopPropagation();

    if ($(this).attr('disabled')) {
        return false;
    }

    $('form#postLive').submit();
});

$('#appLd').on('click', '#broadcast #stop_publish_button',
    liveHandler('stopStreaming')
);

$('#appLd').on('click', '#broadcast .video-cancel-btn',
    liveHandler('closeStreaming')
);

$('#appLd').on('click', '#broadcast .video-mic-btn',
    liveHandler('toggleMic')
);

$('#appLd').on('click', '#broadcast .video-cam-btn',
    liveHandler('toggleCam')
);

$('#appLd').on('click', '#broadcast .video-settings-btn',
    liveHandler('toggleSettings')
);

$('#appLd').on('click', '#broadcast .video-viewers-btn, #broadcast .video-viewers-popup-close',
    liveHandler('toggleViewers')
);

$(document).on('keydown', '#postLive textarea[name="message"]', function (e) {
    if (e.keyCode === 13 && ! e.shiftKey) {
        e.preventDefault();
        $(this).parents('form').submit();
    }
});
