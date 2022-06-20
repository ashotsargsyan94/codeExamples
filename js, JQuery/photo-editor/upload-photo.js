/**
 * Uploads an image to the specified endpoint
 * @param {Blob} imageBlob
 * @param {string} url
 * @param communityId
 * @param {string} oldImageName
 * @param {(progressEvent: ProgressEvent<EventTarget>) => void} progressCallback optional callback used for returning info about the upload progress
 * @returns - imageURL - can be used as src for an image.
 *  - Alternatively, use URL.createObjectURL(imageBlob) to get an image that can be used as a src
 */
export default function uploadPhoto(imageBlob, url, communityId, oldImageName, progressCallback) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('image_blob', imageBlob);
        if (communityId) {
            formData.append('communityId', communityId);
        }
        if (oldImageName) {
            formData.append('oldImageName', oldImageName);
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
                    if (progressCallback && progressEvent.lengthComputable) {
                        progressCallback(progressEvent);
                    }
                };

                return xhr;
            },
        })
            .done((data) => {
                resolve(data);
            })
            .fail((error) => {
                reject(error);
            });
    });
}
