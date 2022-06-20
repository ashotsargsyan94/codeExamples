"use strict";

function Resources(manager) {
    this.manager = manager;

    this.manager.render('post').in('#resourcesTabContent');

    this.videoTypes = ['youtube', 'vimeo']

    $('#resourcesTabContent').data('ResourcesObject', this);
}

Resources.prototype = {
    init() {
        $('#resourcesTabContent div.topHead h3').hide();
        this.loadTabs();
    },

    loadTabs() {
        const url = urlFrom('resources/tabs');

        return $.post(url).then(({ tabs }) => {
            this.setTabs(tabs)
        }).fail(
            ({responseJSON}) => showError(responseJSON.error || 'Something went wrong. Please try again.')
        );
    },

    loadData(nextPage = 1, tabId, folderId) {
        const url = urlFrom('resources/tab/' + tabId);

        showLoader();

        return $.post(url, {page: nextPage, folderId: folderId}).fail(
            ({responseJSON}) => showError((responseJSON && responseJSON.error) ? responseJSON.error : 'Something went wrong. Please try again.')
        ).done(({ tab }) => {
            this.setContent(tab);

            this.loadingMore = tab.nextPage ? true : false;
            this.nextPage = tab.nextPage;
        }).always(hideLoader);
    },

    setTabs(tabs) {
        $('#resourcesTabContent div.mediaContainer').removeAttr('data-type');
        $('#resourcesTabContent div.mediaContainer').removeAttr('data-mode');

        if (tabs) {
            this.addTabs(tabs);
        }
    },

    setContent(data) {
        $('#resourcesTabContent div.topHead h3').show();
        $('#resourcesTabContent div.nav > div').hide();
        $('#resourcesTabContent div.topHead span.title').text(data.tab.folderName);
        $('#resourcesTabContent div.mediaContainer').attr('data-type', data.tab.type);
        $('#resourcesTabContent div.mediaContainer').data('root-type', data.tab.rootType);
        $('#resourcesTabContent div.mediaContainer').attr('data-mode', data.tab.mode);
        $('#resourcesTabContent .back').data('tab-id', data.tab.id);

        if (data.tab.parentFolderId) {
            $('#resourcesTabContent .back').data('folder-id', data.tab.parentFolderId);
        } else {
            $('#resourcesTabContent .back').data('folder-id', 0);
        }

        if (data.tab.type == 'documents') {
            const docManager = this.manager.newManager('documents', '#resourcesTabContent .tabContent .documentsContainer');
            docManager.load().then(manager => {
                $(document).trigger(`navigation.documents.loaded`);
                new Documents(manager).init(data.tab.folderId);
                $(document).trigger(`navigation.documents.initialized`);
            });
        } else if (data.tab.mode == 'folders') {
            this.addItems(data.files, data.tab.mode);
        } else if (data.files) {
            data.files.tabId = data.tab.tabId;
            this.addItems(data.files, data.tab.type);
        }
    },

    addTabs(tabs) {
        $.each(tabs, (_, tab) => {
            tab.icon = tab.icon;
            this.manager
                .render('folders', tab)
                .in('#resourcesTabContent div.nav', this.manager.MODE_APPEND);
        });
    },

    addItems(items, type, container = '#resourcesTabContent .itemsList') {
        $.each(items, (_, item) => {
            this.manager
                .render(type, item)
                .in(container, this.manager.MODE_APPEND);
        });
    },

    clearContent() {
        $('#resourcesTabContent .itemsList').empty();
    },

    changeTab(tab) {
        const tabId = $(tab).closest('div[data-tab-id]').data('tab-id');
        const folderId = $(tab).closest('div[data-folder-id]').data('folder-id');

        this.clearContent();

        this.loadData(1, tabId, folderId);
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

    toggleSwitchOption() {
        const tabType = $('#resourcesTabContent .nav-tabs li.active').data('tabtype');
        $('#resourcesTabContent .viewLst').toggle(this.videoTypes.includes(tabType));
    },

    goBack() {
        const tabId = $('#resourcesTabContent .back').data('tab-id');
        const folderId = $('#resourcesTabContent .back').data('folder-id');

        if (tabId && folderId) {
            this.clearContent();
            this.loadData(1, tabId, folderId);
        } else {
            $('#resourcesTabContent div.topHead h3').hide();
            $('#resourcesTabContent div.nav > div').show();
            $('#resourcesTabContent .itemsList').empty();
            $('#resourcesTabContent .documentsContainer').empty();
        }
    },

    showMediaModal(e) {
        const manager = this.manager;

        manager.render('widget').in('.post-widget', manager.MODE_INSERT);


        const type = $(e).closest('.mediaItem').data('type');

        $('.engageBackBtn').removeClass('hidden');

        switch (type) {
            case 'video':
                const videoUrl = $(e).closest('.videoBlk').data('video-url');
                const videoPoster = $(e).closest('.videoBlk').data('video-poster');
                const videoName = $(e).closest('.videoBlk').data('video-name');
                const alternateVideoUrl = videoUrl.replace(".m3u8", ".mp4");

                manager.render('videoItem', {
                    poster: videoPoster,
                    file: videoUrl,
                    name: videoName,
                    videoType: getVideoType(videoUrl),
                    alternateFile: alternateVideoUrl,
                    alternateVideoType: getVideoType(alternateVideoUrl),
                }).in('.post-widget .cmntLst', manager.MODE_INSERT);

                initVideoJs();

                break;
            case 'audio':
                const audioUrl = $(e).closest('.mediaItem').data('audio-url');
                const audioName = $(e).closest('.mediaItem').data('audio-name');
                const audioId = $(e).closest('.mediaItem').data('audio-id');
                const audioPosition = $(e).closest('.mediaItem').data('audio-position');
                const audioSpeed = $(e).closest('.mediaItem').data('audio-speed');
                const audioImage = $(e).closest('.mediaItem').data('audio-image');
                const audioType = $(e).closest('div.mediaContainer').data('root-type');

                manager.render('audioItem', {
                    file: audioUrl,
                    name: audioName,
                    audioId: audioId,
                    audioPosition: audioPosition,
                    audioSpeed: audioSpeed > 0 ? audioSpeed : 1,
                    image: audioImage,
                }).in('.post-widget .cmntLst', manager.MODE_INSERT);

                if (audioType == 'bible') {
                    const tabId = $(e).closest('div.mediaItem').data('tab-id');
                    const chapterId = $(e).closest('div.mediaItem').data('chapter-id');
                    const url = urlFrom('resources/tab/' + tabId);

                    showLoader();

                    $.post(url, {page: 1, folderId: chapterId}).fail(
                        ({responseJSON}) => showError((responseJSON && responseJSON.error) ? responseJSON.error : 'Something went wrong. Please try again.')
                    ).done(({ tab }) => {
                        const verses = tab.files;

                        $.each(verses, (_, verse) => {
                            this.manager
                                .render('audioText', verse)
                                .in('#resourcesTabContent div.audioText', this.manager.MODE_APPEND);
                        });

                        if (verses && verses.length) {
                            $('#resourcesTabContent #engage').addClass('hasAudioText', 200);
                            $('#resourcesTabContent #amazingaudioplayer-1').addClass('compact');
                        }
                    }).always(hideLoader);
                }

                this.initialize_audio_player();

                $('#resourcesTabContent #engage').addClass('audioPlayer');
                $('#resourcesTabContent #engage').addClass(audioType);

                break;

            case 'pdf':
                const file = $(e).closest('.mediaItem').data('doc-url');
                const name = $(e).closest('.mediaItem').data('doc-name');
                const isNativeApp = !!localStorage.getItem('isNativeApp');
                let template = 'pdfItem';

                if (typeof navigator.mimeTypes["application/pdf"] === "undefined") {
                    template = 'pdfItemGoogle';
                }

                manager.render(template, {
                    file: file,
                    name: name
                }).in('.post-widget .cmntLst', manager.MODE_INSERT);

                $('#resourcesTabContent #engage').addClass('docView');

                break;
        }

        $('body').addClass('flow');
        $('[data-model="gallery"]').addClass('animate__animated animate__slideInRight active');
        $('#resourcesTabContent').addClass('blur');
    },

    hideMediaModal($target, event) {
        event.preventDefault();

        const video = $target.closest('.inter.roadMap').find('video').get(0);

        if (video) {
            video.pause();
            video.currentTime = 0;
        }

        $('body').removeClass('flow');
        $('[data-model="gallery"]').removeClass('animate__animated animate__slideInRight active');
        $('#resourcesTabContent').removeClass('blur');
        $('#amazingaudioplayer-1').remove();
    },

    initialize_audio_player() {
        var scripts = document.getElementsByTagName("script");
        var jsFolder = "";
        for (var i = 0; i < scripts.length; i++) {
            if (scripts[i].src && scripts[i].src.match(/initaudioplayer-1\.js/i))
                jsFolder = scripts[i].src.substr(0, scripts[i].src.lastIndexOf("/") + 1);
        }
        $("#amazingaudioplayer-1").amazingaudioplayer({
            jsfolder: jsFolder,
            skinsfoldername: "",
            titleinbarwidthmode: "fixed",
            timeformatlive: "%CURRENT% / LIVE",
            volumeimagewidth: 24,
            barbackgroundimage: "",
            showtime: true,
            titleinbarwidth: 80,
            showprogress: true,
            random: false,
            titleformat: "%TITLE%",
            height: 164,
            loadingformat: "Loading...",
            prevnextimage: urlFrom("assets/audioplayerengine/prevnext-48-48-0.png"),
            showinfo: true,
            imageheight: 100,
            skin: "MusicBox",
            loopimagewidth: 24,
            showstop: false,
            prevnextimageheight: 48,
            infoformat: "%ARTIST% %ALBUM%<br />%INFO%",
            stopotherplayers: true,
            showloading: false,
            forcefirefoxflash: false,
            showvolumebar: true,
            imagefullwidth: false,
            width: 300,
            showtitleinbar: false,
            showloop: false,
            volumeimage: urlFrom("assets/audioplayerengine/volume-24-24-1.png"),
            playpauseimagewidth: 48,
            loopimageheight: 24,
            tracklistitem: 10,
            tracklistitemformat: "%ID%. %TITLE% <span style='position:absolute;top:0;right:0;'>%DURATION%</span>",
            prevnextimagewidth: 48,
            forceflash: false,
            playpauseimageheight: 48,
            showbackgroundimage: false,
            imagewidth: 100,
            playpauseimage: urlFrom("assets/audioplayerengine/playpause-48-48-0.png"),
            forcehtml5: true,
            showprevnext: false,
            backgroundimage: "",
            autoplay: false,
            volumebarpadding: 8,
            progressheight: 8,
            showtracklistbackgroundimage: false,
            titleinbarscroll: true,
            showtitle: true,
            defaultvolume: 100,
            tracklistarrowimageheight: 16,
            heightmode: "fixed",
            titleinbarformat: "%TITLE%",
            showtracklist: false,
            stopimageheight: 48,
            volumeimageheight: 24,
            stopimagewidth: 48,
            volumebarheight: 80,
            noncontinous: false,
            tracklistbackgroundimage: "",
            showbarbackgroundimage: false,
            showimage: true,
            tracklistarrowimagewidth: 48,
            timeformat: "%CURRENT% / %DURATION%",
            showvolume: true,
            fullwidth: false,
            loop: 1,
            preloadaudio: true,
        });
    }
}
