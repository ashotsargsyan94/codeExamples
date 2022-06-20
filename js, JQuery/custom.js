var needToConfirm = false;

window.onbeforeunload = confirmExit;

window.isNative = !!localStorage.getItem('isNativeApp');

function confirmExit() {
    if (needToConfirm) {
        return translate("You have attempted to leave this page while form submission is in progress. Are you sure?");
    }
}

const postSubmit = {
    frmSetting: function() {
        console.log('updating biometric auth');
        const useBiometricAuth = $('[name="bioAuthRadio"]:checked').val();
        if (useBiometricAuth) {
            localStorage.setItem('biometricAuth', true);
        } else {
            localStorage.setItem('biometricAuth', false);
            window.nsWebViewInterface.emit('removeLoginCredentials');
        }
    }
};

$(function () {
    $(document).on('click', '.lgout', function(e){
        e.preventDefault();

        // This is for native to know that the user wanted to logout
        // because they pressed the logout button
        // We need this so that we do not automatically log them back in with biometric
        // login credentials that are saved
        window.nsWebViewInterface.emit('explicitLogout', true);

        localStorage.removeItem('drafts');

        window.nsWebViewInterface = null;

        $.post(urlFrom('/login/logout'))
            .then(window.endMemberSession)
            .fail(showGenericError);
    });

    $(document).on('click','form button[type="submit"]',function(e){
        var frm=$(this).parents('form');

        $(frm).validate({
            errorPlacement: function(){
                return false;
            }
        });
    });

    // TODO: Refactor the forms that still use this function
    // to have their own individual click handlers instead of trying to make this one work
    // for multiple forms
    $(document).on('submit','.frmAjax',function(e) {
        e.preventDefault();

        let frmSetting = $(this).is("#frmSetting");

        needToConfirm = true;

        var frmbtn = $(this).find("button[type='submit']");
        var frmIcon = $(this).find("button[type='submit'] i.fa-spinner, button[type='submit'] i.spinner");
        var frmMsg = $(this).find("div.alertMsg:first");
        var frm = this;
        var action_url = urlFrom($(frm).attr('action'));

        frmMsg.hide();
        frmIcon.removeClass("hidden");
        frmbtn.attr("disabled", true);

        $.ajax({
            url: action_url,
            data : new FormData(frm),
            processData: false,
            contentType: false,
            dataType: 'JSON',
            method: 'POST'
        })
            .done(function(rs) {
                frmMsg.html(rs.msg).slideDown(500);
                //Refresh page if this settings form
                if (frmSetting) {
                    window.onbeforeunload = null;
                    setTimeout(document.location.reload(true), 500)
                }
                if(rs.scroll_to_msg)
                    $('html, body').animate({ scrollTop: frmMsg.offset().top-300}, 'slow');
                if((typeof recaptcha !== 'undefined') && recaptcha)
                    grecaptcha.reset();
                if (rs.status == 1) {
                    setTimeout(function() {
                        if (rs.frm_reset) {
                            frm.reset();
                            if ((typeof recaptcha !== 'undefined') && recaptcha)
                                grecaptcha.reset();
                        }
                        if (rs.hide_msg) {
                            frmMsg.slideUp(500);
                        }
                        frmIcon.addClass("hidden");

                        if (rs.redirect_url) {
                            if (rs.redirect_url == 'self') {
                                location.reload();
                            } else {
                                window.location.href = `${rs.redirect_url}`;
                                $(frm).parents('[data-popup]').hide();
                            }
                        } else {
                            frmbtn.attr("disabled", false);
                            if (postSubmit[frm.id]) {
                                postSubmit[frm.id]();
                            }
                        }
                    }, 1000);
                } else {
                    setTimeout(function () {
                        if (rs.hide_msg) {
                            frmMsg.slideUp(500);
                        }
                        frmbtn.attr("disabled", false);
                        frmIcon.addClass("hidden");

                        if (rs.redirect_url) {
                            window.location.href = `/${rs.redirect_url}`;
                        }
                    }, 1000);
                }
            })
            .fail(console.log)
            .always(() => needToConfirm = false);
    });

    $(document).on('mousedown touchstart', '.txtGrp.withIcon .fa-eye', function() {
        $(this).siblings('input[type="password"]')[0].type = 'text';
    });

    $(document).on('mouseup touchend', '.txtGrp.withIcon .fa-eye', function() {
        $(this).siblings('input[type="text"]')[0].type = 'password';
    });
});

