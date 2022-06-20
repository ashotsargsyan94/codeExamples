import isNativeApp from '../nativescript/is-native-app.js';

localStorage.removeItem('masked');

const Login = (function() {
    const $loginForm = $('#loginForm');
    let messageTimeoutId;

    const showLoginMessage = (message, hideAfter, isError = false) => {
        const $messageBox = $('div.alertMsg:first');

        $messageBox.html('').slideUp(200);
        $messageBox.toggleClass('alert alert-danger', isError);
        $messageBox.html( message ).slideDown(500);

        if (hideAfter !== 0) {
            clearTimeout(messageTimeoutId);
            messageTimeoutId = setTimeout(() => {
                $messageBox.slideUp(500).html('');
            }, hideAfter || 5000);
        }
    };

    $loginForm.validate({
        rules: {
            email: {
                required: true,
                email: true
            },
            password: {
                required: true,
            }
        },
        errorPlacement: function () {
            return false;  // suppresses error message text
        }
    });

    $loginForm.on('submit', function(e) {
        e.preventDefault();
        e.stopPropagation();

        const $loginButton = $('#loginButton');
        $loginButton.attr('disabled', true);

        const email = $('#email').val();
        const password = $('#password').val();
        const rememberMe = $('#rememberMe').prop("checked") ? 1 : 0;

        // Show loading spinner
        $loginButton.find('i').removeClass('hidden');

        $.post(app_url + 'login/process', { email, password, rememberMe })
            .then(response => {
                response.message && showLoginMessage(response.message);

                localStorage.setItem('token', response.token);
                localStorage.setItem('apiToken', response.apiToken);

                window.nsWebViewInterface.emit('explicitLogout', false);

                function login() {
                    setTimeout(() => {
                        // hide loading spinner
                        location.reload();
                        $loginButton.find('i').addClass('hidden');
                    }, 750);
                }

                const biometricAuth = localStorage.getItem('biometricAuth');
                if (isNativeApp() && biometricAuth !== 'false') {
                    const webView = window.nsWebViewInterface;
                    let gotBiometricOptions = false;
                    webView.on('biometricOptions', (type) => {
                        if (!type.any) return login();
                        // Don't execute function more than once
                        if (gotBiometricOptions) return;
                        gotBiometricOptions = true;

                        const credentials = {
                            email: $('#email').val(),
                            password: $('#password').val(),
                        };
                        // The user has previously okayed using biometric signin
                        // Let's update their credentials
                        if (biometricAuth === 'true') {
                            webView.on('loginCredentialsStored', () => {
                                login();
                            });
                            webView.emit('storeLoginCredentials', credentials);
                        } else {
                            // this user has not yet decided if they want to use biometric signin
                            // let's ask and remember their decision. If yes, let's also store their credentials
                            // securely for a quick login later
                            webView.on('biometricSignInConfirm', (confirm) => {
                                if (confirm) {
                                    localStorage.setItem('biometricAuth', true);
                                    webView.on('loginCredentialsStored', () => {
                                        login();
                                    });
                                    webView.emit('storeLoginCredentials', credentials);
                                } else {
                                    localStorage.setItem('biometricAuth', false);
                                    webView.emit('removeLoginCredentials');
                                    login();
                                }
                            });
                            webView.emit('confirmBiometricSignIn');
                        }
                    });
                    webView.emit('getBiometricOptions');
                } else {
                    login();
                }
            }).catch(({ responseJSON }) => {
                // hide loading spinner
                $loginButton.find('i').addClass('hidden');

                $loginButton.attr('disabled', false);

                if (responseJSON.error) {
                    showLoginMessage(responseJSON.error, 0, true);
                } else {
                    console.error(responseJSON);
                }
            });
    });

    $('#confirmCodeButton').click(function () {
        const $this = $(this);
        const $confirmCodes = $('.confirm-code');

        // clear errors
        $('#confirmCodeError').html('').hide();

        // Build otp from inputs
        const otp = $confirmCodes.map(function () {
            return $(this).val();
        }).get().join('');

        // only allow a single click
        $this.attr('disabled', true)

        $.ajax({
            type: 'POST',
            dataType: 'json',
            url: base_url + 'login/verifyOtp',
            data: {
                otp
            },
            success: function () {
                location.reload();
            },
            error: function (xhr) {
                // create a less jarring appearance when request is quick
                setTimeout(() => {
                    $('#confirmCodeError').html(translate('Invalid code. Please try again.')).fadeIn();
                    $this.attr('disabled', false);
                }, 300);
            }
        });
    });

    $('#login .prevBtn').click(function (e) {
        e.preventDefault();

        if (window.nsWebViewInterface) {
            window.nsWebViewInterface.emit('explicitLogout', true);
            window.nsWebViewInterface = null;
        }

        $.post(urlFrom('login/logout'))
            .then(() => {
                location.reload()
            })
            .fail(showGenericError);
    });

    $('#resendCode').click((event) => {
        event.preventDefault()
        event.stopPropagation()

        const $this = $(this)

        $this.attr('disabled', true)

        $.post(urlFrom('login/resendOtp')).then(() => {
            $('.confirm-code').val('')
            $this.attr('disabled', false)
        }).catch((error) => {
            console.error(error)
            $('#phone').addClass('error')
        })
    })

    return {
        // Put exportable methods and properties here
    }
})();
