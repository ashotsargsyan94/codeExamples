"use strict";

function Documents(manager) {
    this.manager = manager;

    this.manager.render('post').in('#documents');

    $('#documents').data('DocumentsObject', this);
}

Documents.prototype = {

    init($rootDocumentId) {
        this.rootDocumentId = $rootDocumentId;
        $('#appLd').removeClass('hidden');

        this.loadData($rootDocumentId).then(
            this.setContent.bind(this)
        );
    },

    loadData(id) {
        const url = base_url + (id == undefined ? '/documents' : `/documents/index/${id}`);

        return $.get(url).catch(showGenericError);
    },

    async openDocument($target) {
        const documentDiv = $target.closest('.document');
        const id = documentDiv.attr('data-document-id');

        if (documentDiv.data('file')) {
            const item = document.getElementById('download-' + id);
            const isNativeApp = !!localStorage.getItem('isNativeApp');

            // Need minimum of v1.3.0 of app (iOS) or v1.4.0 (Android) to allow native downloads
            const versionMin = window.Config.deviceOS === 'iOS' ? 130 : 140;
            if (isNativeApp && window.Config.nativeAppVersion >= versionMin) {
                window.nsWebViewInterface.emit('downloadFile', item.href);
            } else {
                item.click();
            }
        } else {
            const data = await this.loadData(id);
            this.setContent.bind(this)(data);
        }
    },

    showMembers($target) {
        const members = JSON.parse(decodeURIComponent($target.attr("data-members")));
        const membersHtml = members.map(member => /* template */`
            <li>
                <div class="ico prfBtn" data-member-id="${member.id}">
                   <img src="${get_avatar_url(member.avatar, member.id, 'p50x50')}">
                </div>
                <span class="prfBtn" data-member-id="${member.id}">${member.first_name} ${member.last_name}</span>
            </li>
        `);

        $('[data-popup="members"] .member_count').text(members.length);
        $('[data-popup="members"] .who_People').html(membersHtml);
        $('[data-popup="members"]').fadeIn();
    },

    setContent({ documents, parent_document }) {
        this.clearContent();

        let template = 'document',
            configFileView = 'default',
            configFolderView = 'listMembers';

        if (parent_document) {
            if (parent_document.id != this.rootDocumentId) {
                this.manager.render('header', parent_document).in('#documents .document-list', this.manager.MODE_APPEND)
            }

            configFolderView = parent_document.config.folderView;
            configFileView = parent_document.config.fileView;

            if (parent_document.viewMode == 'folders') {
                template = (configFolderView == 'tiles') ? 'tile' : template;
            } else {
                template = (configFileView == 'viewer' || configFileView == 'defaultViewer') ? 'pdf' : template;
            }
        }

        documents.forEach(document => {
            let icon = `<i class="${document.file ? 'fi-file-empty' : 'fi-folder'}" style="font-size: 20px"></i>`,
                memberCountText = (document.file && configFileView == 'viewer' || (!document.file && configFolderView == 'list')) ? '' : document.is_public == true ? translate('Public') : `${document.member_count} ${document.member_count == 1 ? translate('member') : translate('members')}`,
                documentTemplate = (parent_document && parent_document.viewMode == 'files' && !document.file && configFileView != 'default') ? 'document' : template;

            if (document.icon) {
                const iconUrl = `${base_url}assets/images/site_icon/${document.icon}`;
                icon = documentTemplate == 'tile' ? iconUrl : `<img src="${iconUrl}" style="width: 20px; height: auto;" ></img>`;
            }

            this.manager.render(documentTemplate, {
                ...document,
                icon,
                updated_from_now: moment(document.updated_at).locale(window.locale).fromNow(),
                member_count_text: memberCountText,
                members_json: encodeURIComponent(JSON.stringify(document.is_public == true ? [] : document.members)),
            }).in('#documents .document-list', this.manager.MODE_APPEND)
        })

        if (!documents.length) {
            $('#documents .document-list').append(`<span class="w-100 no-content">${translate("You don’t have any documents")}</span>`);
        }
    },

    clearContent() {
        $('#documents .document-list').empty();
    },

    showMediaModal(target) {
        const manager = this.manager,
            file = $(target).closest('.mediaItem').data('doc-url'),
            name = $(target).closest('.mediaItem').data('doc-name');

        let template = 'pdfItem';

        manager.render('widget').in('.post-widget', manager.MODE_INSERT);

        $('#documents #engage .engageBackBtn').removeClass('hidden');

        if (typeof navigator.mimeTypes["application/pdf"] === "undefined") {
            template = 'pdfItemGoogle';
        }

        manager.render(template, {
            file: file,
            name: name
        }).in('.post-widget .cmntLst', manager.MODE_INSERT);


        $('#documents #engage').addClass('docView');

        $('body').addClass('flow');
        $('[data-model="gallery"]').addClass('animate__animated animate__slideInRight active');
        $('#resourcesTabContent').addClass('blur');
    },

    hideMediaModal(target, event) {
        event.preventDefault();

        $('body').removeClass('flow');
        $('[data-model="gallery"]').removeClass('animate__animated animate__slideInRight active');
        $('#documents').removeClass('blur');
    },
}
