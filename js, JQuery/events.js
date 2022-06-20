import isNativeApp from '../nativescript/is-native-app.js';
import editPhoto from '../photo-editor/edit-photo.js';
import uploadPhoto from '../photo-editor/upload-photo.js';
import Birthdays from "./birthdays.js";
import ContentManager from './content/manager.js';
import { getFile, isImageFile, isVideoFile } from './file-input-helpers.js';
import addEventTemplate from "./templates/add-event-template.js";
import membersPopupTemplate from './templates/members-popup-template.js';
import uploadVideo from './upload-video.js';
import { clearVideoConferenceLink, getVideoConferenceLInk } from "./video-conference.js";

function updateInviteesBadge($form) {
    const inviteesCount = $form.children('input[name="store[]"]').length;

    const $inviteesTabLink = $form.siblings('ul.nav.nav-tabs').find('li#event-invitees-tab > a');

    if (inviteesCount === 0) {
        $inviteesTabLink.find('> span.badge').remove();
    } else {
        if (! $inviteesTabLink.find('> span.badge').length) {
            $inviteesTabLink.append(`
                <span class="badge" style="
                    margin-left: 10px;">
                    ${inviteesCount}
                </span>
            `);
        } else {
            $inviteesTabLink.find('> span.badge').html(inviteesCount);
        }
    }
};

$(function() {
    $(document).on('click', '.addEvent #more', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).hide();
        $('.moreField').show();
    });

    $(document).on('click', "#event-invitees #publicInput", function(e) {
        $("#event-invitees .invitees-wrapper").toggle();
        let form = $(e.target).closest('.popup').find('form#addEventForm, form#editEventForm');
        let eventInput = form.find('input[name="eventType"]');
        eventInput.val(e.target.checked ? 'public' : 'invite');

        if (e.target.checked) {
            form.find('input[name="store[]"]').remove();
            updateInviteesBadge(form);
            $(".invitees-wrapper .invitees-list [type='checkbox']").prop('checked', false);
        }
    });

    $(document).on('click', function (e) {
        if (!$(e.target).is('button.add-to-calendar')) {
            $('.add-to-calendar-dropdown-menu').addClass('hidden');
        }
    });

    $(document).on('click', '.videoConferenceBtn', function (e) {
        e.preventDefault();
        e.stopPropagation();

        let $vcLinkSection = $('.popup-content-container .vc_link_section');

        getVideoConferenceLInk().then(conferenceUrl => {
            if (conferenceUrl) {
                $vcLinkSection.find('.vc_link').attr("href", 'javascript:void(0)').html(translate("Video Conference Link Generated"))
                $vcLinkSection.find("input[name='videoConferenceLink']").val(conferenceUrl);
                $vcLinkSection.removeClass('hide');

                $('.popup-content-container .vc_link_button').addClass('hide');
            }
        })
    });

    $(document).on('click', '.clear_vc_link', function (e) {
        e.preventDefault();
        e.stopPropagation();

        let $vcLinkSection = $('.popup-content-container .vc_link_section');

        $('.popup-content-container .vc_link_button').removeClass('hide');

        clearVideoConferenceLink($vcLinkSection);
    });
});

