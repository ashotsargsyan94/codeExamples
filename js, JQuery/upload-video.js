/**
 * Uploads a video to the specified endpoint
 * @param {File} file
 * @param {string} url
 * @param {(progressEvent: ProgressEvent<EventTarget>) => void} progressCallback optional callback used for returning info about the upload progress
 * @returns - Response
 */
export default function uploadVideo(file, url, communityId, progressCallback) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();

        formData.append('video', file);

        if (communityId) {
            formData.append('communityId', communityId);
        }

        $.ajax({
            url,
            type: 'POST',
            contentType: false,
            processData: false,
            data: formData,
            xhr: function () {
                const xhr = $.ajaxSettings.xhr();

                xhr.upload.onprogress = function (progressEvent) {
                    if (progressCallback) {
                        progressCallback(progressEvent);
                    }
                };

                return xhr;
            },
        })
            .done((response) => {
                resolve(response);
            })
            .fail((error) => {
                reject(error);
            });
    });
}
