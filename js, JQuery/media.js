"use strict";

import isNativeApp from '../nativescript/is-native-app.js';
import {getFiles, isImageFile, isVideoFile} from './file-input-helpers.js';
import editPhoto from '../photo-editor/edit-photo.js';
import uploadVideo from './upload-video.js';
import uploadFiles from './upload-files.js';
import {uploadFileS3} from './upload-files.js';
import uploadPhoto from '../photo-editor/upload-photo.js';

async function uploadCommentVideo(file, $addCommentForm) {
    const communityId = getCommunityIdFromAddCommentForm($addCommentForm);
    const $postButton = $addCommentForm.find('button[type="submit"]');
    let data = {};

    // add spinner
    $addCommentForm.next('.new_Post').html(/* template */`
        <div class="appLoad">
            <div class="appLoader">
                <span class="spiner"></span>
            </div>
        </div>
    `);

    // don't let them make a comment while uploading
    $postButton.attr('disabled', true);

    try {
        const extension = file.name.split('.').pop();
        let signedUploadUrl = {};

        try {
            signedUploadUrl = await $.post(
                urlFrom('uploader/getSignedUploadUrl'),
                {communityId, extension}
            );
        } catch (error) {
            // Just do not use S3 url, no need to forward error to outer catch.
        }

        if (signedUploadUrl.url) {
            await uploadFileS3(file, signedUploadUrl.url);

            data = await $.post(
                urlFrom('uploader/generateVideoPoster'),
                {
                    communityId,
                    videoFileName: signedUploadUrl.fileName
                }
            );
        } else {
            data = await uploadVideo(file, urlFrom('uploader/upload_post_video'), communityId);
        }

        // remove spinner
        $addCommentForm.next('.new_Post').find('.appLoad').remove();

        // remove any previous hidden inputs -- only one attachment allowed
        $addCommentForm.find('input.attach').remove();

        // Create a hidden input whose value will be read in for the attachment file
        $addCommentForm.append(/* template */`
            <input type="hidden" name="attach[]" class="attach" data-type="video" value="${data.fileName}" data-community="${communityId}">
        `);
        // show thumbnail with option to delete from post
        $addCommentForm.next('.new_Post').append(/* template */`
        <div class="image">
            <video poster="${data.videoUrl.replace(/\.\w+$/, '.jpg')}" preload="metadata" playsinline>
                <source src="${data.videoUrl}" type="video/mp4">
            </video>
            <div><i class="fas fa-trash del_pic" data-filename="${data.fileName}"></i></div>
        </div>
        `);

        $addCommentForm.find('.comment-attach-container').remove();

        // Allow user to begin typing and/or comment
        $addCommentForm.find('textarea').focus();
        $postButton.attr('disabled', false);
    } catch (error) {
        showError(translate('Sorry! Something went wrong while uploading your video.'));
        console.error(error);
    }
}

async function uploadCommentImage(imageBlob, $addCommentForm, oldImageName) {
    const communityId = getCommunityIdFromAddCommentForm($addCommentForm);
    const $postButton = $addCommentForm.find('button[type="submit"]');

    // don't let them make a comment while uploading
    $postButton.attr('disabled', true);

    try {
        imageBlob = await processImage(imageBlob);

        // show spinner
        $addCommentForm.next('.new_Post').html(/* template */`
            <div class="appLoad">
                <div class="appLoader">
                    <span class="spiner"></span>
                </div>
            </div>
        `);
        await uploadPhoto(imageBlob, base_url + 'uploader/upload_post_image', communityId, oldImageName).then((response) => {
            const data = response;

            // hide spinner
            $addCommentForm.next('.new_Post').find('.appLoad').remove();

            // Create a hidden input whose value will be read in for the attachment file
            $addCommentForm.append(/* template */`
                <input type="hidden" name="attach[]" class="attach" value="${data.fileName}">
            `);
            // Delete a hidden input whose value is filtered original attachment file
            $addCommentForm.find('input[type=hidden].attach').filter(function(){return this.value === data.deletedPhoto}).remove();

            // show thumbnail with option to delete from post
            $addCommentForm.next('.new_Post').append(generateImageBoxTemplate(data));

            $addCommentForm.find('.comment-attach-container').remove();

            // Allow user to begin typing and/or comment
            $addCommentForm.find('textarea').focus();
            $postButton.attr('disabled', false);
        })
    } catch (error) {
        showError(translate('Sorry! Something went wrong while uploading your image.'));
        console.error(error);
    }
}

