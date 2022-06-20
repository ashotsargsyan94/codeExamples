// TODO: Refactor to not use window
// window is necessary for mobile right now because SHOW_REACTION is undefined
// when trying to use it in app.js
window.SHOW_REACTION = 3;

function ucfirst(word) {
    return word.replace(/^./, firstChar => firstChar.toUpperCase());
}

function possessiveForm(owner, owned) {
    return (/s$/.test(owner) ? `${ owner }'` : `${ owner }'s`) + ' ' + owned;
}

function setPageTitle(title, communityName = '') {
    title = html_entity_encode(translate(ucfirst(title)));

    document.title = `${ title } – Squirrel Social`;
    let isDashboard = communityName.length === 0;

    if (isDashboard) {
        title = '<span>' + title + '</span>';
        $('#page-title-header').addClass('isDashboard');
    } else {
        communityName = '<span>' + communityName + '</span>';
        $('#page-title-header').removeClass('isDashboard');
    }

    $('#page-title-header').html(communityName + '' + title);
}

function showLoader() {
    $('#mmLoader').removeClass('hidden');
}

function hideLoader() {
    $('#mmLoader').addClass('hidden');
}

function empty($value) {
    return ! $value; // Really...?
}

String.prototype.capitalize = function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

function format_date(d, frmt = "mm/dd/yy") {
    return $.datepicker.formatDate(frmt, new Date(d));
}

function moment_format_date(d, frmt = "ddd, D MMM, YYYY") {
    let str = moment.utc(d).local().locale(locale).format(frmt);

    //some languages add a period after month or day short forms, if so remove the ','.
    return str.replaceAll(".,", ".").capitalize(); //also capitalize since some languages use lowecase days of the week.
}

function time_ago($time) {
    return moment.utc($time, "YYYY-MM-DD hh:mm:ss").local().locale(window.locale).fromNow();
}

function minutes_between(timeOne, timeTwo) {
    let start = moment(timeOne);
    let end = moment(timeTwo);
    let minutesDiff = moment.duration(start.diff(end)).asMinutes();

    return Math.abs(Math.floor(minutesDiff));
}

function get_file_url(fileName, memberId, thumbDir, communityId = null) {
    if (! communityId) {
        communityId = community.id;
    }

    let base = base_url.replace(/\/+$/, '');
    const path = thumbDir ? `${thumbDir}/${fileName}` : fileName;
    const objectKey = `${communityId}/${memberId}/${path}`;
    const { AWS_BUCKET, AWS_CLOUDFRONT_DOMAIN } = window.app.constants;
    const useCloudFrontDomain = !!AWS_CLOUDFRONT_DOMAIN.trim();
    const environmentUsesAwsS3 = !!AWS_BUCKET.trim();

    if (useCloudFrontDomain) {
        return fileName
            ? `https://${AWS_CLOUDFRONT_DOMAIN}/${objectKey}`
            : base + "/assets/images/squirrel.svg";
    }

    if (environmentUsesAwsS3) {
        return fileName
            ? `https://${AWS_BUCKET}.s3.amazonaws.com/${objectKey}`
            : base + "/assets/images/squirrel.svg";
    }

    return fileName
        ? base + `/${UPLOADS}/${objectKey}`
        : base + "/assets/images/squirrel.svg";
}

function get_temp_file_url(fileName, memberId) {
    const base = base_url.replace(/\/+$/, '');

    return fileName
        ? base + '/' + UPLOADS + '/' + community.id + '/' + memberId + '/temp/' + fileName
        : base + "/assets/images/squirrel.svg";
}

/**
 * Perform a throttled ajax POST request, where only the last request
 * stands (i.e. previous ongoing requests to the same endpoint are
 * canceled as soon as we send a new one).
 *
 * @param {string} endpoint  Request endpoint
 * @param {json} data        Request data to pass to $.post
 * @param {int} timeout      Timeout before sending the actual ajax request
 */
function request(endpoint, data, timeout = 300) {
    request.requests = request.requests || {};

    if (request.requests[endpoint]) {
        if (request.requests[endpoint].xhr) {
            request.requests[endpoint].xhr.abort();
        }

        clearTimeout(request.requests[endpoint].timer);
    }

    request.requests[endpoint] = {};

    return new Promise((resolve, reject) => {
        request.requests[endpoint].timer = setTimeout(() => {
            const xhr = request.requests[endpoint].xhr = $.post(endpoint, data);

            xhr.then(resolve).catch(reject);
        }, timeout);
    });
}

