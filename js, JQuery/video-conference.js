export async function getVideoConferenceLInk() {
    let conference_url = '';

    await $.post(video_conference_url + '/api/room')
        .done(response => {
            if (! empty(response) && ! empty(response.roomId) && ! empty(response.passcode)) {
                conference_url = 'roomId=' + response.roomId + '&passcode=' + response.passcode + '&join=';
            } else {
                showGenericError()
            }
        }).catch(showGenericError)

    return conference_url;
}

export function clearVideoConferenceLink(vc_link_section) {

    vc_link_section.find('.vc_link').attr("href", '').html('')
    vc_link_section.find("input[name='videoConferenceLink']").val('');
    vc_link_section.addClass('hide');
    $('#vc_link_button').removeClass('hide')

}