async function processImage(imageBlob) {
    // run the photo through the editor since it fixes orientation issues, but don't show the editor UX.
    return await editPhoto(imageBlob, 2400, 2400, false, false);
}

async function uploadPostVideo(file) {
    const $createPostForm = getCreatePostForm();
    const communityId = getCommunityIdFromCreatePostForm($createPostForm);
    const $postButton = $('.createPost');

    // show progress bar
    const $progressBarWrapper = getProgressBar($createPostForm);
    $progressBarWrapper.removeClass('hidden');

    // don't let them make a post while uploading
    $postButton.attr('disabled', true);

    let data = {};

    try {
        const extension = file.name.split('.').pop();
        let signedUploadUrl = {};

        try {
            signedUploadUrl = await $.post(
                urlFrom('uploader/getSignedUploadUrl'),
                {communityId, extension}
            );
        } catch (error) {
            // Just do not use S3 url, no need to forward error to outer catch.
        }

        if (signedUploadUrl.url) {
            await uploadFileS3(file, signedUploadUrl.url, (progressEvent) => reportProgress(progressEvent, $progressBarWrapper));

            data = await $.post(
                urlFrom('uploader/generateVideoPoster'),
                {
                    communityId,
                    videoFileName: signedUploadUrl.fileName,
                }
                );
        } else {
            data = await uploadVideo(
                file,
                urlFrom('uploader/upload_post_video'),
                communityId,
                (progressEvent) => reportProgress(progressEvent, $progressBarWrapper)
            );
        }

        // Create a hidden input whose value will be read in for the attachment file
        $createPostForm.append(/* template */`
            <input type="hidden" name="attach[]" class="attach video" data-type="video-${data.fileType}" value="${data.fileName}" data-community="${communityId}">
        `);

        // show thumbnail with option to delete from post
        let $new_Post = $createPostForm.next('.new_Post');

        if (! $new_Post.length) {
            $new_Post = $createPostForm.find('.new_Post');
        }


        $new_Post.append(generateVideoBoxTemplate(data));

        $createPostForm.find('.comment-attach-container').remove();
        saveAttachmentsDraft('video', data);
    } catch (error) {
        showError(translate('Sorry! Something went wrong while uploading your video.'));
        console.error(error);
    } finally {
        //hide progress bar
        $progressBarWrapper.addClass('hidden');

        // Allow user to begin typing and/or post
        $createPostForm.find('textarea').focus();
        $postButton.attr('disabled', false);
    }
}

async function uploadPostFiles(files) {
    const $createPostForm = getCreatePostForm();
    const communityId = getCommunityIdFromCreatePostForm($createPostForm);
    const $postButton = $('.createPost');

    // show progress bar
    const $progressBarWrapper = getProgressBar($createPostForm);
    $progressBarWrapper.removeClass('hidden');

    // don't let them make a post while uploading
    $postButton.attr('disabled', true);

    let data = {};

    const fileArr = [...files];

    try {
        for (const file of fileArr) {
            const extension = file.name.split('.').pop();
            let signedUploadUrl = {};

            try {
                signedUploadUrl = await $.post(
                    urlFrom('uploader/getSignedUploadUrl'),
                    {communityId, extension}
                );
            } catch (error) {
                // Just do not use S3 url, no need to forward error to outer catch.
            }

            if (signedUploadUrl.url) {
                await uploadFileS3(file, signedUploadUrl.url, (progressEvent) => reportProgress(progressEvent, $progressBarWrapper));

                data = { files: [{ fileName: signedUploadUrl.fileName, fileUrl: signedUploadUrl.fileUrl, originalFileName: file.name }] };
            } else {
                data = await uploadFiles(
                    [file],
                    base_url + 'uploader/upload_files',
                    communityId,
                    (progressEvent) => reportProgress(progressEvent, $progressBarWrapper)
                );
            }

            // Create a hidden input whose value will be read in for the attachment file
            $createPostForm.append(data.files.map(file => /* template */`
                <input type="hidden" name="attachment_files[]" class="attach" data-type="file" value="${encodeURIComponent(JSON.stringify({fileName: file.fileName, originalFileName: file.originalFileName}))}" data-file="${file.originalFileName}" data-community="${communityId}">
            `));

            //                <input type="hidden" name="attachment_files[${file.fileName}][fileName]" class="attach" data-type="file" value="${file.fileName}" data-community="${communityId}"  data-originalFileName="${file.originalFileName}">
            //                  <input type="hidden" name="attachment_files[${file.fileName}][originalFileName]" class="attach original" data-type="file" value="${file.originalFileName}" data-community="${communityId}">

            // show thumbnail with option to delete from post
            let $filesContainer = $createPostForm.siblings('.files-container');
            if ($filesContainer.length == 0) {
                $filesContainer = $createPostForm.find('.files-container');
            }

            $filesContainer.append(
                data.files.map(file => /* template */`
                    <div class="uploaded-file">
                        <img src="${base_url}/assets/images/site_icon/icon-clip.svg" class="file-icon" alt="">
                        <a class="file" href="${file.fileUrl}" target="_blank">
                            ${getEllipsisString(file.originalFileName)}
                        </a>
                        <i class="fi-cross del_file" data-filename="${file.originalFileName}"></i>
                    </div>
                `).join('')
            );
        }
        saveAttachmentsDraft('files', data);
    } catch (error) {
        showError(translate('Sorry! Something went wrong while uploading your files.'));
        console.error(error);
    } finally {
        //hide progress bar
        $progressBarWrapper.addClass('hidden');

        // Allow user to begin typing and/or post
        $createPostForm.find('textarea').focus();
        $postButton.attr('disabled', false);
    }
}

