"use strict";

function Donations(manager) {
    this.manager = manager;
    this.stripe = null;
    this.cardElement = null;
    this.clientSecret = null;
    this.next = false;
    this.giftType = null;
    this.minAmountInCents = 100;

    $('#donations').data('DonationsObject', this);
}

Donations.prototype = {
    init() {
        this.setTitle();
        this.initAmountInput();
        this.setContent.bind(this)
        this.loadData().then(() => {
            this.initDateInput();
            this.initStripeForm();
        });
        // Fix for android keyboard covering up card information input
        // The fix inside android-keyboard.js only works for inputs that we control
        // The card information input is an iframe added by Stripe and so android-keyboard.js
        // will not be able to react to input events in the iframe
        if (window.androidWebViewInterface) {
            $("#payment-form").append('<div class="android-keyboard-spacer" style="height: 280px;"></div>');
        }
    },

    loadData() {
        return $.post(urlFrom('communityStripe/publicKey')).done(response => {
            if (response.public_key) {
                this.stripe = Stripe(response.public_key);
            } else {
                $('#payment-form .formRow').addClass('hidden');
                $('#message').html(
                    '<p class="text-center">' + translate('The community has not yet setup a deposit method. Please ask community admin setup payment method, thank you.')+ ' </p>'
                );
            }
        }).fail(showNetworkError);
    },

    initStripeForm () {
        var elements = this.stripe.elements();
        var style = {};
        let backgroundColor = '#fff';
        let color = '#000';

        if (localStorage.getItem('darkMode') == 'true') {
            backgroundColor = '#343434';
            color = '#adadad';
        }

        style = {
            base: {
                backgroundColor,
                border: '1px solid #d8d8d8',
                color,
                iconColor: '#000',
                fontSize: '16px',
                '::placeholder': {
                    color: '#b6b6b6'
                }
            },
            invalid: {
                color: '#fa755a',
                iconColor: '#fa755a'
            }
        };

        this.cardElement = elements.create('card', {style: style});
        this.cardElement.mount('#card-element');

        this.cardElement.on('change', ({error}) => {
            const displayError = document.getElementById('card-errors');

            if (error) {
                displayError.textContent = error.message;
            } else {
                displayError.textContent = '';
                $('#payment-pay .btn').prop('disabled', false);
            }
        });

        $('#cardholder-name').on('change', () => {
            $('#payment-pay .btn').prop('disabled', false);
        });
    },

    initDateInput () {
        new Vue({
            el: '#vue_donation_date',
            data: {
                date: null,
                min_date: moment().toISOString(),
            },
        })
    },

    initAmountInput() {
        //set the focus to the end of the input.
        //Since focus defaults to the start of an input we achieve this by setting the val after focus
        $('#payment-amount').focus().val(0);
    },

    setTitle() {
        let title = translate('Give To {{ communityName }}', {communityName: window.community.short_name});
        $('#donations-title').html(title);
    },

    setContent({params}) {
        this.clearContent();

        if (!params) {
            this.missingDataMessage();
        }
    },

    clearContent() {
        $('#donation #donationsForm').empty();
    },

    missingDataMessage() {
        $('#donations #donationsForm').html(`
            <li>
                <h4 class="no-content">Missing data</h4>
            </li>
        `)
    },

    countDecimals(num) {
        if(Math.floor(num).toString() === num.toString()) return 0;

        if (num.toString().indexOf('.') < 0) {
            return 0;
        }

        return num.toString().split(".")[1].length || 0;
    },

    numberBeginsWithZero(num) {
        return num.toString().indexOf('0') === 0;
    },

    amountChange (amountInputSelector) {
        let $amountInput = $(amountInputSelector);
        let val = $amountInput.val();
        let amount = parseFloat(val);

        //we only want to adjust the input if needed since changing it moves the cursor position on the user.
        let requiresUpdate = false;

        if (isNaN(amount)) {
            amount = 0;
            requiresUpdate = true;
        }

        // no negative numbers allowed
        if (amount < 0) {
            amount = Math.abs(amount);
            requiresUpdate = true;
        }

        // since the input starts with a default of 0,
        // there is a chance the user will type and it will become 01 etc. In this case,
        // setting the input value to the amount will remove the 0.
        if (amount > 0 && val.indexOf('0') === 0) {
            requiresUpdate = true;
        }

        // if the number contains more than 2 decimal points, remove the extra ones.
        // this is needed because some browsers don't respect the number input step attribute.
        if (this.countDecimals(val) > 2) {
            amount = amount.toFixed(2);
            requiresUpdate = true;
        }

        if (requiresUpdate) {
            $amountInput.val(amount);
        }

        this.resizeAmountInput($amountInput);
    },

    resizeAmountInput($amountInput) {
        let $amountWidth = $('#payment-amount-width');

        //because we need to center the amount input, we need to resize it each time it changes.
        let val = $amountInput.val();
        //copy the input value into a hidden div.
        $amountWidth.html(val);
        //get the width of that div.
        let width = $amountWidth.width();
        //if the val ends with a period, val() won't provide it,
        // so if there isn't a period, assume there maybe could be one and add some space.
        if (val.indexOf('.') === -1) {
            width += 15;
        }

        //add a speck more space so we always see the cursor
        width += 5;

        $amountInput.width(width);
    },

    giftTypeToggle (_) {

        let giftType = $(_).data('gift-type');
        $('input[name="gift-type"]').val(giftType);

        if (this.giftType !== null && this.giftType !== giftType) {
            this.reset();
        }

        this.giftType = giftType;

        if (this.giftType === 'recurring') {
            $('.gift-frequency.txtGrp, #vue_donation_date').removeClass('hidden');
        } else {
            $('.gift-frequency.txtGrp, #vue_donation_date').addClass('hidden');
        }
    },

    giftFrequencyToggle (_) {
        let giftFrequency = $(_).data('gift-frequency');
        $('input[name="gift-frequency"]').val(giftFrequency);
    },

    getAmount () {
        let amount = $('#payment-amount').val();
        return parseFloat(amount).toFixed(2) * 100;
    },

    getGiftType () {
        return $('#gift-type input').val();
    },

    getGiftFrequency () {
        return $('#gift-frequency input').val();
    },

    getGiftDate() {
        return $('#vue_donation_date input').val();
    },

    getAmountTooLowMessage() {
        return translate('Amount must be at least') + ' $' + (this.minAmountInCents / 100).toFixed(2);
    },

    nextHandle (_, event) {
        event.preventDefault();

        if (this.getAmount() < this.minAmountInCents) {
            showError(this.getAmountTooLowMessage());
            return;
        }

        let giftType = this.getGiftType();

        this.next = true;

        if (giftType === 'one_time') {
            this.getPaymentIntent().then(this.showCardFields);
        } else {
            this.showCardFields();
        }
    },

    reset() {
        this.giftType = null;
        this.clientSecret = null;
        $('#payment-next').removeClass('hidden');
        $('#payment-pay, .cardholder-name, .card-info').addClass('hidden');
        $('.card-info').addClass('hidden');
    },

    showCardFields () {
        $('#payment-next').addClass('hidden');
        $('#payment-pay, .cardholder-name, .card-info').removeClass('hidden');
        $('.card-info').removeClass('hidden');
    },

    getPaymentIntent () {
        return $.post(urlFrom('donation/paymentIntent'), {
            amount: this.getAmount(),
        }).done(
            response => this.clientSecret = response.clientSecret
        ).fail(showNetworkError);
    },

    payHandle (_, event) {
        event.preventDefault();

        if (this.getAmount() < this.minAmountInCents) {
            showError(this.getAmountTooLowMessage());
            return;
        }

        $('#payment-pay .btn').prop('disabled', true);

        if (this.getGiftType() === 'one_time') {
            this.confirmPayment();
        } else {
            this.createPaymentMethod();
        }
    },

    confirmPayment () {
        let _this = this;
        this.stripe.confirmCardPayment(this.clientSecret, {
            payment_method: {
                card: this.cardElement,
                billing_details: {
                    name: $('#cardholder-name').val()
                }
            },
            setup_future_usage: 'off_session'
        }).then(function(result) {
            if (result.error) {
                _this.cardElement.clear();
                $('#cardholder-name').clear();
                $('#payment-pay .btn').prop('disabled', false);
                showError(result.error.message);
            } else {
                if (result.paymentIntent.status === 'succeeded') {
                    _this.paymentSuccess(translate('Payment was successful!'));

                    // remove the onchange event for the stripe card form
                    _this.cardElement.off('change');

                    return location.href = urlFrom(community.id + '#subscription');

                    // Show a success message to your customer
                    // There's a risk of the customer closing the window before callback execution
                    // Set up a webhook or plugin to listen for the payment_intent.succeeded event
                    // to save the card to a Customer

                    // The PaymentMethod ID can be found on result.paymentIntent.payment_method
                }
            }
        });
    },

    // Set up payment method for recurring usage
    createPaymentMethod() {
    let billingName = $('#cardholder-name').val();

    this.stripe
      .createPaymentMethod({
          type: 'card',
          card: this.cardElement,
          billing_details: {
              name: billingName,
          },
      })
      .then((result) => {
          if (result.error) {
              showError(result.error.message);
          } else {
              this.createSubscription(result.paymentMethod.id);
          }
      });
    },

    createSubscription (paymentMethodId) {
        let _this = this;
        return $.ajax({
            url: urlFrom('donation/recurring'),
            method: 'POST',
            dataType: 'JSON',
            data: {
                amount: this.getAmount(),
                frequency: this.getGiftFrequency(),
                date: this.getGiftDate(),
                paymentMethod: paymentMethodId
            },
        }).done(function (response) {
            let subscription = response.subscription;

            if (subscription.status === 'active' || subscription.status === 'trialing') {
                _this.paymentSuccess(translate('Payment successfully scheduled !'));

                // remove the onchange event for the stripe card form
                _this.cardElement.off('change');

                return location.href = urlFrom(community.id + '#subscription');
            }

            let paymentIntent = subscription.latest_invoice.payment_intent;

            if (paymentIntent.status === 'requires_action' || paymentIntent.status === 'requires_payment_method') {
                _this.stripe.confirmCardPayment(paymentIntent.client_secret, {
                        payment_method: paymentMethodId,
                    })
                    .then((result) => {
                        if (result.error) {
                            // Start code flow to handle updating the payment details.
                            // Display error message in your UI.
                            // The card was declined (i.e. insufficient funds, card has expired, etc).
                            _this.cardElement.clear();
                            $('#payment-pay .btn').prop('disabled', false);
                            throw result;
                        } else {
                            if (result.paymentIntent.status === 'succeeded') {
                                // Show a success message to your customer.
                                // There's a risk of the customer closing the window before the callback.
                                // We recommend setting up webhook endpoints later in this guide.
                                _this.paymentSuccess(translate('Payment successfully scheduled !'));
                                return {
                                    subscription: subscription,
                                    paymentMethodId: paymentMethodId,
                                };
                            }
                        }
                    })
                    .catch((error) => {
                        showError(error.error.message);
                    });
            }
        }).fail(e => {
            if (e.responseJSON && e.responseJSON.message) {
                showError(e.responseJSON.message);
            } else {
                showNetworkError()
            }
        })
    },

    paymentSuccess (message) {
        this.cardElement.clear();
        $('#payment-pay .btn').prop('disabled', false);
        showMessage(message);
    }
};