const Events =  {
    //todo translation are these shown or values or used at all?
    months : ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],
    load : function() {
        updateEventBubbles();
        populate('[name=start_time]');
        populate('[name=end_time]');
        // ipLookUp();
        $('.moreField').hide();

        const $uploadCommentMediaInput = $('.eventPhotoVideoInput');

        $('button.addEventPhotoVideo').click((event) => {
            event.preventDefault();
            event.stopPropagation();
            // Trigger click on hidden input
            $uploadCommentMediaInput.trigger('click');
        });

        // Upload images & videos for post if a file is selected
        $uploadCommentMediaInput.change(async function() {
            try {
                const file = await getFile.call(this);
                if (isImageFile(file)) {
                    const imageBlob = await editPhoto(file);
                    if (imageBlob) {
                        uploadEventPostImage(imageBlob);
                    }
                } else if (isVideoFile(file)) {
                    uploadEventPostVideo(file);
                }
            }
            catch (error) {
                // TODO: Add better user feedback
                // like a nicely styled popup message or
                // something to let them know what went wrong
                console.error(error);
            }
        });

        async function uploadEventPostVideo(file) {
            const $popup = $('#event div.popup[data-popup="add-event"], #appLd div.popup[data-popup="edit-event"]');
            const $form = $popup.find('form#addEventForm, form#editEventForm');
            const $submitButton = $form.find('button[type="submit"]');
            const $mediaUpload = $popup.find('div#event-description div.media-upload');
            const communityId = getCommunityId();

            // show spinner
            $mediaUpload.find('div.appLoad').removeClass('hidden');
            // don't let them make a post while uploading
            $submitButton.attr('disabled', true);

            try {
                const data = await uploadVideo(file, base_url + '/uploader/upload_post_video', communityId);

                //hide spinner
                $mediaUpload.find('div.appLoad').addClass('hidden');

                // Create a hidden input whose value will be read in for the attachment file
                $form.append(` <input type="hidden" name="attach" class="attach" value="${data.fileName}" data-community="${communityId}"> `);

                // Add video element to form
                $mediaUpload.prepend(`<video controls
                                           class="event-media"
                                           poster="${data.videoUrl.replace(/\.\w+$/, '.jpg')}"
                                           preload="metadata"
                                           playsinline>
                                        <source src="${data.videoUrl}" type="video/mp4">
                                    </video>`);

                // Hide upload button and show remove button
                $mediaUpload.find('button.addEventPhotoVideo').addClass('hidden');
                $mediaUpload.find('button.removeMedia').removeClass('hidden').html(translate('Delete Video'));

                // Allow user to begin typing and/or post
                $submitButton.attr('disabled',false);
            } catch(error) {
                // TODO: Add better user feedback
                // like a nicely styled popup message or
                // something to let them know what went wrong
                console.error(error);
            }
        }

        async function uploadEventPostImage(imageBlob) {
            const $popup = $('#event div.popup[data-popup="add-event"], #appLd div.popup[data-popup="edit-event"]');
            const $form = $popup.find('form#addEventForm, form#editEventForm');
            const $submitButton = $form.find('button[type="submit"]');
            const $mediaUpload = $popup.find('div#event-description div.media-upload');
            const communityId = getCommunityId();

            // show spinner
            $mediaUpload.find('div.appLoad').removeClass('hidden');
            // don't let them make a post while uploading
            $submitButton.attr('disabled', true);

            try {
                const data = await uploadPhoto(imageBlob, base_url + 'uploader/upload_post_image', communityId);

                //hide spinner
                $mediaUpload.find('div.appLoad').addClass('hidden');

                // Create a hidden input whose value will be read in for the attachment file
                $form.append(` <input type="hidden" name="attach" class="attach" value="${data.fileName}" data-community="${communityId}"> `);

                // Add img element to form
                $mediaUpload.prepend(`<img class="event-media" src="${data.tempUrl}">`);

                // Hide upload button and show remove button
                $mediaUpload.find('button.addEventPhotoVideo').addClass('hidden');
                $mediaUpload.find('button.removeMedia').removeClass('hidden').html(translate('Delete Photo'));

                // Allow user to begin typing and/or post
                $submitButton.attr('disabled', false);
            } catch(error) {
                // TODO: Add better user feedback
                // like a nicely styled popup message or
                // something to let them know what went wrong
                console.error(error);
            }
        }

        function resetAddEventPopup() {
            if (descFormValidator) {
                descFormValidator.resetForm();
            }

            const $popup = $('#event div.popup[data-popup="add-event"]');

            $popup.find('ul.nav.nav-tabs li#event-description-tab').addClass('active');
            $popup.find('ul.nav.nav-tabs li#event-invitees-tab').removeClass('active');
            $popup.find('ul.nav.nav-tabs li#event-invitees-tab > a > span.badge').remove();

            const $descriptionTab = $popup.find('div#event-description');
            const $inviteesTab = $popup.find('div#event-invitees');

            $descriptionTab.addClass('in active');
            $inviteesTab.removeClass('in active');

            $descriptionTab.find('div.media-upload > .event-media').remove();
            $descriptionTab.find('div.media-upload > button.removeMedia').addClass('hidden');
            $descriptionTab.find('div.media-upload > button.addEventPhotoVideo').removeClass('hidden');

            $inviteesTab.find('ul.invitees-list').empty();

            $popup.find('form#addEventForm > input.attach').remove();
            $popup.find('form#addEventForm > div.alertMsg').addClass('hidden');

            $popup.find('input[name="store[]"]').remove();

            $popup.find('div#event-description input, div#event-description textarea, div#event-description select').not('#customCheckbox').val('');
        }

        function resetEditEventPopup() {
            if (descFormValidator) {
                descFormValidator.resetForm();
            }

            const $popup = $('#appLd div.popup[data-popup="edit-event"]');

            $popup.find('ul.nav.nav-tabs li#event-description-tab').addClass('active');
            $popup.find('ul.nav.nav-tabs li#event-invitees-tab').removeClass('active');

            const $descriptionTab = $popup.find('div#event-description');
            const $inviteesTab = $popup.find('div#event-invitees');

            $descriptionTab.addClass('in active');
            $inviteesTab.removeClass('in active');

            $inviteesTab.find('ul.invitees-list').empty();

            const $form = $popup.find('form#editEventForm');

            $form.find('> div.alertMsg').addClass('hidden');

            updateInviteesBadge($form);
        }

        function getCommunityIdFromDropdown() {
            return $('#event-community-dropdown').data('ddslick').selectedData.value;
        }

        function getCommunityId() {
            const isEditPopup = !! $('#appLd div.popup[data-popup="edit-event"]').length;
            return isEditPopup ? window.community.id : getCommunityIdFromDropdown();
        }

        $(document).on('click', '#event i#addEventButton', function(e) {
            // Stop propagation to listener on main.js:108
            e.stopPropagation();

            localStorage.removeItem('masked');
            $('.maskedContentSwitch > input').prop('checked', false);

            resetAddEventPopup();
            $('body').addClass('flow');
            $('#event div.popup[data-popup="add-event"]').fadeIn();

              $( "#eventTitle" ).autocomplete({
                minLength: 0,
                source: function(request, responseCallback) {
                    $.post(urlFrom('events/findPreset'), {
                        request: request,
                        communityId: getCommunityIdFromDropdown()
                    }).then(({ preset }) => {
                        responseCallback(preset);
                    }).fail(() => responseCallback([]));
                },
                create: function () {
                    $(this).data('ui-autocomplete')._renderItem = function (ul, item) {

                        const icon = (item.icon != null)
                                ? '<img src="/assets/images/site_icon/' + item.icon + '" alt="" width="12px" class="mr-1 mb-1 icon"/> '
                                : '';

                        return $('<li class="ui-menu-item">')
                            .append('<div tabindex="-1" class="ui-menu-item-wrapper">' + icon + ' ' + item.label + '</div>')
                            .appendTo(ul);
                    };
                },
                select: function(_, ui) {
                    $("#eventTitle").val(ui.item.label);
                    $("#eventDetail").val(ui.item.detail);

                    return false;
                }
              }).bind('focus', function () {
                if (! $(this).val().trim()) {
                    $(this).keydown();
                }
              });

        });

        $(document).on('click', '#appLd button#editEventButton', function(e) {
            // Stop propagation to listener on main.js:108
            e.stopPropagation();

            resetEditEventPopup();
            $('body').addClass('flow');
            $('#appLd div.popup[data-popup="edit-event"]').fadeIn();
        });

        $(document).on(
            'click',
            `#event div.popup[data-popup="add-event"] div#event-description button.removeMedia,
            #appLd div.popup[data-popup="edit-event"] div#event-description button.removeMedia`,
            function(e) {
                e.stopPropagation();
                const $removeButton = $(this);
                const $att = $removeButton.parents('._inner').find('form#addEventForm > input.attach, form#editEventForm > input.attach');

                if (typeof $att.val() === 'undefined' || $att.val() == '') {
                    return;
                }

                needToConfirm = true;

                $.post(urlFrom('uploader/remove_post_attachment'), {
                    attachmentId: $att.val()
                }).then(() => {
                    $att.remove();

                    $removeButton.siblings('.event-media').remove();
                    $removeButton.siblings('button.addEventPhotoVideo').removeClass('hidden');
                    $removeButton.addClass('hidden');
                }).always(() => needToConfirm = false);
            }
        )

        $(document).on(
            'click',
            `#event div.popup[data-popup="add-event"] form#addEventForm > button.webBtn.cancel-event,
            #appLd div.popup[data-popup="edit-event"] form#editEventForm > button.webBtn.cancel-event`,
            function(e) {
                e.stopPropagation();

                const $popup = $(this).parents('div.popup[data-popup="add-event"], div.popup[data-popup="edit-event"]').first();
                $popup.fadeOut(() => $('body').removeClass('flow'));
            }
        );

        function moveAttachmentsToCommunity(communityId) {
            const $popup = $('#event div.popup[data-popup="add-event"]');
            const $form = $popup.find('form#addEventForm');

            let $formAttachments = $form.find('input.attach');

            if ($formAttachments.length > 0) {
                $.post(urlFrom('uploader/switchAttachmentCommunity'), {
                    attachments: $formAttachments.map((id, el) => {
                        return el.value;
                    }).get(),
                    fromCommunity: $formAttachments.eq(0).attr('data-community'),
                    toCommunity : communityId
                }).done(function (){
                    $formAttachments.attr('data-community', communityId);
                });
            }
        }

        // fired any time the user changed the community in the dropdown.
        $(document).on("communityDropdownChanged", communityDropdownChangedHandler);

        function communityDropdownChangedHandler(e) {
            if (e.dropdownId !== "event-community-dropdown") {
                //must be a different community dropdown. ignore it.
                return;
            }

            //clear the invitees list so it can be refetched the next time the user goes to the invitee tab.
            clearInviteesList();

            // get community data to make sure if in this community user has admin access
            const communityId = getCommunityIdFromDropdown();
            $.post(urlFrom('community/getCommunityMaskData'),{communityId}).then((response) => {
                const $toggleWrapper = $('.communityAdminToggle');

                if (response.success) {
                    $toggleWrapper.removeClass('hide');
                } else {
                    $toggleWrapper.addClass('hide');
                }
            });

            moveAttachmentsToCommunity(communityId);
        }

        function clearInviteesList() {
            //clear the invitees list so it can be refetched the next time the user goes to the invitee tab.
            const $popup = $('#event-invitees-tab').parents('div.popup[data-popup="add-event"]');
            $popup.find('div#event-invitees ul.invitees-list').html('');
            const $form = $popup.find('form#addEventForm, form#editEventForm');
            $form.find('input[name="store[]"]').remove();
            updateInviteesBadge($form);
        }

        $(document).on(
            'click',
            `#event div.popup[data-popup="add-event"] ul.nav.nav-tabs li#event-invitees-tab,
            #appLd div.popup[data-popup="edit-event"] ul.nav.nav-tabs li#event-invitees-tab`,
            function(e) {
                e.stopImmediatePropagation();
                const $popup = $(this).parents('div.popup[data-popup="add-event"], div.popup[data-popup="edit-event"]');
                const $inviteesList = $popup.find('div#event-invitees ul.invitees-list');

                // Already loaded template. Don't load it again
                if ($inviteesList.children().length) {
                    return;
                }

                const communityId = getCommunityId();

                const params = {
                    store: [member.id],
                    channelSlug: '',
                    query: '',
                    communityId
                };

                $.post(urlFrom('common/searchUsers'), params).then(({ items }) => {
                    if (! items || ! items.length) {
                        return;
                    }

                    for (const user of items) {
                        const isChecked = !! $popup.find(`input[name="store[]"][value="${user.id}"]`).length;
                        if (user.id != member.id) {
                            $inviteesList.append(/* template */`
                            <li class="invitees-item" data-memId="${ user.id }">
                                <img src="${ user.img }">

                                <h4>${ user.label }</h4>

                                <div class="round">
                                    <input type="checkbox"
                                            id="checkbox-userid-${ user.id }"
                                            ${ isChecked ? 'checked' : '' } />
                                    <label for="checkbox-userid-${ user.id }"></label>
                                </div>
                            </li>`);
                        }
                    }
                });
            }
        );

        $(document).on(
            'click',
            `#event div.popup[data-popup="add-event"] div#event-invitees ul.invitees-list > li.invitees-item,
            #appLd div.popup[data-popup="edit-event"] div#event-invitees ul.invitees-list > li.invitees-item`,
            function(e) {
                e.stopPropagation();
                e.stopImmediatePropagation();
                e.preventDefault();

                const $checkbox = $(this).find('input[type="checkbox"]');
                $checkbox.prop('checked', ! $checkbox.prop('checked'));

                const $popup = $(this).parents('#event div.popup[data-popup="add-event"], #appLd div.popup[data-popup="edit-event"]');
                const $form = $popup.find('form#addEventForm, form#editEventForm');
                const memId = Number($(this).attr('data-memId'));

                if (memId === undefined || memId === null || isNaN(memId)) {
                    // MemberID is not valid
                    return;
                }

                if ($checkbox.prop('checked')) {
                    $form.append(`<input type="hidden" name="store[]" value="${memId}">`);
                } else {
                    $form.find(`input[value="${memId}"]`).remove();
                }

                updateInviteesBadge($form);
            }
        );

        $(document).on(
            'input',
            `#event div.popup[data-popup="add-event"] div#event-invitees input#search-input,
            #appLd div.popup[data-popup="edit-event"] div#event-invitees input#search-input`,
            function() {
                const $searchInput = $(this);
                const $listItems = $searchInput.parents('div.invitees-wrapper').find('ul.invitees-list').children();

                if (! $listItems.length) {
                    return;
                }

                $.each($listItems, (_, listItem) => {
                    const $listItem = $(listItem)
                    const userName = $listItem.children('h4').text();
                    const regexp = new RegExp($searchInput.val(), 'i');
                    regexp.test(userName) ? $listItem.removeClass('hidden') : $listItem.addClass('hidden');
                });
            }
        );

        let descFormValidator;

        // Setup validator
        $(function() {
            descFormValidator = $(
                `#event div.popup[data-popup="add-event"] form#description-form,
                #appLd div.popup[data-popup="edit-event"] form#description-form`
            ).validate({
                rules: {
                    title: {
                        required: true
                    },
                    start_date: {
                        required: true
                    },
                    end_date: {
                        required: true
                    },
                    address: {
                        required: true
                    },
                    detail: {
                        required: true
                    }
                },
                messages: {
                    title: {
                        required: translate('A title is required')
                    },
                    start_date: {
                        required: translate('A start date is required')
                    },
                    end_date: {
                        required: translate('An end date is required')
                    },
                    address: {
                        required: translate('A location is required')
                    },
                    detail: {
                        required: translate('A description is required')
                    }
                }
            });
        });

        let $sharedFormData = '';
        let $share          = true;
        let $shareEvent     = false;

        $('#description-form').on("change", "#customCheckbox", function(e) {
            if (! ($(this).prop('checked'))) {
                $shareEvent = false;

                return;
            }
            $(document).find('.chnlLstng li').remove();
            $shareEvent = true;
            $('#share-modal form').data('event', true);

            $("body").addClass("flow");
            const popUpName = $(this).data("popup");
            const modal = $(`.popup[data-popup=${popUpName}]`).fadeIn();

            modal.trigger({
                type: 'popup.squirrel',
            });
        });

        $('#share-modal').on('closed.modal.squirrel', function () {
            $('#share-modal form').data('is-event-share', false);
        });


        function getCommunityIdFromShareDropdown() {
            return parseInt($('#share-community-dropdown').data('ddslick').selectedData.value);
        }

        $('#share-modal form').submit((e) => {
            if ($('#share-modal form').data('event')) {
                $share              = true;
                $sharedFormData     = new FormData(e.currentTarget);
                const masked        = (localStorage.getItem('masked') === 'true');
                const communityId   = getCommunityIdFromShareDropdown();

                $sharedFormData.append('communityId', communityId);
                $sharedFormData.append('masked', masked && member.managedCommunities.includes(communityId) ? 1 : 0);
                const sharedWithIds  = $sharedFormData.getAll('sharedWithIds[]');
                const sharedWithType = $sharedFormData.get('sharedWithType');

                if (sharedWithIds.length === 0 && sharedWithType != 'stream') {
                    e.preventDefault();
                    return;
                }
                $('#share-modal .crosBtn').click();
            }
        })

        $(document).on(
            'submit',
            `#event div.popup[data-popup="add-event"] form#addEventForm,
            #appLd div.popup[data-popup="edit-event"] form#editEventForm`,
            function(e) {
                // Stop propagation to listener on custom.js:98
                e.stopPropagation();
                e.stopImmediatePropagation();
                e.preventDefault();

                const $form = $(this);
                const inviteesCount = $form.children('input[name="store[]"]').length;
                const isEditPopup = $form.is('form#editEventForm') ? true : false;
                const eventType = $form.find('input[name="eventType"]').val() || 'invite';

                if (inviteesCount === 0 && eventType == 'invite') {
                    $.confirm({
                        title: translate('No invitees'),
                        /**
                         * for poedit to scrape
                         */
                        poEditContent: [
                            translate(`You need to add at least one invitee to create an event`),
                            translate(`You need to add at least one invitee to create an event`)
                        ],
                        content: `You need to add at least one invitee to ${isEditPopup ? 'edit' : 'create'} an event`,
                        buttons: {
                            ok: {
                                text: translate('Ok'),
                                action: () => {
                                    return;
                                }
                            }
                        }
                    });

                    return;
                }

                const $descForm = $form.parent().find('form#description-form').first();

                if (! $descForm.valid()) {
                    return;
                }

                const $submitButton = $form.find('button.submit-event[type="submit"]');
                const $spinner = $submitButton.find('> i.spinner');
                const $msg = $form.find('div.alertMsg:first');

                const submitFormData = new FormData($form[0]);
                const descFormData = new FormData($descForm[0]);

                // Combine the form data from the description form with the submit form
                for (let entry of descFormData.entries()) {
                    let name = entry[0];
                    let value = entry[1];

                    if (name === 'start_date' || name === 'end_date') {
                        value = moment(value).utc().format('YYYY-MM-DD HH:mm:ss');
                    }

                    submitFormData.append(name, value);
                }

                if (! isEditPopup) {
                    let communityId = getCommunityIdFromDropdown();

                    if (communityId) {
                        submitFormData.append('communityId', communityId);
                    }
                }

                $submitButton.attr('disabled', true);
                $msg.hide();
                $spinner.removeClass('hidden');

                $.ajax({
                    url: isEditPopup ? urlFrom('events/edit') : urlFrom('events/add'),
                    data: submitFormData,
                    processData: false,
                    contentType: false,
                    dataType: 'JSON',
                    method: 'POST'
                })
                    .done(function(rs) {
                        $msg.html(rs.msg).slideDown(500);
                        //Refresh page if this settings form

                        if(rs.scroll_to_msg) {
                            $('html, body').animate({ scrollTop: $msg.offset().top-300}, 'slow');
                        }

                        if (rs.status == 1) {
                            if ($shareEvent) {
                                $sharedFormData.append('eventId', rs.event_id);

                                $.ajax('api/post/eventShare', {
                                    data: $sharedFormData,
                                    method: 'post',
                                    processData: false,
                                    contentType: false,
                                    success: (response) => {
                                        $('#share-modal .crosBtn').click();

                                        const currentChannel = typeof mainData.channel.slug !== 'undefined'
                                            ? mainData.channel.slug.toLowerCase()
                                            : null;

                                        const shareCount = $(`.cmntLst [data-post-id=${response.shared_post_id}] .share-count`);
                                        shareCount.text(Number(shareCount.text()) + response.share_count);

                                        if (currentChannel != $sharedFormData.get('sharedWithType').toLowerCase()) {
                                            showMessage('Event shared successfully');
                                        }
                                    },
                                    error: ({ responseJSON }) => {
                                        showError(responseJSON.error || translate('Something went wrong. Please try again.'))
                                    }
                                });
                            }

                            setTimeout(function() {
                                $spinner.addClass('hidden');
                                $submitButton.attr('disabled', false);

                                $($submitButton).parents('[data-popup]').hide();

                                showMessage(isEditPopup ? translate('Event Edited') :
                                    ( translate('Event created!') +
                                        ' <a href="' + rs.event_url + '"><u>' +
                                        translate('View it')  + '</u></a>'
                                    )
                                );

                                $.post(urlFrom('events/all')).then(response => {
                                    let $html = Events.eventsTopHeadTemplate();
                                        $html += Events.eventsTemplate();
                                        $html += addEventTemplate();
                                        $html += Events.eventsBottomTemplate();
                                    $('#appLd').html($html);
                                    Events.addEvents(response.events, $('#eventSect .flexRow'));
                                    Birthdays.add(response.birthdays, $('#birthdaySect .flexRow'));
                                    Events.load();
                                    Events.addCommunityDropdown();
                                    $('body').removeClass('flow');
                                    showData();
                                });
                            }, 1000);
                        } else {
                                $submitButton.attr('disabled', false);
                                $spinner.addClass('hidden');
                                showError(rs.error);
                        }
                    })
                    .fail(function() {
                        $spinner.addClass('hidden');
                    });
            }
        );

        $(document).on('keyup', '#searchEvent', function() {
            let q = $(this).val();
            let check = new RegExp(q, 'gi');
            $(this).closest('#event').find('.flexRow').find('.name h4').each(function(i, elem){
                if ($(elem).html().match(check)) {
                    $(elem).closest('.col').show();
                } else {
                    $(elem).closest('.col').hide();
                }
            });
        });


        $(document).on('click', 'form#editEventForm > button.delete-event', function(e) {
            e.preventDefault();
            const $deleteButton = $(this);
            const eventId = $deleteButton.siblings('input[name=id]').val();

            $.confirm({
                title: translate('Please confirm'),
                content: translate('You are about to delete an event. This action cannot be undone.'),
                buttons: {
                    ok: {
                        text: translate('Delete'),
                        action: function() {
                            $.ajax(
                                urlFrom(`events/delete/${eventId}`)
                            ).done(function () {
                                $deleteButton.parents('[data-popup]').fadeOut();
                                showMessage(translate('Event deleted!'), 2000);
                                setTimeout(function() {
                                    location.hash = '#events';
                                    window.location.reload();
                                }, 1000);
                            }).fail((response, textStatus) => {
                                $deleteButton.parents('[data-popup]').fadeOut();
                                showGenericError(response, textStatus);
                            });
                        }
                    },
                    close: {
                        text: translate('Cancel')
                    }
                }
            });
        });

        $(document).on('click', '.eventBlk .frndIco > li', function (e) {
            e.preventDefault();
            e.stopPropagation();
            $(this).parent().find('.popup.small-popup').fadeIn();
        });
    },
    convertEventStartDate: function(event) {
        event.start_day = moment.utc(event.start_date).local().format('DD');
        event.start_month = moment.utc(event.start_date).local().locale(locale).format('MMM').toUpperCase();
        event.start_time = moment.utc(event.start_date).local().format('h:mm A');
        return event;
    },
    addEvents: function (events, $placeholder, limit = null, message = null) {
        let $html = '';
        let _this = this;
        let vc_link_section = $('#vc_link_section');

        $(document).on('click', '.videoConferenceBtn', function (e) {
            e.preventDefault();
            e.stopPropagation();
            getVideoConferenceLInk().then(conference_url =>{
                if (! empty(conference_url)) {
                    vc_link_section.find('.vc_link').attr("href", 'javascript:void(0)').html(translate("Generated Video Conference Link"))
                    vc_link_section.find("input[name='videoConferenceLink']").val(conference_url);
                    vc_link_section.removeClass('hide');
                    $('#vc_link_button').addClass('hide')
                }
            })
        });

        $(document).on('click', '.clear_vc_link', function (e) {
            e.preventDefault();
            e.stopPropagation();
            clearVideoConferenceLink(vc_link_section)
        });

        if (events.length > 0) {
            let communitiesList = [];

            $.each(events, function (i, event) {
                if (! communitiesList.filter(community => community.id === event.communityId).length) {
                    communitiesList.push({
                        id: event.communityId,
                        logo: event.communityLogo,
                        name: event.communityName,
                    });
                }

                //convert times from utc to local.
                event = _this.convertEventStartDate(event);

                let address = encodeURI(event.address);
                let videoConferenceLink = '';

                if (! empty(event.video_conference_id)) {
                    videoConferenceLink = /* template */`
                        <button>
                            <a class="fi-camera-video" target="_blank" href="video-conferences/${event.video_conference_id}"></a>
                        </button>`;
                }

                $html += /* template */
                    `<div class="col"><div class="eventBlk" data-community-id="${event.communityId}" data-event-id="${event.id}">
                        <div class="_head">
                            <div class="icon">${event.start_day}<small>${event.start_month}</small></div>
                            <div class="name">
                                <small>${event.start_time}</small>
                                <h4><a href="${event.community_id}#eventdetail/${event.id}">${event.title}</a></h4>
                            </div>
                            ${videoConferenceLink}
                            <div class="dropdown">
                                <button class="marker popBtn add-to-calendar far fa-calendar-plus" title="${translate('Add to Calendar')}"></button>
                            </div>
                            ${  address.length
                                ? `<button class="marker popBtn fi-map-marker" data-popup="event-location" data-location="${address}"></button>`
                                : ''}
                        </div>`;

                if (!empty(event.banner) && event.type === 'video') {
                    $html += /* template */`
                                <div class="videoBlk">
                                    <video poster="${get_poster_url(event.banner, event.creator_id || 0)}" controls preload="metadata" playsinline>
                                        <source src="${get_file_url(event.banner, event.creator_id || 0, null, event.community_id)}" type="video/mp4" />
                                    </video>
                                </div>`;
                } else {
                    $html += /* template */`
                                <div class="image">
                                    <a href="${event.community_id}#eventdetail/${event.id}" style="background-image:url(${get_file_url(event.banner, event.creator_id || 0, 'p400x400', event.community_id)})"></a>
                                </div>`;
                }

                $html += /* template */ `<div class="_foot"><ul class="frndIco ico">`;

                let total_interested = event.interested.length;
                let more_interested = total_interested - SHOW_REACTION;

                if (total_interested > 0) {
                    $.each(event.interested, function (ri, eventMember) {
                        $html += '<li><a><img src="' + get_avatar_url(eventMember.avatar, eventMember.member_id, 'p100x100') + '" alt="" title="' + eventMember.memberName + '"></a></li>';

                        if (ri + 1 == SHOW_REACTION) {
                            return false;
                        }
                    });

                    let additionalBtn = more_interested > 0;
                    more_interested = more_interested > 99 ? 99 : more_interested;

                    //todo translate
                    $html += `<li class="relative main_whoLike ${additionalBtn ? '' : 'disabled'}">${additionalBtn ? `<span>${more_interested}+</span>` : ''}`;

                    let $interest_list = '';
                    let $notInterestList = '';

                    $.each(event.interested, function (ri, eventMember) {
                        $interest_list += '<li><div class="ico prfBtn"><img src="' + get_avatar_url(eventMember.avatar, eventMember.member_id, 'p100x100') + '"/></div> <span class="prfBtn">' + eventMember.memberName + '</span></li>';
                    });

                    $.each(event.notInterested, function (ri, eventMember) {
                        $notInterestList += '<li><div class="ico prfBtn"><img src="' + get_avatar_url(eventMember.avatar, eventMember.member_id, 'p100x100') + '"/></div> <span class="prfBtn">' + eventMember.memberName + '</span></li>';
                    });

                    let popupData = [{
                        'title': translate('Going'),
                        'count': total_interested,
                        'list': $interest_list
                    }];

                    if (event.creator_id == member.id && event.notInterested.length) {
                        popupData.push({
                            'title': translate('Not going'),
                            'count': event.notInterested.length,
                            'list':$notInterestList
                        });
                    }

                    $html += membersPopupTemplate(popupData);

                    $html += '</li>';
                }

                $html += /* template */ `</ul>
                                    <div class="Btn_thumb" data-target="evnt" data-store="${event.id}">
                                        <span>RSVP</span>
                                        <a href="javascript:void(0)" class="im_in ${ (event.rsvp === 'yes') ? 'active' : '' }" data-rsvp="yes">
                                            <i class="fi-thumbs-up"></i>
                                            <span>${event.interested.length}</span>
                                        </a>
                                        <a href="javascript:void(0)" class="un_trst${ (event.rsvp === 'no') ? ' active' : '' }" data-rsvp="no">
                                            <i class="fi-thumbs-down"></i>
                                            ${ event.creator_id == member.id ? `<span>${event.notInterested.length}</span>` : '' }
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>`;
            });

            if (community.id == null) {
                new ContentManager('events').load().then(function(manager) {
                    $.each(communitiesList, function( index, listedCommunity ) {
                        manager.render('communityPrefix', {
                            id: listedCommunity.id,
                            logo: listedCommunity.logo,
                            name: listedCommunity.name,
                        }).in('.eventBlk[data-community-id="' + listedCommunity.id + '"]', manager.MODE_PREPEND);
                    });
                });
            }

            if (limit !== null && events.length > limit) {
                $html+=`<div class="col more-events"><a href="#events">${translate('More')}...</a><div>`;
            }


            $placeholder.children('.appLoad').after($html);
            $placeholder.children('.appLoad').remove();

            for (const event of events) {
                const eventEl = $(`.eventBlk[data-event-id="${event.id}"]`)
                eventEl.find('.add-to-calendar').data('event', event);
            }

            $placeholder.removeClass('hidden');
        } else if (message !== null) {
            $placeholder.html(message);
        } else {
            $placeholder.remove();
        }

        $(document).on('click', '.eventBlk .marker', function (e) {
            e.preventDefault();
            e.stopPropagation();
            $('[data-popup=' + $(this).data('popup') + '] iframe').attr('src', 'https://www.google.com/maps/embed/v1/place?key=' + window.app.constants.MAPS_API_KEY + '&q=' + $(this).data('location'));
        });

        $(document).on('click', '.add-to-calendar', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const addToCalendar$ = $(e.target);

            const eventData = addToCalendar$.data('event');

            _this.addToCalendar(eventData, addToCalendar$)
        })
    },
    addEventsToSidebar: function() {
        let _this = this;
        $.post(urlFrom('load/homeEvents'), {isSidebar : 1}).then(response => {

            if (! response.status) {
                return;
            }

            if (!isMobileView()) {
                let eventsHTML = '',
                    birthdaysHTML = '';

                $.each(response.events, function (i, event){
                    event = _this.convertEventStartDate(event);
                    eventsHTML+= `
                        <div class="event-item eventBlk" data-community-id="${ event.community_id }">
                            <a href="${event.community_id}#eventdetail/${event.id}" class="_head">
                                <div class="icon">${event.start_day}<small>${event.start_month}</small></div>
                                <div class="name">
                                  <small>${event.start_time}</small>
                                  <h4>${event.title}</h4>
                                </div>
                            </a>
                        </div>
                    `;
                });

                $.each(response.birthdays, function (i, birthday){
                    birthdaysHTML += /* template */`
                        <div class="birthday-item postBlk eventBlk">
                            <div class="_head">
                                <div class="icon">
                                    <i class="fa fa-birthday-cake" aria-hidden="true"></i>
                                    ${birthday.format_day}<small>${birthday.format_month}</small>
                                </div>
                                <a class="name-container" href="#profile/${birthday.member_id}">
                                    <div class="ico userPic">
                                        <img src="${get_avatar_url(birthday.avatar, birthday.member_id, 'p100x100')}" alt="" title="${birthday.first_name} ${birthday.last_name}">
                                    </div>
                                    <h4 title="${birthday.first_name} ${birthday.last_name}">
                                        ${birthday.first_name} ${birthday.last_name}
                                    </h4>
                                </a>
                            </div>
                            <span class="birthdayMessageContainer">
                                <div>
                                    <a data-member="${ birthday.member_id }" class="messageMember" href="javascript:void(0)"> ${translate('Send a message')}</a>
                                </div>
                                <div>
                                    <a data-member="${ birthday.member_id }" class="ignoreBirthday" href="javascript:void(0)"> Ignore</a>
                                </div>
                            <span>
                        </div>
                    `;
                });
                $('#sidebar-events').html(eventsHTML);
                $('#sidebar-birthdays').html(birthdaysHTML);
            }

            if ($('.who_People li input[type="checkbox"]:checked').length) {
                $("#saveMemberFilter").click()
            }

        }).fail(showNetworkError);
    },

    loadAddToCalendarListener: function(eventData) {
        const _this = this;

        $(document).on('click', '.addToCalendar', function(e) {
            e.preventDefault();
            e.stopPropagation();

            const addToCalendar$ = $(e.target);

            _this.addToCalendar(eventData, addToCalendar$);
        });
    },

    addToCalendar: function(eventData, addToCalendar$) {
            const event = {
                name: eventData.title,
                location: eventData.address || '',
                details: eventData.detail ? eventData.detail.replace(/&nbsp;/g, ' ') : '',
                startsAt: eventData.local_start_date || eventData.start_date + ' UTC',
                endsAt: eventData.local_end_date || eventData.end_date + ' UTC'
            };

            if (isNativeApp()) {
                window.nsWebViewInterface.emit('addEventToCalendar', {
                    title: event.title,
                    location: event.address,
                    notes: event.details,
                    startDate: event.startsAt,
                    endDate: event.endsAt
                });

                return;
            }

            if (addToCalendar$.siblings('.add-to-calendar-dropdown-menu').length === 0) {
                addToCalendar$.after(`<div class="add-to-calendar-dropdown-menu hidden"></div>`)
            }

            event.startsAt = new Date(event.startsAt).toISOString();
            event.endsAt = new Date(event.endsAt).toISOString();

            const startFormatted = event.startsAt.replaceAll('-', '').replaceAll(':', '').replace(/\.\d*Z/, 'Z');
            const endFormatted = event.endsAt.replaceAll('-', '').replaceAll(':', '').replace(/\.\d*Z/, 'Z');
            const dateStamp = new Date().toISOString().replaceAll('-', '').replaceAll(':', '').replace(/\.\d*Z/, 'Z');

            // The white space needs to be exact for the vcalendar format
            const vCal =
                `BEGIN:VCALENDAR\n` +
                `VERSION:2.0\n` +
                `BEGIN:VEVENT\n` +
                `DTSTAMP:${dateStamp}\n` +
                `DTSTART:${startFormatted}\n` +
                `DTEND:${endFormatted}\n` +
                `SUMMARY:${event.name}\n` +
                `DESCRIPTION:${event.details}\n` +
                `LOCATION:${event.location}\n` +
                `END:VEVENT\n` +
                `END:VCALENDAR\n`;

            const addToCal = `
                <a target="_blank"
                   href="https://calendar.google.com/calendar/u/0/r/eventedit?dates=${startFormatted}/${endFormatted}&text=${event.name}&details=${event.details}&location=${event.location}&sf=true">
                    Google Calendar
                </a>

				<a target="_blank"
                   href="data:text/calendar;charset=utf8,${vCal}">
                    iCal Calendar
                </a>

                <a target="_blank"
                   href="https://outlook.live.com/owa/?path=/calendar/view/Month&rru=addevent&startdt=${event.startsAt}&enddt=${event.endsAt}&subject=${event.name}&location=${event.location}&body=${event.details}">
                   Outlook.com Calendar
                </a>
                `;

            const dropdown$ = $('.add-to-calendar-dropdown-menu');

            dropdown$.html('');

            $(dropdown$).append(addToCal);
            dropdown$.removeClass('hidden');
    },

    loadEditEvent: function(event) {
        const $editEventForm = $('#appLd div.popup[data-popup="edit-event"] form#editEventForm');
        // $editEventForm.find('.event_media_hint').find('.appLoad').addClass('hidden');

        let vc_link_section = $('#vc_link_section');

        $(document).on('click', '.videoConferenceBtn', function (e) {
            e.preventDefault();
            e.stopPropagation();

            getVideoConferenceLInk(vc_link_section).then(conference_url =>{
                vc_link_section.find('.vc_link').attr("href", 'javascript:void(0)').html(translate("Video Conference Link Generated"))
                vc_link_section.find("input[name='videoConferenceLink']").val(conference_url);
                vc_link_section.removeClass('hide');
                $('#vc_link_button').addClass('hide')
            })
        });

        $(document).on('click', '.clear_vc_link', function (e) {
            e.preventDefault();
            e.stopPropagation();
            clearVideoConferenceLink(vc_link_section)
        });

        // Create a hidden input whose value will be read in for the attachment file
        $editEventForm.append(`<input type="hidden" name="attach" class="attach" value="${event.banner || ''}">`);
        $editEventForm.append(`<input type="hidden" name="eventType" value="${event.access_type}">`);

        if (event.access_type === 'invite') {
            event.members.forEach(function (eventMember) {
                if (eventMember.member_id != member.id) {
                    $editEventForm.append(`<input type="hidden" name="store[]" value="${eventMember.member_id}">`);
                }
            });

            updateInviteesBadge($editEventForm);
        }

        if (event.access_type === 'public') {
            $('#appLd div.popup[data-popup="edit-event"] #publicInput').trigger('click');
        }

        const $mediaUpload = $('#appLd div.popup[data-popup="edit-event"] form#description-form div.media-upload');

        if (event.type === 'image') {
            $mediaUpload.prepend(`<img class="event-media" src="${get_file_url(event.banner, event.creator_id, 'p1760x800', event.community_id)}">`);
            $mediaUpload.find('button.addEventPhotoVideo').addClass('hidden');
            $mediaUpload.find('button.removeMedia').removeClass('hidden').html(translate('Delete Photo'));
        } else if (event.type==='video') {
            $mediaUpload.prepend(`
                <video controls
                       class="event-media"
                       poster="${data.videoUrl.replace(/\.\w+$/, '.jpg')}"
                       preload="metadata"
                       playsinline>
                    <source src="${data.videoUrl}" type="video/mp4">
                </video>
            `);
            $mediaUpload.find('button.addEventPhotoVideo').addClass('hidden');
            $mediaUpload.find('button.removeMedia').removeClass('hidden').html(translate('Delete Photo'));
        }
    },

    eventsTopHeadTemplate: function() {
        return /* template */`
            <section id="event">
                <div class="contain-fluid">
                    <div class="topHead noBg">
                        <h1></h1>
                        <i class="fi-plus plusMini popBtn" id="addEventButton" data-popup="add-event"></i>
                `;
    },

    eventsTemplate: function() {
        let birthdayTemplate = '';
        let birthdaySect = '';
        if (community.config.show.birthdays || community.id === null) {
            birthdayTemplate = /* template */`<div id="birthdaySect" class="tab-pane fade postBlk">
                                    <div class="flexRow flex">
                                        <div class="appLoad" style="display: none;">
                                            <div class="appLoader">
                                                <span class="spiner"></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>`;
            birthdaySect = `<li><a data-toggle="tab" href="#birthdaySect">${translate('Birthdays')}<span class="miniLbl" style="display: none"></span></a></li>`;
        }
        return /* template */`
            <ul class="nav-tabs nav eventsTabs">
                    <li class="active"><a data-toggle="tab" href="#eventSect">${translate('Events')}<span class="miniLbl" style="display: none"></span></a></li>
                    <!-- Uncomment when feature is ready -->
                    ${birthdaySect}
                </ul>
                <div class="tab-content w-100">
                    <div id="eventSect" class="tab-pane fade in active postBlk">
                        <div class="flexRow flex">
                            <div class="appLoad" style="display: none;">
                                <div class="appLoader">
                                    <span class="spiner"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                    ${birthdayTemplate}
                </div>
        `;
    },

    eventsBottomTemplate: function() {
        return /* template */`
            </div></section>
                `;
    },

    addCommunityDropdown: function() {
        new ContentManager('events').load().then(function(manager) {
            // $(document).find('.list-item').remove();
            $('.share-community-dropdown-container').empty();
            manager.render('communityDropdown', {
                dropdownId: 'event-community-dropdown',
                defaultCommunityId: window.community.id || 1,
                isCommunityAdminClass: member.isCommunityAdmin ? '' : 'hide'
            }).in('.communityDropdown-container', manager.MODE_APPEND);
            manager.render('communityDropdown', {
                dropdownId: 'share-community-dropdown',
                defaultCommunityId: window.community.id || 1,
                isCommunityAdminClass: member.isCommunityAdmin ? '' : 'hide'
            }).in('.share-community-dropdown-container', manager.MODE_APPEND)
        });
    }
};

export default Events;
