/**
 * jQuery UrlPreview
 *
 * A jQuery plugin to show previews of url found in textarea.
 *
 */
(function ($) {

    var eContainer = null;
    var eTextArea = null;
    var fnOnComplete = null;
    var oOptions = null;
    var strTargetUrl = null;
    var lastUrl = null;

    /**
     * Make a textarea support url detection.
     */
    $.fn.urlpreview = function (method, args) {
        switch (method) {
            case 'init':
                init(args, this);
                break;
            case 'getVideoEmbedUrl':
                return getVideoEmbedUrl(args);
                break;
        }
    };

    function init(args, e) {
        var strUrlDataUrl = args.targetUrl,
            oOpts = args.opts,
            timer = 0;

        eTextArea = e;
        eContainer = eTextArea.parent();
        strTargetUrl = strUrlDataUrl;
        oOptions = $.extend({
            'debugMode': false,
        }, oOpts);

        eTextArea.on('input', function () {
            var _this = this;
            clearTimeout(timer);

            timer = setTimeout(function () {
                var url = $(_this).val().match(/((https?:\/\/)|(www\.))([a-zA-Z0-9.-]+\.[A-Za-z]{2,4})(:[0-9]+)?(\S*)?/ig),
                    currentUrl = eContainer.parent().find('.comment-attach-url-url').val();

                if (url && (url != currentUrl || currentUrl == undefined) && !eContainer.closest('form').find('input.attach').length) {
                    showUrlPreview(url[0], strUrlDataUrl);
                }
            }, 300);
        });
    }

    function showUrlPreview(url, endpointUrl) {
        var oData = {url: url};

        if (fnOnComplete == undefined) {
            fnOnComplete = function (oData) {
                var data = oData.data;

                if (data.url == lastUrl || data.url == `http://${lastUrl}` || data.url == `https://${lastUrl}`) {
                    renderPreview(data);
                }
            }
        }

        if (oOptions.token !== 'undefined') {
            oData.token = oOptions.token;
        }

        lastUrl = url;

        $.getJSON(endpointUrl, oData, fnOnComplete);
    }

    function renderPreview(urlData) {
        if (urlData !== undefined)
            if (urlData.url) {
                urlData.url = urlData.url;
                urlData.url_title = urlData.title;
                urlData.url_sitename = urlData.sitename;
                urlData.url_description = urlData.description;


                if (urlData.images.length) {
                    urlData.url_image = urlData.images[0].url;
                }

                $(eContainer).parent().find('.comment-attach-container.url-preview').remove();
                $(eContainer).after(renderUrlPreviewTemplate(urlData));
                $(eContainer).parent().find('.comment-attach-container .close-url-preview').show();
            }
    }

    function getVideoEmbedUrl(url) {
        var pattern1 = /(?:http?s?:\/\/)?(?:www\.)?(?:vimeo\.com)\/?(.+)/g;
        var pattern2 = /(?:http?s?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(\w+)(?:.*)/g;

        if (pattern1.test(url)) {
            var replacement = '//player.vimeo.com/video/$1';
            return url.replace(pattern1, replacement);
        } else if (pattern2.test(url)) {
            var replacement = '//www.youtube.com/embed/$1';
            return url.replace(pattern2, replacement);
        }

        return null;
    }
})(jQuery);

function renderUrlPreviewTemplate(urlData) {
    var mediaDiv = '';

    if (embedVideoUrl = $.fn.urlpreview('getVideoEmbedUrl', urlData.url)) {
        mediaDiv = `
            <div class='url-video'>
                <iframe src="${embedVideoUrl}" width="1280" height="720" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
        `;
    } else if (urlData.url_image) {
        mediaDiv = `
            <div class='url-image'>
                <a style="display:block" href="${urlData.url}" rel="nofollow noopener" target="_blank">
                    <img src="${urlData.url_image}" />
                </a>
            </div>
        `;
    } else {
        urlData.url_image = '';
    }

    return `
                <div class='multi single comment-attach-container url-preview'>
                    <input type="hidden" name="attach[url][url]" class="comment-attach-url-url" value="${urlData.url}"/>
                    <input type="hidden" name="attach[url][sitename]" value="${urlData.url_sitename}"/>
                    <input type="hidden" name="attach[url][title]" value="${urlData.url_title}"/>
                    <input type="hidden" name="attach[url][description]" value="${urlData.url_description}"/>
                    <input type="hidden" name="attach[url][image_url]" value="${urlData.url_image}"/>

                    <div class="close-url-preview crosBtn" onclick="$(this).closest('.comment-attach-container').remove();"></div>
                    <div class='comment-attach-url'>
                        ${mediaDiv}
                        <div class='url-data'>
                            <a href="${urlData.url}" rel="nofollow noopener" target="_blank">
                                <div class="url-data-site-name">${urlData.url_sitename}</div>
                                <div class="url-data-title">${urlData.url_title}</div>
                                <div class="url-data-description">${urlData.url_description}</div>
                            </a>
                        </div>
                    </div>
                </div>`;
}
