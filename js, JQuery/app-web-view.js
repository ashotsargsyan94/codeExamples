import Navigation from './navigation-app-web-view.js';

$(function () {
    "use strict";

    class Loader {
        api(url, data = {}) {
            return $.post(urlFrom(url), data)
                .always(() => {
                    $('#cmntLoader').hide();
                    ajaxSearch = false;
                }).fail(console.log);
        }
    }
});

$(document).on("scroll", function () {
    $("video").each(function () {
        if (! isInView($(this)[0])) {                    // video not visible
            if (! $(this)[0].paused) $(this)[0].pause(); // pause if not paused
        }
    });
});