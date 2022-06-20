export function updateBioCharCount() {
    const currentBio = $('#bio').val();

    const bioCounter = $("#bio-counter");

    bioCounter.text(`${currentBio.length}/150 ${window.translate('characters')}`);

    if (currentBio.length === 150) {
        bioCounter.addClass('char-limit');
    } else {
        bioCounter.removeClass('char-limit');
    }
}