function refresh_selectpicker() {
    $('.selectpicker').selectpicker('refresh');
}

$(document).on('autocomplete.user.selected', '.autocomplete-engage', function() {
    $(this).data('placeholder', $(this).attr('placeholder'))
        .attr('placeholder', '').val('').attr('readonly', true);
});

$(document).on('autocomplete.user.selected', '.autocomplete-gallery', function() {
    $(this).data('placeholder', $(this).attr('placeholder'))
        .attr('placeholder', '').val('').attr('readonly', true);
});

$(document).on('click', '#feedback-message', function(e) {
    $(this).hide(200, 'linear');
});

function refresh_datepicker() {
    let start_date_val = $(".event_datepicker[name='start_date']").val();
    let end_date_val = $(".event_datepicker[name='end_date']").val();

    new Vue({
        el: '#vue_datetime',
        data: {
            start_date: start_date_val ? moment(start_date_val).toISOString() : null,
            end_date: end_date_val ? moment(end_date_val).toISOString() : null,
            min_end_date: moment().add(1, 'h').toISOString(),
            min_date: moment().toISOString(),
        },
        methods: {
            updatedStartDateEvent () {
                this.min_end_date = moment(this.start_date).add(1, 'h').toISOString();

                if (!this.end_date || moment(this.end_date) <= moment(this.start_date)) {
                    this.end_date = this.min_end_date;
                }
                this.updateInput();
            },
            updatedEndDateEvent () {

                if (!this.start_date || moment(this.end_date) <= moment(this.start_date)) {
                    this.start_date = moment(this.end_date).subtract(1, 'h').locale(window.locale).toISOString();
                }
                this.updateInput();
            },
            updateInput () {
                $(".event_datepicker[name='start_date']").val(moment(this.start_date).format('MM/DD/YY hh:mm a'));
                $(".event_datepicker[name='end_date']").val(moment(this.end_date).format('MM/DD/YY hh:mm a'));
            }
        }
    })
}

/**
 * init magnificPopup plugin
 * @param {*} obj .multi[data-gallery]
 */
function initMagnificPopup(obj) {
    if (window.isNative) return;

    $(obj).magnificPopup({
        type: 'image',
        delegate: 'div.gallery-item',
        callbacks: {
            elementParse: function (item) {
                if (item.el.data('type') === 'video') {
                    item.type = 'inline';
                    item.src = item.el;
                } else {
                    item.src = item.el.data('src');
                }
            },
            open: function() {
                // do not let open popup with preview if post in edit mode or on video click
                if (
                    this.ev.hasClass('edit-attach')
                    || (! $(this.st.el[0]).hasClass('image') && ! $(this.ev).hasClass('plus'))
                    || (! $(this.st.el[0]).hasClass('image') && $(this.ev).hasClass('plus') && this.index < 2)
                ) {
                    $.magnificPopup.doNotOpen = true;
                    $.magnificPopup.close();
                    $.magnificPopup.doNotOpen = false;
                } else {
                    $('body').addClass('flow');
                }
            },
            close: function () {
                if (! $.magnificPopup.doNotOpen) {
                    $(this.ev).find('video').each(function () {
                        this.pause();
                    });
                }

                $('.videoBlk.gallery-item').removeClass('mfp-hide');
                $('body').removeClass('flow');
            }
        },
        gallery: {
            enabled: true,
            navigateByImgClick: true,
            preload: [0, 1] // Will preload 0 - before current, and 1 after the current image
        },
    });
}

function showData() {
    $('#appLd').removeClass('hidden');

    refresh_datepicker();
    refresh_selectpicker();
}

function showError(error, timeout) {
    const $errorBox = $('#feedback-message');

    $errorBox
        .addClass('error')
        .find('p').html(error)
        .end().show();

    setTimeout(() => $errorBox.hide(500), timeout || 5000);

    console.trace();
}

function showNetworkError(...args) {
    if (args[0] && args[0].statusText === 'abort') { // Ignore it, we programatically aborted an ajax request
        return console.log('Ajax request aborted');
    }

    showError(translate('A network error has occurred. Please reload the page and try again.'));

    args.length && console.log(args);
}

