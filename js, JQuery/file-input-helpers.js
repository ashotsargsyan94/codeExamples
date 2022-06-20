/**
 * Call function with context of input
 * ex. $('input').change(function() { getFile.call(this).then(() => {...}) };
 */
export function getFile() {
    return new Promise((resolve) => {
        const file = this.files && this.files[0];
        if (file) {
            return resolve(file);
        }
        return resolve();
    });
}

/**
 * Return files list for multiple select
 */
export function getFiles() {
    return new Promise((resolve) => {
        const file = this.files && this.files[0];
        if (file) {
            // return all files for multiple select
            return resolve(this.files);
        }
        return resolve();
    });
}

export function isImageFile(file) {
    return file && file.type && /^image\/\w+$/.test(file.type);
}

export function isVideoFile(file) {
    return file && (
        (file.type && /^video\/\w+$/.test(file.type))
        || (file.name && file.name.split('.').pop() == 'qt')
    );
}
