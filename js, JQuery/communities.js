import communitiesPopupTemplate from "./templates/communities-popup-template.js";

export const loadCommunities = () => {
    $.post(urlFrom('community/listed')).then(response => {
        $("body").addClass("flow");

        const { communities } = response;

        $(`.popup[data-popup=join-community]`).html(
            communitiesPopupTemplate(communities)
        ).fadeIn();
    });
}

$(document).on('click', '.join-communities .movetoInviteSection', function (e) {
    e.preventDefault();

    $("#inviteCodeCommunity").val('');
    $(".join-communities .step").hide();
    $(".join-communities .applyInviteCode").removeClass('hidden').show();
    $(".join-communities .stepBack").removeClass('hidden').show();
});

$(document).on('click', '.join-communities .stepBack', function (e) {
    e.preventDefault();

    $(".join-communities .applyInviteCode").addClass('hidden').hide();
    $(".join-communities .stepBack").addClass('hidden').hide();
    $(".join-communities .step").show();
});

$(document).on('keyup', '#searchRecentCommunities', function() {
    let q = $(this).val();
    let check = new RegExp(q, 'gi');
    let $noResults = $('.grpChnlLst__notFound');
    let form = $(this).closest('form');

    form.find('li.community-list strong').each(function(i, elem){
        if ($(elem).html().match(check)) {
            $(elem).closest('li').show();
        } else {
            $(elem).closest('li').hide();
        }
    });

    if (form.find('li.community-list:visible').length === 0 && $(this).val().length > 0) {
        $noResults.removeClass('hidden').show();
    } else {
        $noResults.hide();
    }
});

$(document).on('submit', '#searchCommunitiesForm', function(e) {
    e.preventDefault();
});

$(document).on('click', '.join-communities #applyInviteCodeCommunity', function (e) {
    e.preventDefault();

    const code = $('.join-communities #inviteCodeCommunity').val();
    if(!code) {
        alert('Invalid Code', 'Please provide a valid invitation code.');
        return;
    }

    $.post(urlFrom('invite/applyInvitationCode'), {code: code}).then(response => {

        $(".join-communities #inviteCodeCommunity").val('');

        switchCommunity(response.invite.communityId);

        showMessage(`You have successfully joined the community`, 2000);
        $('.popup[data-popup=join-community]').fadeOut();

    }).fail((response) => {
        if (response.responseJSON.error === 'banned_from_community') {
            return alert('', translate("You have been banned from this community by your Community Admin. If you believe this is incorrect, please contact your Community Admin."));
        }

        alert(translate('Invalid Code'), translate('This invitation code is either invalid or has expired.'));
    });
});
