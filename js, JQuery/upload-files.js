/**
 * Uploads files to the specified endpoint
 * @param {File} files
 * @param {string} url
 * @param {(progressEvent: ProgressEvent<EventTarget>) => void} progressCallback optional callback used for returning info about the upload progress
 * @returns - Response
 */
export default function uploadFiles(files, url, communityId, progressCallback) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();

        if (communityId) {
            formData.append('communityId', communityId);
        }

        for (const file of Object.values(files)) {
            formData.append('files[]', file);
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
        }).done((response) => {
            resolve(response);
        }).fail((error) => {
            reject(error);
        });
    });
}

export function uploadFileS3(file, url, progressCallback) {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: 'PUT',
            crossDomain: true,
            url: url,
            contentType: file.type || 'binary/octet-stream',
            processData: false,
            data: file,
            xhr() {
                const xhr = $.ajaxSettings.xhr();

                xhr.upload.onprogress = function (progressEvent) {
                    if (progressCallback) {
                        progressCallback(progressEvent);
                    }
                };

                return xhr;
            }
        }).done((response) => {
            resolve(response);
        }).fail((error) => {
            reject(error);
        });
    });
}