function showGenericError(...args) {
    if (args[0] && args[0].statusText === 'abort') { // Ignore it, we programmatically aborted an ajax request
        return console.log('Ajax request aborted');
    }

    showError(translate('An error has occurred. If the problem persists, please try reloading the page.'));

    args.length && console.log(args);
}

function getTypeFromUrl()
{
    let url = window.location.href;
    let urlParts = url.split('?type=');
    if (!urlParts[1]) {
        return null;
    }

    return urlParts[1];
}

function getInvalidChannelTitle(type) {
    switch(type) {
        case 'post.live':
          return translate('This broadcast has ended.');
        default:
          return translate('Invalid channel link');
    }
}

function getInvalidChannelMessage(type) {

    switch(type) {
        case 'post.live':
          return translate('Check back later in case they post a video of their live stream.');
        default:
          return translate("The channel you're looking for has been closed or moved.");
    }
}

function handleInvalidChannelUri()
{
    let type = getTypeFromUrl();

    $('#appLd').html(/* template */`
        <div class="mt-15 profileBackBtn ">
            <h4 class="pl-15">
                <a href="javascript:window.goBack()" class="fi-arrow-left"> ${translate('Back')}</a>
            </h4>
        </div>
        <div class="alertMsg noPosts">
            <h2>${getInvalidChannelTitle(type)}</h2>
            <p>${getInvalidChannelMessage(type)}</p>
            <p>${translate('You should be redirected to the stream shortly')}...</p>
        </div>
    `);

    const redirectTimeout = setTimeout(() => location.hash = '#engage/stream', 5000);

    $(window).one('hashchange', () => clearTimeout(redirectTimeout));
}

function showMessage(message, timeout) {
    const $messageBox = $('#feedback-message');

    $messageBox
        .removeClass('error')
        .find('p').html(message)
        .end().show();

    if (timeout !== -1)
        setTimeout(() => $messageBox.hide(200, 'linear'), timeout || 5000);

    return $messageBox;
}

function show_404() {
    $('#appLd').html(/* template */`
        <section id="not404">
            <div class="contain">
                <div class="inner">
                    <h2><span class="regular">Sorry</span>${translate('The page you requested was not found')}</h2>
                    <p><a href='${urlFrom("app")}'>${translate('Please try again')}</a></p>
                    <div class="txt404">404</div>
                </div>
            </div>
        </section>
    `).removeClass('hidden');
}

$(document).ready(function () {
    if (window.isNative && $('#appLd').length) {
        window.PullRefresh = PullToRefresh.init({
            mainElement: '#appLd',
            triggerElement: '#appLd',
            onRefresh: function () {
                location.reload();
            }
        });
    }

    $(document).on('click', 'div.invtPpl .fi-cross', e => {
        let formId = $(e.currentTarget).parents('form').attr('id');
        let mainDiv = $(e.currentTarget).parents('div.invtPpl');

        if (formId == 'addDirect') {
            _removeUser(e.currentTarget, mainDiv);
        } else {
            let id = $(e.currentTarget).siblings('input').val();
            let channelId = $('#frmChSetting input[name="channel_id"]').val();

            if (channelId.length == 0) {
                _removeUser(e.currentTarget, mainDiv);
            } else {
                $.post(urlFrom('channels/removeMember'), {id, channelId}).then(() => {
                    _removeUser(e.currentTarget, mainDiv);
                });
            }
        }

        e.preventDefault();
        e.stopPropagation();
    });

    $(document).on('keydown.autocomplete', 'input.autocomplete', function() {
        const searchForm = $(this).data('search');
        const params = {};

        if (searchForm == 'searchUsers') {
            params['store'] = $(this).parents('form').find('input[name="store[]"]').map(function(){ return $(this).val(); }).get();
        } else {
            params['store'] = $(this).parents('form').find('input[name="store"]').val();
        }

        if ($(this).parents('form').find('#channel-community-dropdown').length) {
            params['communityId'] = $('#channel-community-dropdown').data('ddslick').selectedData.value;
        } else if ($(this).parents('form').find('#directs-community-dropdown').length) {
            params['communityId'] = $('#directs-community-dropdown').data('ddslick').selectedData.value;
        }

        $(this).autocomplete({
            source: function (request, response) {
                params['query'] = request.term;

                $.post(urlFrom(searchForm), params).then(({ items }) => response(items));
            },
            select: function(event, ui) {
                mainDiv = $(event.target).closest('form').find('.autocomplete-target');

                if (searchForm === 'searchUsers') {
                    if (mainDiv.children('span').length == 0) {
                        $('>p', mainDiv).remove();
                    }

                    mainDiv.append(' <span><input type="hidden" name="store[]" value="'+ui.item.id+'" data-value="'+ui.item.value+'">'+ui.item.value+' <i class="fi-cross"><i><span>');

                    $(this).val("");

                    event.preventDefault();
                } else {
                    $('#user').val(ui.item.id);
                }

                $(event.target).trigger('autocomplete.user.selected');
            },
            change: function (event, ui) {
                if (!ui.item && searchForm != 'searchUsers'){
                    $(event.target).val("");
                    $('#user').val("");
                }
            },
            focus: function (event, ui) {
                return false;
            },
            messages: {
                noResults: '',
                results: function() {}
            },
            html: true,
            minLength:2,
            autoFocus:true,
        })
            .autocomplete( "instance" )._renderItem = function( ul, item ) {
            return $( "<li><div><img src='" + item.img + "'><span>"+item.value+"</span></div></li>" ).appendTo( ul );
        };
    });
});

