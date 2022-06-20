import ContentManager from './content/manager.js';
import Events from './events.js';
import editPhoto from '../photo-editor/edit-photo.js';
import CommonPopups from "./common-popups.js";
import addFriendsModalTemplate from "./templates/add-friends-modal.js";

let currentManager = { abort: $.noop };
let commonPopups = new CommonPopups();

export default (function() {
    /**
     * Temporary function to list pages/widgets moved to this new page loader
     */
    const isUriMigrated = uri => {
        const uriParts = uri.replace(/^#/, '').split('/');

        return [
            'activity',
            'engage',
            'live',
            'gallery',
            'profile',
            'dependents',
            'donations',
            'media',
            'documents',
            'forms',
            'certification',
            'resources',
            'more',
            'subscription',
            'additional_info',
            'privacy',
            'connections',
            'additional',
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
        highlightActiveChannel();
        loadFriendsSentRequests();
        loadFriendsReceivedRequests();
        Events.addEventsToSidebar();

        if (isUriMigrated(location.hash)) {
            navigation.load();
        }
    });

    /**
     * handle plus button
     */
    $('body').on('click', '#nav a.plus, #engage .postForm', function(e){
        if ($(this).hasClass('plus')) {
            e.preventDefault();
        }

        let newPostForm = $('.popup[data-popup="new-post"]');

        if (newPostForm.length === 0) {
            commonPopups.showNewPostPopup();
        } else if (newPostForm.is(':hidden')) {
            newPostForm.fadeIn();
            newPostForm.find('.txtBox').attr({
                'data-community' : parseInt($('.communityDropdown .dd-selected-value').val()),
                'data-channel' : parseInt($('.channelDropdown .dd-selected-value').val())
            });

            $('body').addClass('flow');

            $(document).trigger('communityDropdownChanged');
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

            // console.log(`Uri ${location.hash} has been migrated to navigation.js`); // Uncomment for debugging

            // dissable engage and let vue handle it instead.
            if (contentId === 'engage') {
                let isTimeline = window.isTimeline();

                if (isTimeline) {
                    $('#appLd').html('');
                    return;
                }
            }

            currentManager = new ContentManager(contentId);

            currentManager.preload().then(manager => {
                $(document).trigger(`navigation.${ contentId }.loaded`);
                this[contentId](manager, ...args);
                $(document).trigger(`navigation.${ contentId }.initialized`);
            }).catch((response) => {
                // TODO: This is supressed for now because when opening mobile app from a PN
                // we are aborting early due to a navigation change -- this error then appears, but does not
                // affect the functionality of the app
                // showError(response.error || 'Something went wrong, please try again.');
                console.log(response);
            });
        }

        gallery(manager, ...args) {
            setPageTitle(translate('Gallery'), community.id ? community.name : '');

            manager.setContent();

            /**
             * Hide filters and me/others tabs for regular members if members cannot post in this community
             */
            const hasMembersContent = member.channels.filter(({ruleset, type}) => {
                return ruleset === 'open' && type !== 'Direct';
            }).length > 0;

            const isDashboard = community.id === null;

            if (!isDashboard && ! hasMembersContent && ! member.isCommunityAdmin) {
                $('#gallery').find('.filter-search-bar, ul.type').hide();
            }

            updateNavBar('gallery', true);

            new Gallery(manager, ...args).init();
        }

        live(manager, slug, ...args) {
            const mainHTML = manager.render("main").html();

            manager.setContent(null, mainHTML);

            new Live(manager, slug, ...args).init();
        }

        activity(manager) {
            setPageTitle(translate('Activity'), community.name);
            updateNavBar('engage/stream');

            manager.setContent(null, manager.render('main').html());

            new Activity(manager).init();
        }

        engage(manager, slug, ...args) {
            const channel = mainData.channel || {};
            const isDashboard = community.id === null;

            // Non-channel (e.g. single posts) set their titles on their own
            if (channel.name) {
                let name = channel.name;

                if (channel.group_name) {
                    name = channel.group_name + " > " + name;
                }

                setPageTitle(name, community.name);
            }

            if (channel.type === 'Direct') {
                if (channel.masked === '1' && ! member.isCommunityAdmin) {
                    setPageTitle(community.mask.name, community.name);
                } else {
                    $.get(urlFrom('directs/getTitle/' + channel.id))
                        .then(response => setPageTitle(response.title, community.name));
                }
            } else if (! community.id) {
                setPageTitle(translate('Stream'), '');
            }

            $('a[href="#live"]', '#appLd').attr('href', '#live/' + channel.slug);

            /**
             * Pick theme: main (timeline) or chat (directs)
             */
            const theme = mainData.channel.theme === 'timeline' ? 'main' : mainData.channel.theme || 'main';
            const mainHTML = manager.render('theme' + theme.charAt(0).toUpperCase() + theme.slice(1)).html();

            manager.setContent(null, mainHTML);

            $('.chatTitle').html(`${translate('Here we can add info on the channel members')}...`);

            if (channel.ruleset !== 'open') {
                const isOwnChannel = channel.creator_id == member.id;
                const canPost = member.isCommunityAdmin || isOwnChannel || channel.role === 'admin' || isDashboard;

                if (! canPost) {
                    $('#engage .postForm').remove();
                }

                $('#engage .search.by-member').addClass('hidden');
                $('.searchByMember, .searchByMemberFilter').addClass('hidden');
            }

            updateNavBar('engage/stream');

            const type = slug === 'post' ? 'post' : 'channel';
            const id = type === 'post' ? args[0] : slug;
            const highlight = type === 'channel' && args.length ? args[0] : null;

            new Engage(manager, type, id, highlight).init();
        }

        profile(manager, memberId, ...args) {
            $('.filter-settings').addClass('hidden');

            setPageTitle(translate('Profile'), community.name);

            manager.setContent();

            new Profile(manager, Events, memberId, ...args).init();
        }

        dependents(manager, ...args) {
            setPageTitle(translate('Dependents'), community.name);

            manager.setContent();

            new Dependents(manager, editPhoto, ...args).init();
        }

        donations(manager, ...args) {
            setPageTitle(translate('Donations'), community.name);

            manager.setContent();

            new Donations(manager, ...args).init();
        }

        media(manager,  ...args) {
            var pageTitle = $('#nav > li[data-nav-tab=' + manager.contentId + ']').data('nav-name');
            pageTitle = pageTitle ? pageTitle : translate('Media');

            setPageTitle(pageTitle, community.name);

            manager.setContent();

            new Media(manager, ...args).init();
        }

        documents(manager, ...args) {
            setPageTitle(translate('Documents'), community.name);

            manager.setContent();

            updateNavBar('documents', true);

            new Documents(manager, ...args).init();
        }

        forms(manager, ...args) {
            setPageTitle(translate('Form'), community.name);

            manager.setContent();

            updateNavBar('forms', true);

            new Forms(manager, ...args).init();
        }

        certification(manager, ...args) {
            setPageTitle(translate('Certification'), community.name);

            manager.setContent();

            updateNavBar('certification', true);

            new Certification(manager, ...args).review();
        }

        additional(manager, ...args) {
            setPageTitle(translate('Security Group Review'));
            manager.setContent();
            args = [args[0], args[2], args[4]];
            new SecurityGroupReview(manager, ...args).init();
        }

        resources(manager, ...args) {
            var pageTitle = $('#nav > li[data-nav-tab=' + manager.contentId + ']').data('nav-name');
            pageTitle = pageTitle ? pageTitle : 'Resources';

            setPageTitle(pageTitle, community.name);

            manager.setContent();

            updateNavBar('resources', true);

            new Resources(manager, ...args).init();
        }

        more(manager, ...args) {
            setPageTitle(translate('More'), community.name);

            manager.setContent();

            updateNavBar('more', true);

            new PageLinks(manager, ...args).init();
        }

        subscription(manager, ...args) {
            setPageTitle(translate('Subscriptions'), community.name);
            manager.setContent();

            new Subscriptions(manager, ...args).init();
        }

        additional_info(manager, ...args) {
            setPageTitle(translate('Settings'), community.name);

            manager.setContent();

            new AdditionalInfo(manager, ...args).init();
        }

        privacy(manager, ...args) {
            setPageTitle(translate('Privacy'));

            manager.setContent();

            new Privacy(manager, ...args).init();
        }

        connections(manager, ...args) {
            $('.filter-settings').addClass('hidden');

            setPageTitle(translate('Connections'), community.name);
            updateNavBar('connections');

            manager.setContent();

            new Connections(manager, addFriendsModalTemplate, ...args).init();
        }
    }

    $(window).trigger('hashchange');

    return {
        isUriMigrated
    };
})();
