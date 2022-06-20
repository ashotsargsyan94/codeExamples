"use strict";

function PageLinks(manager) {
    this.manager = manager;

    $('#page-links').data('PageLinksObject', this);
}

PageLinks.prototype = {

    init() {
        $('#appLd').removeClass('hidden');
        this.closePageLink();

        this.loadData().then(
            this.setContent.bind(this)
        );
    },

    loadData() {
        return $.get(`${base_url}/pageLinks`).catch(showGenericError);
    },

    setContent({ pageLinks }) {
        pageLinks.forEach(pageLink => {
            const icon = `<img src="${base_url}assets/images/site_icon/${pageLink.icon}" />`;
            this.manager.render('page_link', {
                ...pageLink,
                icon,
            }).in('#page-links .page-links-list', this.manager.MODE_APPEND)
        })

        if (!pageLinks.length) {
            $('#documents .document-list').append(translate('There is no more links'));
        }
    },

    openPageLink($target) {
        $('.page-links-list').hide();
        $('.page-link-detail').show();
        $('.page-link-frame').attr("src", $target.attr('data-src'));
    },

    closePageLink() {
        $('.page-links-list').show();
        $('.page-link-detail').hide();
    }
}