function _removeUser($target, $mainDiv) {
    $($target).parents('span').remove();

    if ($mainDiv.children().length==0) {
        $mainDiv.html(`<p>${translate('No user selected')}</p>`);
    }
}

function populate(selector) {
    var select = $(selector);
    var hours, minutes, ampm;
    for (var i = 0; i <= 1425; i += 15){
        hours = Math.floor(i / 60);
        minutes = i % 60;
        if (minutes < 10){
            minutes = '0' + minutes; // adding leading zero
        }
        ampm = hours % 24 < 12 ? 'am' : 'pm';
        hours = hours % 12;
        if (hours === 0){
            hours = 12;
        }
        select.append($('<option></option>')
            .attr('value', hours + ':' + minutes + ' ' + ampm)
            .text(hours + ':' + minutes + ' ' + ampm));
    }
}

function initVideoJs() {
    $('video.video-js').each(function () {
        if (window.isNative) {
            this.addEventListener('webkitbeginfullscreen', () => {
                window.nsWebViewInterface.emit('allowFullscreenRotation');
            }, false);

            this.addEventListener('webkitendfullscreen', () => {
                window.nsWebViewInterface.emit('disableFullscreenRotation');
            }, false);
        } else {
            var overrideNative = false;

            videojs(this, {
                html5: {
                    vhs: {
                        overrideNative: overrideNative
                    },
                    nativeVideoTracks: !overrideNative,
                    nativeAudioTracks: !overrideNative,
                    nativeTextTracks: !overrideNative
                },
                language: window.app.constants.LANGUAGE_CODE
            }).nuevo({
                buttonForward: window.isIOSDevice() ? false : true,
                buttonRewind: window.isIOSDevice() ? false : true,
                settingsButton: false
            });
        }
    });

    $('.cmntLst').on('touchstart click', '.videoBlk', (event) => {
        $video = $(event.currentTarget).find('video').prop('userInteracted', true);
    });

    $(window).scroll(function () {
        const headerHeight = 44;

        if (!throttled('scroll.to.play.video', 100)) {
            $('.post-attach video').each(function () {
                var $video = $(this);

                if (this.userInteracted) {
                    return;
                }

                var $videoTopPosition = $video.offset().top,
                    $videoBottomPosition = $video.offset().top + $video.outerHeight(),
                    $pageVisibleAreaTopPosition = $(window).scrollTop() + headerHeight,
                    $pageVisibleAreaBottomPosition = $(window).scrollTop() + $(window).innerHeight(),
                    $videoShownCompletelyOnScreen = ($pageVisibleAreaBottomPosition > $videoBottomPosition) && ($pageVisibleAreaTopPosition < $videoTopPosition);

                if ($videoShownCompletelyOnScreen) {
                    var notPlaying = true;

                    $('video').each(function () {
                        if (!this.paused) {
                            notPlaying = false;
                            return;
                        }
                    });

                    if (notPlaying) {
                        this.play()
                            .catch(() => {});
                    }
                } else {
                    if (!this.paused) {
                        this.pause();
                    }
                }
            });
        }
    });
}

function getVideoType(fileName) {
    switch (fileName.split('.').pop()) {
        case 'm3u8':
            return 'application/x-mpegURL';
    }

    return 'video/mp4';
}
