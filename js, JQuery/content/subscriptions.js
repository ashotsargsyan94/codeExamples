"use strict";

function Subscriptions(manager) {
    this.manager = manager;
    this.settingsData = null;
    this.user = null;
    this.customerData = null;
    this.customerCharges = null;
    this.selectedCustomerDataIndex = null;
    this.selectedSubscriptionIndex = null;
    this.sortBy = [];
    this.sortDesc = [];
    this.subscriptionFields = [
        {
            key: 'amount',
            label: translate('Amount'),
            thClass: 'amount_col'
        },
        {
            key: 'status',
            label: translate('Status'),
            thClass: 'status_col'
        },
        {
            key: 'interval',
            label: translate('Interval'),
            thClass: 'interval_col'
        },
        {
            key: 'latest_invoice',
            label: translate('Last Payment'),
            thClass: 'latest_invoice_col'
        },
        {
            key: 'next_payment_date',
            label: translate('Next Payment'),
            thClass: 'next_payment_date_col'
        },
        {
            key: 'actions',
            label: translate('Actions'),
            thClass: 'actions_col'
        }
    ];
    this.chargesFields = [
        {
            key: 'amount',
            label: translate('Amount'),
            thClass: 'amount_col'
        },
        {
            key: 'status',
            label: translate('Status'),
            thClass: 'status_col'
        },

        {
            key: 'card',
            label: translate('Card'),
            thClass: 'card_col'
        },
        {
            key: 'date',
            label: translate('Date Payment'),
            thClass: 'date_col'
        },
        {
            key: 'description',
            label: translate('Description'),
            thClass: 'description'
        }
    ];
    this.subscriptionsData = [];


    $('#subscriptions').data('SubscriptionsObject', this);
}