/**
 * Gets a url for the video poster, i.e. same filename as the video it serves,
 * but with a .jpg extension.
 */
function get_poster_url(fileName, memberId, communityId = null) {
    if (fileName == null) return;
    const jpgThumbnail = fileName.replace(/\.\w+$/, '.jpg');

    return get_file_url(jpgThumbnail, memberId, null, communityId);
}

/**
 * @param {string} fileName  Either filename or full URL
 * @param {int} memberId
 * @param {string} thumbId Optional, thumbnail identifier, e.g. 'p50x50'
 */
function get_avatar_url(fileName, memberId, thumbDir = 'p100x100') {
    if (fileName && fileName.startsWith('http')) {
        return fileName.replace(/\/p\d+x\d+\//, `/${ thumbDir }/`);
    }

    const base = base_url.replace(/\/+$/, '');
    const path = thumbDir + '/' + fileName;

    if (memberId == 1) {
        return urlFrom('/assets/images/sammy_avatar.png');
    }

    return fileName && memberId
        ? base + '/' + UPLOADS + '/avatars/' + memberId + '/' + path
        : base + "/assets/images/user.svg";
}

function confirm(title, description, okBtnText = 'Confirm', cancelBtnText = 'Cancel') {
    return new Promise((resolve, reject) => {
        $('body').addClass('flow');

        $.confirm({
            title: title,
            content: description,
            buttons: {
                ok: {
                    text: okBtnText,
                    action: () => {
                        $('body').removeClass('flow');
                        resolve();
                    }
                },
                close: {
                    text: cancelBtnText,
                    action: () => {
                        $('body').removeClass('flow');
                        reject();
                    }
                }
            }
        });
    });
}

function alert(title, content, okBtnText = 'Ok') {
    $('body').addClass('flow');

    return new Promise(resolve => {
        $.alert({
            title,
            content,
            buttons: {
                ok: { text: okBtnText, action: resolve },
            }
        });
    }).finally(() => $('body').removeClass('flow'));
}

function html_entity_decode(html) {
    return $('<div>').html(html).text();
}

function html_entity_encode(html) {
    return $('<div>').text(html).html().replace(/"/g, '&quot;');
}

function get_emoji_url(emojiId) {
	// If we dont get an emojiId then we need to adjust the path to point to the smileys folder
	if (!emojiId) {
		emojiId = 'icon-smiley';
		return `${ base_url }assets/smileys/${ emojiId }.svg`;
	}

	return `${ base_url }assets/images/emojis/emojis.svg#${ emojiId }`;
}

function get_day_options($day = '') {
    let html = null;
    for ($i = 1; $i <= 31; $i++) {
        html += `<option value="${ $i }"${ (!empty($day) && $day == $i) ? " selected" : '' }> ${ $i }</option>`;
    }
    return html;
}

function get_month_options($month = '') {
    let html = null;

    for ($i = 0; $i < 12; $i++) {
        html += `<option value="${$i + 1}"${(!empty($month) && $month == $i + 1) ? " selected" : ""}> ${moment().month($i).locale(window.locale).format('MMMM')}</option>`;
    }

    return html;
}

function get_language_options(languageLocale = '') {
    let html = null;

    for (const locale in availableLanguages) {
        html += `<option value="${locale}"${(languageLocale && languageLocale == locale) ? " selected" : ""}> ${availableLanguages[locale].nameInLanguage}</option>`;
    }

    return html;
}
/**
 * Updates the header navbar item with the active class
 *
 * @param {string} dataNavTab The value of the data-nav-tab attribute
 * @param {boolean} isCommunityTab Related to top navigation or community
 * the header navbar item that will be updated
 */
function updateNavBar(dataNavTab, isCommunityTab = false) {
    const navContainer = isCommunityTab ? '#community-nav-tabs' : 'header #nav';

    if (community.id == null || isCommunityTab) {
        const navItem = $(`${navContainer} > li[data-nav-tab="${dataNavTab}"]`);
        navItem.siblings().removeClass('active');
        navItem.addClass('active');
    }
}

function getEllipsisString(str, maxLength = 19) {
    if (str.length < maxLength) return str;
    const count = (maxLength - 3) / 2;
    return str.substring(0, count) + '...' + str.substring(str.length - count - 1);
}

function isMobile() {
    let isMobile = false; //initiate as false
    // device detection
    if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent)
        || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0, 4))) {
        isMobile = true;
    }

    return isMobile;
}

