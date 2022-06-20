window.url = window.location.hash.replace('#', '').split('/');

// NO GLOBALS unless they're really generic, please! (Diego)
window.ajaxSearch = false;
window.bottomReached = false;
window.nextOffset = 0;

const locale = window.navigator.userLanguage || window.navigator.language;
moment.locale(locale);

window.endMemberSession = () => {
    location.href = base_url;
}

function isMobileView() {
    return $(window).width() < 991;
}


$(function() {
    setDarkTheme(localStorage.getItem('darkMode') === 'true');

    /*_____ Drop Down _____*/
    $(document).on("click", ".dropBtn", function(e) {
        e.stopPropagation();

        if ($(this).parents(".dropCnt:first").hasClass("active")) {
            $(this).parents(".dropCnt:first")
                .find(".dropCnt:first")
                .addClass("active");
        } else {
            $(".dropCnt").not(
                $(this).parent().children(".dropCnt")
            ).removeClass("active");

            $(this).parents(".dropDown:first")
                .find(".dropCnt:first")
                .toggleClass("active");
        }
    });

    $(document).on("click", ".dropCnt", function(e) {
        e.stopPropagation();
    });

    $(document).on("click", function() {
        $(".dropCnt").removeClass("active");
    });

    /*----- video button -----*/
    var vid = $("video");

    $(document).on("click", ".fa-play", function() {
        $(this).parents(".videoBlk")
            .children(vid)
            .trigger("play");

        $(this).removeClass("fa-play")
            .addClass("fa-pause");
    });

    $(document).on("click", ".fa-pause", function() {
        $(this).parents(".videoBlk")
            .children(vid)
            .trigger("pause");

        $(this).removeClass("fa-pause")
            .addClass("fa-play");
    });

    $(".datepicker").datepicker({
        startDate: "-3d"
    });

    // =========================popup================
    $(document).on("click", ".who_People_top>div", function() {
        let mnPop = $(this).parents("._inner");
        mnPop
            .find(".who_People_top>div")
            .addClass("active")
            .not($(this))
            .removeClass("active");
        let item_src = $(this)
            .find("img")
            .attr("src");
        if (!empty(item_src)) {
            mnPop.find("ul.who_People>li").addClass("hidden");
            mnPop
                .find('ul.who_People>li img[src="' + item_src + '"]')
                .parents("li")
                .removeClass("hidden");
        } else mnPop.find("ul.who_People>li").removeClass("hidden");
    });

    /*_____ Popup _____*/
    $(document).on("click", ".popup", function(e) {
        if ($(e.target).closest(".popup ._inner, .popup .inside").length === 0) {

            if (! $(".popup").hasClass('required')) {
                $(".popup").fadeOut("3000");
                $("body").removeClass("flow");
            }
        }
    });

    $(document).on("click", ".crosBtn, .closePopup", function(e) {
        e.preventDefault();
        e.stopPropagation();

        $(this).parents(".popup").eq(0).fadeOut();
        $("body").removeClass("flow");

        $(e.currentTarget).trigger('closed.modal.squirrel')
    });

    $(document).on("click", ".popBtn", function(e) {
        if ($(this).hasClass('deletedAccount')) {
            return;
        }

        $("body").addClass("flow");
        const popUpName = $(this).data("popup");
        const modal = $(`.popup[data-popup=${popUpName}]`).fadeIn();
        const post = $(e.currentTarget).parents('.postBlk.posts').first();

        modal.trigger({
            type: 'popup.squirrel',
            postId: post.attr('data-post-id'),
        });
    });

    /*_____ remove setting on link click Popup _____*/
    $(document).on("click", '[data-popup="settings"] a', function(e) {
        $(this)
            .parents("._inner:first")
            .find(".crosBtn:first")
            .trigger("click");

        hideSidebar();
    });

    $(document).on("change", '.popup[data-popup="settings"] .darkModeSwitch > input', function(e) {
        setDarkTheme(this.checked);

        $(this).closest('[data-popup]').find('.crosBtn').click();
    });

    $(document).on("click", ".prfBtn", function(e) {
        // Prevent navigation to Profile when inside the member filter popup
        if ($(this).closest('[data-popup="memberFilter"]').length) {
            return;
        }

        const memberId = $(this).closest('[data-member-id]').data('member-id');
        const masked = $(this).closest('[data-masked]').data('masked');
        const communityId = $(this).closest('[data-community-id]').data('community-id');

        e.stopPropagation();

        if (masked && memberId == 1) {
            location.hash = '#profile/community';
            return;
        }
        if (memberId) {
            if (communityId) {
                location.href = `${ communityId }#profile/${ memberId }`;
            } else {
                location.hash = `#profile/${ memberId }`;
            }
        }
    });

    $(document).on("click", ".memberProfileLink button", function(e) {
        const memberId = $(this).data('member-id');
        if (memberId) {
            location.hash = `#profile/${ memberId }`;
        }
    });

    $(document).on("click", ".showMemberDropDown", function(e) {
        if ($(this).closest('#sidebar').length === 0) {
            $('.member-drop-menu').toggleClass('hide');
        } else {
            const memberId = $(this).data('member-id');

            if (memberId) {
                location.hash = `#profile/${ memberId }`;
            }
        }
    });

    $(document).on('click', function (e) {
        if ($(e.target).closest('.showMemberDropDown').length === 0) {
            $('.member-drop-menu').addClass('hide');
        }
    });

    $(document).on("click", ".channelBtn", function(e) {
        const communityId = $(this).closest('[data-community-id]').data('community-id');
        const channelSlug = $(this).closest('[data-channel-slug]').data('channel-slug');

        e.stopPropagation();

        if (! communityId && ! channelSlug) {
            return;
        }

        location.href = `${communityId}#engage/${ channelSlug}`;
    });

    $(document).on("click", ".proIco > ul.proDrop > li", function(e) {
        $(this).parents("ul").removeClass("active");
    });

    $(document).on("click", "#liveChat", function() {
        $("#reamaze-widget").trigger("click");
    });
});