async function uploadPostImage(imageBlob, originalFileName = null) {
    const $createPostForm = getCreatePostForm();
    const communityId = getCommunityIdFromCreatePostForm($createPostForm);
    const $postButton = $('.createPost');

    // show progress bar
    const $progressBarWrapper = getProgressBar($createPostForm);
    $progressBarWrapper.removeClass('hidden');

    // don't let them make a post while uploading
    $postButton.attr('disabled', true);
    try {
        imageBlob = await processImage(imageBlob);

        const data = await uploadPhoto(
            imageBlob,
            base_url + 'uploader/upload_post_image',
            communityId,
            (progressEvent) => reportProgress(progressEvent, $progressBarWrapper)
        );

        // Create a hidden input whose value will be read in for the attachment file
        $createPostForm.append(/* template */`
            <input type="hidden" name="attach[]" class="attach" value="${data.fileName}" data-community="${communityId}">
        `);

        // show thumbnail with option to delete from post
        let $new_Post = $createPostForm.next('.new_Post');
        if (! $new_Post.length) {
            $new_Post = $createPostForm.find('.new_Post');
        }

        let $imageBox = generateImageBoxTemplate(data);

        if (originalFileName) {
            // swap the original image box with the new one.
            $new_Post.find('.filter_pic[data-filename="' + originalFileName + '"]').closest('.image').replaceWith($imageBox);

            //remove the previous image from the form attachments
            $createPostForm.find(`.attach[value="${ originalFileName }"]`).remove();
        } else {
            $new_Post.append($imageBox)
        }

        $createPostForm.find('.comment-attach-container').remove();
        saveAttachmentsDraft('image', data);
    } catch (error) {
        showError(translate('Sorry! Something went wrong while uploading your image.'));
        console.error(error);
    } finally {
        //hide progress bar
        $progressBarWrapper.addClass('hidden');

        // only on web
        if (!isNativeApp()) {
            // Allow user to begin typing and/or post
            $createPostForm.find('textarea').focus();
        }

        $postButton.attr('disabled', false);
    }
}

/**
 * Retrieves the progress bar element and resets its values
 * @param {JQuery<HTMLElement>} $sibling
 * @returns {JQuery<HTMLElement>}
 */
function getProgressBar($sibling) {
    let $progressBarWrapper = $sibling.siblings('#uploadProgressBar');
    if ($progressBarWrapper.length == 0) {
        $progressBarWrapper = $sibling.find('#uploadProgressBar');
    }

    $progressBarWrapper.attr('aria-valuenow', '0');

    const $progressBar = $progressBarWrapper.find('.progress-bar');
    $progressBar.width('0%');
    $progressBar.text('0%');

    return $progressBarWrapper;
}

/**
 * Update progress bar with progress event info
 * @param {ProgressEvent<EventTarget>} progressEvent
 * @param {JQuery<HTMLElement>} $progressBarWrapper
 * @returns {void}
 */
function reportProgress(progressEvent, $progressBarWrapper) {
    if (progressEvent.lengthComputable) {
        const currentPercentage = `${Math.round(progressEvent.loaded / progressEvent.total * 100)}%`;
        const $progressBar = $progressBarWrapper.find('.progress-bar');

        $progressBar.width(currentPercentage);
        $progressBar.text(currentPercentage);
    }
}