Subscriptions.prototype = {
    init() {
        this.loadData()
    },

    async loadData() {
        await this.loadSettings();
        this.setContent.bind(this);
        this.setTexts();

        this.loadCharges().then(() => {
            this.renderChargesTables();
            this.renderChargesTab();
        });

        await this.loadSubscriptions().then(() => {
            this.subscriptionsData = this.getSubscriptionsData()
            this.renderSubscriptionsTables();
            this.renderSubscriptionsTab();
        });

        $('#subscriptions .nav.nav-tabs, #subscriptions .tab-content').removeClass('hidden');
    },

    async loadSettings() {
        let _this = this;
        return await $.ajax({
            type: "POST",
            url: urlFrom('load/settings'),
            dataType: 'json'
        }).done((response) => {
            _this.settingsData = response;
            _this.user = _this.settingsData.user;
            delete _this.settingsData.user;
        })
            .fail(e => {
                console.log(e)
                showNetworkError()
            });
    },


    async loadSubscriptions() {
        return await $.post(urlFrom('stripe/subscriptions'), {
            member_id: this.user.id
        }).done((response) => {
            this.customerData = response.customerData;
        }).fail(showNetworkError);
    },

    async loadCharges() {
        let _this = this;
        let data = {
            member_id: this.user.id
        };

        return await $.ajax({
            type: "POST",
            url: urlFrom('stripe/charges'),
            data,
            dataType: 'json'
        }).done((response) => {
            _this.customerCharges = response.customerCharges;
        })
            .fail(e => {
                console.log(e)
                showNetworkError()
            });
    },

    subscriptionMessage() {
        if (!this.settingsData) {
            return '';
        }

        return translate('Squirrel Version: Free');
    },

    setTexts () {
        let subscriptionMessage = this.subscriptionMessage();

        $('#title a').text(translate(' Subscription'));
        $('#subscriptionMessage').html(subscriptionMessage);

        $('a[href="#subscriptionTab"]').text(translate('Subscriptions'));
        $('a[href="#historyTab"]').text(translate('History'));

    },

    moneyFormat(amount) {
        return '$' + (amount / 100).toFixed(2);
    },

    upperFirstLetter(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    getSubscriptionsData() {
        let subscriptionsData = [];

        if (!this.customerData) {
            return [];
        }

        this.customerData.forEach((customerData, index, array) => {
            let subscriptions = [];

            customerData.customer.subscriptions.data.forEach((subscription, index, array) => {
                subscriptions.push({
                    amount: this.moneyFormat(subscription.plan.amount),
                    status: subscription.status == 'trialing' ? translate('Scheduled') : translate(this.upperFirstLetter(subscription.status)),
                    interval: this.getIntervalString(subscription.plan.interval, subscription.plan.interval_count),
                    latest_invoice: this.getLastInvoice(subscription.latest_invoice),
                    next_payment_date: moment.unix(subscription.current_period_end).format('MM/DD/YYYY'),
                    actions: {
                        customerId: subscription.customer
                    },
                    subscriptionId: subscription.id,
                    communityId: customerData.community_id,
                    communityName: customerData.community_name
                });
            });

            subscriptionsData.push(subscriptions);
        });

        return subscriptionsData;
    },

    getIntervalString(interval, intervalCount) {
        if (interval == 'week') {
            return intervalCount == 1 ? translate('Weekly') : translate('Every 2 weeks');
        } else if (interval == 'month') {
            return translate('Monthly')
        }
    },

    getLastInvoice(lastInvoice) {
        if (lastInvoice.amount_paid > 0 && lastInvoice.status == 'paid') {
            return {
                date: moment.unix(lastInvoice.created).format('MM/DD/YYYY'),
                link: lastInvoice.invoice_pdf
            }
        } else {
            return null;
        }
    },

    renderSubscriptionsThead () {
        let tr = $('<tr/>');
        for (let i = 0; i < this.subscriptionFields.length; i++)
        {
            tr.append(
                $('<th/>', {
                    class: this.subscriptionFields[i].thClass,
                    html: $('<div/>', {
                        text: this.subscriptionFields[i].label
                    })
                })
            )
        }

        return $('<thead/>', {
            append: tr
        })
    },

    renderSubscriptionsRows (subscriptionsArr, index) {
        let tbody = $('<tbody/>');

        for (let i = 0; i < subscriptionsArr.length; i++)
        {
            let tr = $('<tr/>', {
                class: 'subscription_row_' + i
            });

            for (let m = 0; m < this.subscriptionFields.length; m++)
            {
                let td = '';
                if (this.subscriptionFields[m].key == 'latest_invoice') {
                    if (subscriptionsArr[i].latest_invoice) {
                        td = $('<td/>', {
                            append: $('<a/>', {
                                href: subscriptionsArr[i].latest_invoice.link,
                                text: subscriptionsArr[i].latest_invoice.date,
                                class: 'btn btn-link',
                                target: '_blank'
                            })
                        })
                    } else {
                        td = $('<td/>');
                    }

                } else if (this.subscriptionFields[m].key == 'actions') {
                    td = $('<td/>', {
                        append: $('<button/>', {
                            class: 'btn btn-link openCancelSubscriptionBtn',
                            text: translate('Cancel'),
                            'data-subscription-index': i,
                            'data-customerdata-index': index
                        })
                    })
                } else {
                    td = $('<td/>', {
                        text: subscriptionsArr[i][this.subscriptionFields[m].key]
                    })
                }

                tr.append(td);

            }

            tbody.append(tr);
        }

        return tbody
    },

    renderSubscriptionsTables () {
        for (let i = 0; i < this.subscriptionsData.length; i++)
        {
            let communitySubscriptions = this.subscriptionsData[i];

            if (communitySubscriptions.length) {
                let title = translate('{{ communityName }} subscriptions', {communityName: communitySubscriptions[0].communityName});

                $('<div/>', {
                    class: 'blk mb-10',
                    id: 'subscriptions_table_' + i,
                    append: $('<h4/>', {
                        text: title
                    })
                }).append($('<div/>', {
                    class: 'community_subscriptions table-responsive',
                    append: $('<table/>', {
                        class: 'table b-table table-striped table-hover',
                        append: this.renderSubscriptionsThead()
                    }).append(this.renderSubscriptionsRows(communitySubscriptions, i))
                })).appendTo('#tablesSubscriptions');
            }
        }

        let _this = this;
        setTimeout(() => {
            $('.openCancelSubscriptionBtn').click(function(e){
                _this.openCancelSubscriptionModal(e.target)
            });

            $('#btnCancelSubscription').click(function(e){
                _this.cancelSubscription()
            });
        });
    },

    renderChargesThead () {
        let tr = $('<tr/>');
        for (let i = 0; i < this.chargesFields.length; i++)
        {
            tr.append(
                $('<th/>', {
                    class: this.chargesFields[i].thClass,
                    html: $('<div/>', {
                        text: this.chargesFields[i].label
                    })
                })
            )
        }

        return $('<thead/>', {
            append: tr
        })
    },

    renderChargesRows (chargesArr) {
        let tbody = $('<tbody/>');

        for (let i = 0; i < chargesArr.length; i++)
        {
            let tr = $('<tr/>');

            for (let m = 0; m < this.chargesFields.length; m++)
            {
                let td = '';

                switch (this.chargesFields[m].key) {
                    case "amount" :
                        td = $('<td/>', {
                            text: this.moneyFormat(chargesArr[i].amount)
                        });
                        break;

                    case "status" :
                        td = $('<td/>', {
                            text: translate(this.upperFirstLetter(chargesArr[i].status))
                        });
                        break;

                    case "card" :
                        td = $('<td/>', {
                            text: chargesArr[i].payment_method_details.card.last4
                        });
                        break;

                    case "date" :
                        if (chargesArr[i].invoice) {
                            td = $('<td/>', {
                                class: 'text-center',
                                append: $('<a/>', {
                                    href: chargesArr[i].invoice.invoice_pdf,
                                    text: moment.unix(chargesArr[i].created).format('MM/DD/YYYY'),
                                    class: 'btn-link',
                                    target: '_blank'
                                })
                            })
                        } else {
                            td = $('<td/>', {
                                class: 'text-center',
                                text: moment.unix(chargesArr[i].created).format('MM/DD/YYYY')
                            });
                        }

                        break;

                    case "description" :
                        td = $('<td/>', {
                            text: chargesArr[i].failure_message ? chargesArr[i].failure_message : chargesArr[i].description
                        });
                        break;

                    default:
                        td = $('<td/>', {
                            text: chargesArr[i][this.chargesFields[m].key]
                        });
                        break;
                }

                tr.append(td);

            }

            tbody.append(tr);
        }

        return tbody
    },

    renderChargesTables () {
        for (let i = 0; i < this.customerCharges.length; i++)
        {
            let communityCharges = this.customerCharges[i];

            if (communityCharges.charges.length) {
                let title = translate('{{ communityName }} charges', {communityName: communityCharges.community_name});

                $('<div/>', {
                    class: 'blk mb-10',
                    append: $('<h4/>', {
                        text: title
                    })
                }).append($('<div/>', {
                    class: 'community_charges table-responsive',
                    append: $('<table/>', {
                        class: 'table b-table table-striped table-hover',
                        append: this.renderChargesThead()
                    }).append(this.renderChargesRows(communityCharges.charges))
                })).appendTo('#tablesCharges');
            }
        }
    },

    renderSubscriptionsTab() {
        if (! $('#tablesSubscriptions').children().length) {
            $('[href="#subscriptionTab"]').parent().hide();
        }
    },

    renderChargesTab() {
        if (! $('#tablesCharges').children().length) {
            $('[href="#historyTab"]').parent().hide();
        }
    },

    openCancelSubscriptionModal(btn) {
        this.selectedCustomerDataIndex = $(btn).data('customerdata-index');
        this.selectedSubscriptionIndex = $(btn).data('subscription-index');
        $('#cancelSubscriptionModal').modal('show');
    },

    cancelSubscription() {
        let _this = this;
        let data = {
            community_id: this.customerData[this.selectedCustomerDataIndex].community_id,
            subscription_id: this.customerData[this.selectedCustomerDataIndex].customer.subscriptions.data[this.selectedSubscriptionIndex].id
        };

        $.ajax({
            type: "POST",
            url: urlFrom('communityStripe/cancel'),
            data,
            dataType: 'json'
        }).done((response) => {
            if (response.success === true) {
                _this.clearSubscription();
                $('#cancelSubscriptionModal').modal('hide');
                showMessage(translate('Subscription successfully canceled!'));
            } else {
                showNetworkError();
            }
        })
            .fail(e => {
                console.log(e)
                showNetworkError()
            });
    },

    clearSubscription() {
        $('#subscriptions_table_' + this.selectedCustomerDataIndex + ' .subscription_row_' + this.selectedSubscriptionIndex).remove();

        this.selectedCustomerDataIndex = null;
        this.selectedSubscriptionIndex = null;
    },

    setContent({params}) {
        this.clearContent();

        if (!params) {
            this.missingDataMessage();
        }
    },

    clearContent() {
        $('#subscriptions').empty();
    },

    missingDataMessage() {
        $('#subscriptions').html(`
            <li>
                <h4 class="no-content">${translate('Missing data')}</h4>
            </li>
        `)
    },
};
