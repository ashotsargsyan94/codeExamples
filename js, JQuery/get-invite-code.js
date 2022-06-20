export default function getInviteCode() {
    return new Promise((resolve, reject) => {
        $.get({
            url: '/invite/generateSignupCode',
            success: resolve,
            error: reject,
        });
    });
}
