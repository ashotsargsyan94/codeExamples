import ContentManager from './content/manager.js';

let currentManager = { abort: $.noop };

export default (function() {
    /**
     * Temporary function to list pages/widgets moved to this new page loader
     */
    const isUriMigrated = uri => {
        const uriParts = uri.replace(/^#/, '').split('/');

        return [
            'media',
        ].includes(uriParts[0])
    };

    /**
     * Trigger page loads when the uri hash changes
     */
    $(window).on('hashchange', event => {
        // If the hash changed while inside a popup
        // We need to remove the flow class from the body to allow scrolling again
        $('body').removeClass('flow');

        $(document).trigger('navigation.pagechange', event);

        currentManager.abort();

        updateMainData();

        if (isUriMigrated(location.hash)) {
            navigation.load();
        }
    });

    const navigation = new class
    {
        async load() {
            $('.filter-settings').removeClass('hidden');

            const uri = location.hash.replace(/^#/, '');
            const [ contentId, ...args ] = uri.split('/');

            if ( ! this[contentId]) {
                return console.error(`Uri ${contentId} has been migrated to navigation.js, but no handler has been defined`);
            }

            currentManager = new ContentManager(contentId);

            currentManager.preload().then(manager => {
                $(document).trigger(`navigation.${ contentId }.loaded`);
                this[contentId](manager, ...args);
                $(document).trigger(`navigation.${ contentId }.initialized`);
            }).catch((response) => {
                console.log(response);
            });
        }

        media(manager,  ...args) {
            var pageTitle = $('#nav > li[data-nav-tab=' + manager.contentId + ']').data('nav-name');
            pageTitle = pageTitle ? pageTitle : translate('Media');

            setPageTitle(pageTitle, community.name);

            manager.setContent();

            new Media(manager, ...args).init();
        }
    }

    $(window).trigger('hashchange');

    return {
        isUriMigrated
    };
})();
