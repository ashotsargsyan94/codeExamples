/**
 * The code in this file comes from app.js and is related to engage (channels, directs, stream).
 *
 * It is being migrated to engage.js piece by piece, so this file will eventually be completely removed.
 */

function handleLongPosts(elem) {
    if (typeof elem === 'undefined')
        elem = $(document);

    elem.find('.viewmore').each(function() {
        let text = $(this).closest('.postWrite').find('.line-clamp-3')[0];

        if (text.innerText=='')
            $(this).hide();
        if (text.innerText!='' && text.innerText.length<=200)
            $(this).hide();
        else if (text.innerText.length>200)
            $(this).siblings('.line-clamp-3').addClass('line-clamp');
    });
}

$(function() {
    $(document).on('click', '#timeline .vwMn', function (e) {
        let mainReplyBox = $(this).parents('.postBlk').find('.mainReplyBox');
        mainReplyBox.removeClass('hidden');
        $(this).remove();
        handleLongPosts(mainReplyBox);
    });

    $(document).on('click', '#timeline .vwSb', function (e) {
        let mainReplyBox = $(this).parents('.postBlk').find('.mainReplyBox').find('.subReply');
        mainReplyBox.removeClass('hidden');
        $(this).remove();
        handleLongPosts(mainReplyBox);
    });

    $(document).on('click', '#timeline .cmntLst .image.popBtn', function () {
        let src = $(this).children('img').attr('src');
        $('.popup[data-popup="image"] .image > img').attr('src', src);
    });

    $(document).on('click', '#timeline ul.editPost > li.report-post', function (e) {
        e.preventDefault();

        const store = $(this).parents('.posts').data('post-id');

        $(".dropCnt").removeClass("active");

        if (store) {
            $('body').addClass('flow');

            $('.popup[data-popup="rprtPst"]').fadeIn().find('form')
                .find('textarea').val('').focus().end()
                .find("div.alertMsg:first").hide()
                .find('input[type="hidden"]').remove().end()
                .append('<input type="hidden" name="store" value="' + store + '" />');
        }
    });

    $(document).on('submit', '#timeline #frmRprtPst', function (e) {
        e.preventDefault();

        const reason = $(this).find('textarea[name="reason"]').val();
        const store = $(this).find('input[name="store"]').val();
        const frmbtn = $(this).find("button[type='submit']");
        const frmIcon = $(this).find("button[type='submit'] i.spinner");
        const frmMsg = $(this).find("div.alertMsg:first");
        const frm = this;

        frmbtn.attr("disabled", true);
        frmIcon.removeClass("hidden");

        $.post(urlFrom('comments/report'), {reason, store})
            .then((response) => {
                frmMsg.html(response.msg).slideDown(500);
                $('html, body').animate({scrollTop: frmMsg.offset().top - 300}, 'slow');
                if (response.success) {
                    setTimeout(function () {
                        frm.reset();
                        $(frm).parents('._inner:first').find('.crosBtn').trigger('click');
                        frmMsg.slideUp('fast');
                    }, 1500);
                }
            })
            .fail(showNetworkError)
            .always(() => {
                frmbtn.attr("disabled", false);
                frmIcon.addClass("hidden");
            });
    });
});

/**
 * FOLLOWING HANDLERS HAVE ALREADY BEEN MIGRATED AND WILL BE REMOVED FROM HERE REAL SOON. DON'T
 * WASTE TIME WORKING ON THIS CODE. THANKS, DIEGO.
 *
 * (similar consideration goes for all the code in this file... since it's all gonna get migrated)
 */
$(function() {
    $(document).on('click', '#pinboard .pinned', function (e) {
        e.preventDefault();

        $.confirm({
            title: translate('Unpin'),
            content: translate('Are you sure you want to unpin this post?'),
            buttons: {
                ok: {
                    text: translate('Yes'),
                    action: () => {
                        let btn = $(this);
                        let store = btn.data('store');
                        if ( ! store || btn.data("disabled"))
                            return false;
                        btn.data("disabled", "disabled");

                        $.post(urlFrom(`pins/unpinPost/${ store }`)).then(response => {
                            if (response.success) {
                                if (btn.data('page')) {
                                    btn.parents('.col').remove();
                                    if ($('#pinboard .flexRow > .col').length == 0)
                                        $('#pinboard .flexRow').html(`<div class="col noItm"><p>${translate('You have no pinned posts. Go pin some of your favorites to see them here')}!</p></div>`);
                                } else {
                                    btn.toggleClass('add-pin pinned').find('a').html(`<i class="fi-pushpin-active"></i> <span>${translate('Pin it')}</span>`);
                                    btn.parents("ul.editPost").removeClass('active');
                                    btn.parents('.dropDown:first').prev('button.pinBtn').remove();
                                }
                            }
                        })
                        .fail(showNetworkError)
                        .always(() => btn.removeData("disabled"));
                    }
                },
                close: {
                    text: translate('Cancel')
                }
            }
        });
    });

    $(document).on('change', '#timeline form._search input[name="search"]', function (e) {
        e.preventDefault();
        // Load filtered comments here
    });

    $(document).on('click', '.postBlk ._footer .emoji', function () {
        $(this).parents('.postBlk').find('.postCmnt').toggleClass('hidden').find('div.leavCmnt.topReply textarea').focus();
    });

    $(document).on('focus', '.writePost .txtBox', function (e) {
        $('.writePost .txtBox, .writePost .txtBox *, .frmCmnt .txtBox, .frmCmnt .txtBox *').unbind().removeData();

        initMentionable(this, 'bottom');

        initUrlPreview(this);
    });

    $(document).on('focus', '.chatCreatePost .txtBox', function (e) {
        $('.chatCreatePost .txtBox, .chatCreatePost .txtBox *').unbind().removeData();

        initMentionable(this, 'top');

        initUrlPreview(this);
    });

    $(document).on('focus', '.topReply .txtBox', function (e) {
        $('.topReply .txtBox, .topReply .txtBox *, .frmCmnt .txtBox, .frmCmnt .txtBox *').unbind().removeData();

        initMentionable(this, 'bottom');

        initUrlPreview(this);
    });

    function initMentionable(element, position) {
        $(element).mentionable(
            urlFrom('load/message_mentions'),
            {minimumChar: 3, maxTags: 4, position: position}
        );
    }

    function initUrlPreview(element) {
        $(element).urlpreview('init', {targetUrl: `${app_url}load/url_meta_data`});
    }
});