function isSafari() {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

function isInView(el) {
    var rect = el.getBoundingClientRect();                      // absolute position of video element
    return !(rect.top > $(window).height() || rect.bottom < 0); // visible?
}

function parseURL(url) {
    var parser = document.createElement('a'),
        searchObject = {},
        queries, split, i;
    // Let the browser do the work
    parser.href = url;
    // Convert query string to object
    queries = parser.search.replace(/^\?/, '').split('&');
    for (i = 0; i < queries.length; i++) {
        split = queries[i].split('=');
        searchObject[split[0]] = split[1];
    }
    return {
        protocol: parser.protocol,
        host: parser.host,
        hostname: parser.hostname,
        port: parser.port,
        pathname: parser.pathname,
        search: parser.search,
        searchObject: searchObject,
        hash: parser.hash
    };
}

window.goBack = function () {
    let additionalInfoBack = $('.additional-info .backBtn:visible');

    if (additionalInfoBack.length) {
        additionalInfoBack[0].click();
    } else if (window.history.length < 2) {
        //there's nothing to go back to, go to home.
        // we'll need the pathname so we go to the correct community
        let urlParts = parseURL(window.location)

        return window.location.href = urlParts.pathname
    } else {
        window.history.back()
    }
}

/**
 * sizes the text area according to the content
 * @param {HTMLElement} target
 * @returns {void}
 */
function autoSize(target) {
    let value = target.value;

    if (typeof value === 'undefined') {
        return;
    }

    // Set the height to 1px, then read the scrollHeight to get the height of the content
    target.style.height = '1px';
    target.style.height = `${target.scrollHeight}px`;
}

function generateImageBoxTemplate(data) {
    return /* template */`
        <div class="image">
            <img src="${data.thumbnailUrl}">
            <div class="filter-container">
                <i class="fas fa-magic filter_pic" data-file="${data.tempUrl}" data-filename="${data.fileName}"></i>
            </div>
            <div>
                <i class="fas fa-trash del_pic" data-filename="${data.fileName}"></i>
            </div>
        </div>
    `;
}

function generateVideoBoxTemplate(data) {
    if (typeof data.videoUrl === 'undefined') {
        data.videoUrl = data.tempUrl;
    }
    return /* template */`
        <div class="image">
            <video poster="${data.videoUrl.replace(/\.\w+$/, '.jpg')}" preload="metadata" playsinline>
                <source src="${data.videoUrl}" type="video/mp4">
            </video>
            <div><i class="fas fa-trash del_pic" data-filename="${data.fileName}"></i></div>
            <i class="clapper-ico"></i>
        </div>
    `;
}

function generateGifBoxTemplate(data) {
    return /* template */`
        <div class="image">
                <img src="${data}" />
                <div><i class="fas fa-trash del_pic"></i></div>
        </div>
    `;
}

function saveAttachmentsDraft(type, data) {
    let postDraft = JSON.parse(localStorage.getItem('newPostDraft'));
    postDraft.attachments.push({
        type: type,
        data: data
    });

    localStorage.setItem('newPostDraft', JSON.stringify(postDraft));
}

function isTimeline() {
      // sadly we can't count on window.mainData being adjusted soon enough on a hash change, so we need to do it ourselves.
      const uriParts = location.hash.replace(/^#/, '').split('/');
      const isEngagePage = ( ! uriParts[0] || uriParts[0] === 'engage');
      const channelSlug  = isEngagePage ? (uriParts[1] || 'stream') : null;

      if (! isEngagePage) {
          return false;
      }

      let curentChannel = {};

      member.channels.forEach(channel => {
          if (channel.slug === channelSlug) {
              curentChannel = channel;
              return false; // break
          }
      });

      const theme = curentChannel.theme === 'timeline' ? 'timeline' : curentChannel.theme || 'timeline';

      return theme === 'timeline';
}

function isProfile() {
    // sadly we can't count on window.mainData being adjusted soon enough on a hash change, so we need to do it ourselves.
    const uriParts = location.hash.replace(/^#/, '').split('/');

    return uriParts[0] === 'profile';
}