async function handlePostMedia(files) {
    for (const file of files) {
        if (isImageFile(file)) {
            await uploadPostImage(file);
        } else if (isVideoFile(file)) {
            await uploadPostVideo(file);
        }
    }
}

async function handleFilterPhoto(event, type) {
    try {
        let imageUrl = $(event.target).data('file');
        let file = await fetch(imageUrl).then(r => r.blob());
        let imageName = $(event.target).data('filename');

        let imageBlob = await editPhoto(file, 2400, 2400, false);
        if (imageBlob) {
            if (type === 'post') {
                await uploadPostImage(imageBlob, $(event.target).data('filename'));
            } else if (type === 'comment') {
                await uploadCommentImage(imageBlob, $(event.target).closest('.new_Post').prev('form'), imageName);
            }
        }
    } catch (error) {
        showError(translate('Sorry! Something went wrong while retrieving your file'));
        console.error(error);
    }
}

async function handleCommentMedia(files, $addCommentForm) {
    for (const file of files) {
        if (isImageFile(file)) {
            await uploadCommentImage(file, $addCommentForm);
        } else if (isVideoFile(file)) {
            await uploadCommentVideo(file, $addCommentForm);
        }
    }
}

function getCreatePostForm() {
    let $createPostForm = $('.popup .writePost .postMedia');

    if (! $createPostForm.length) {
        $createPostForm = $('.postMedia');
    }

    return $createPostForm;
}

function getCommunityIdFromCreatePostForm($createPostForm) {
    const $textArea = $createPostForm.find('textarea');
    return $textArea.data('community') || window.community.id;
}

function getCommunityIdFromAddCommentForm($addCommentForm) {
    const $postBlk = $addCommentForm.closest('.postBlk');
    return $postBlk.data('communityId') || window.community.id;
}

function uploadClipboardImage(file, $target) {
    uploadCommentImage(file, $target.closest('form'));
}

$(function() {
    // Upload images & videos for post if a file is selected
    $('#appLd').on('change', '.photoVideoInput', async function () {
        try {
            const files = await getFiles.call(this);

            if (files) {
                await handlePostMedia(files);

                if ($(this).siblings('input[name="attach[]"]').length) {
                    $(this).siblings('.btnBlk').find('button.cancelButton').show();
                }
            }

            $(this).siblings('.txtBoxOut, .chatCreatePost').find('textarea.cmntBxMain').trigger('input');

        } catch (error) {
            showError(translate('Sorry! Something went wrong while retrieving your file'));
            console.error(error);
        }

        $(this).val('');
    });

    $(document).on('paste', function(event) {
        const $focused = $(':focus');

        if ($focused.length === 0) {
            return;
        }

        const clipboardData = (event.clipboardData || event.originalEvent.clipboardData).items;

        for (let index in clipboardData) {
            let item = clipboardData[index];

            if (item.kind === 'file') {
                let blob = item.getAsFile();
                let reader = new FileReader();

                reader.onload = function (event) {
                    uploadClipboardImage(blob, $focused);
                };

                reader.readAsDataURL(blob);
            }
        }
    });

    $('#appLd').on('change', '.fileInput', async function () {
        try {
            const files = await getFiles.call(this);

            if (!files || !files.length) {
                return;
            }

            uploadPostFiles(files);
        } catch (error) {
            showError(translate('Sorry! Something went wrong while retrieving your file'));
            console.error(error);
        }

        $(this).val('');
    });

    // Upload images & videos for post if a file is selected
    $(document).on('change', '.commentMediaInput', async function () {
        try {
            const files = await getFiles.call(this);

            if (files) {
                const $addCommentForm = $(this).closest('form');

                // only allow one upload per comment
                $addCommentForm.next(".new_Post").find('.del_pic:first').trigger('click');

                handleCommentMedia(files, $addCommentForm);
            }
        } catch (error) {
            showError(translate('Sorry! Something went wrong while retrieving your file.'));
            console.error(error);
        }

        $(this).val('');
    });

    $('#appLd').on('click', '.postCmnt .new_Post .filter_pic, .postCmnt .postEdit .post-attach .image .filter_pic', function(event) {
        handleFilterPhoto(event, 'comment')
    });

    $('#appLd').on('click', '.writePost .new_Post .filter_pic, .writePost .postEdit .post-attach .image .filter_pic, .chatForm .new_Post .filter_pic', function(event) {
        handleFilterPhoto(event, 'post')
    });

});
