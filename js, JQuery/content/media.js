"use strict";

function Media(manager) {
    this.manager = manager;
    this.videoTypes = ['youtube', 'vimeo']

    $('#mediaTabContent').data('MediaObject', this);
}

Media.prototype = {
    init() {
        this.loadTabs();
    },

    loadTabs() {
        const url = urlFrom('media/tabs');

        return $.post(url).fail(
            ({responseJSON}) => showError(responseJSON.error || translate('Something went wrong. Please try again.'))
        ).then(({ tabs }) => {
            this.setTabs(tabs);

            if (! $('#mediaTabContent .nav-tabs li.active').data('tab-id')) {
                $('#mediaTabContent .nav-tabs li:first').addClass('active');
            }

            this.loadData();
        });
    },

    loadData(nextPage = 1) {
        const tabId = new URLSearchParams(location.search).get('tabId') || $('#mediaTabContent .nav-tabs li.active').data('tab-id');
        const url = urlFrom('media/tab/' + tabId);

        showLoader();

        return $.post(url, {page:nextPage}).fail(
            ({responseJSON}) => showError(responseJSON.error || translate('Something went wrong. Please try again.'))
        ).done(({ tab }) => {
            this.setContent(tab);

            this.loadingMore = tab.nextPage ? true : false;
            this.nextPage = tab.nextPage;
        }).always(hideLoader);
    },

    setTabs(tabs) {
        if (tabs) {
            this.addTabs(tabs);
        }
    },

    setContent(data) {
        if (data.items) {
            this.addItems(data.items, data.type);
        }
    },

    addTabs(tabs) {
        $.each(tabs, (_, tab) => {
            this.manager
                .render('tab', tab)
                .in('#mediaTabContent ul.nav', this.manager.MODE_APPEND);
        });
    },

    addItems(items, type) {
        $.each(items, (_, item) => {
            this.manager
                .render(type, item)
                .in('#mediaTabContent .itemsList', this.manager.MODE_APPEND);
        });
    },

    clearContent() {
        $('#mediaTabContent .itemsList').empty();
    },

    changeTab() {
        this.clearContent();
        this.loadData();
        this.toggleSwitchOption();
    },

    windowScrolled() {
        if (!this.loadingMore || !this.nextPage) {
            return;
        }

        const scrolled = $(window).scrollTop() + $(window).height();
        const triggerScroll = $(document).height() - 200;

        if (scrolled > triggerScroll) {
            this.loadData(this.nextPage);
            this.loadingMore = false;
        }
    },

    toggleSwitchOption()
    {
        const tabType = $('#mediaTabContent .nav-tabs li.active').data('tabtype');
        $('#mediaTabContent .viewLst').toggle(this.videoTypes.includes(tabType));
    }
}
