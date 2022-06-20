const {
    ENVIRONMENT,
    PUSHER_APP_KEY,
    PUSHER_APP_CLUSTER,
    PUSHER_SERVER_UID,
    PUSHER_DEBUG,
} = window.app.constants;

if (ENVIRONMENT !== 'production') {
    Pusher.logToConsole = PUSHER_DEBUG;
}

/**
 * Handles subscriptions and events to pusher events from the server
 * All public methods return this & thus are chainable
 */
class PusherManager {
    constructor(member) {
        this._pusher = new Pusher(PUSHER_APP_KEY, {
            cluster: PUSHER_APP_CLUSTER,
            authEndpoint: urlFrom('pusher/auth'),
        });

        this.member = member
        this._subscriptions = [];
        this._eventCallbacks = new Map();

        this._init();

        this.updateSubscriptions();
    }

    _init() {
        // Listen to all events, regardless of channel
        this._pusher.bind_global((eventName, data) => {
            this._trigger(eventName, data);

            $(document).trigger('push.event.received', { eventName, ...data });
        });

        const isNative = !!localStorage.getItem('isNativeApp');

        if (isNative) {
            this._registerMobileWakeupActions();
        }
    }

    _registerMobileWakeupActions() {
        this._pusher.connection.bind('connected', () => {
            const firstConnection = sessionStorage.getItem('firstConnection');

            sessionStorage.setItem('firstConnection', 'false');

            if (firstConnection !== 'false' || ! window.mainData || ! mainData.channel.id) {
                return;
            }

            // The regex is necessary for Safari compatiblity reasons
            function getDate(dateString) {
                return new Date(dateString.replace(/-/g, '/'));
            }

            $.post(urlFrom(`channels/lastPostDate/${mainData.channel.id}`)).then(({ date }) => {
                const lastLoadedPostDateString = $('#engage .posts').first().data('updated_at');

                if (date && lastLoadedPostDateString) {
                    const lastLoadedPostDate = getDate(lastLoadedPostDateString);
                    const mostRecentPostDate = getDate(date);
                    if (mostRecentPostDate > lastLoadedPostDate) {
                        showMessage(translate('There is new content you have missed! Pull down to refresh.'), 2000);
                    }
                }
            }).fail($.noop); // Fail silently
        });
    }

    updateSubscriptions() {
        const subscriptions = [
            'global',                       // Global announcements
            `private-${this.member.id}`,    // Member updates
            ...this.member.channelsNotified.map(channel => `channel-${channel.id}`),
        ];

        const unsubscriptions = this._subscriptions.filter(channel => ! subscriptions.includes(channel));

        this._unsubscribe(unsubscriptions)
            ._subscribe(subscriptions);
    }

    /**
     * Subscribe user to given channels
     * @param {[string] | string} channels
     */
    _subscribe(channels) {
        const newSubscriptions = channels.filter(channel => ! this._subscriptions.includes(channel));

        if (! newSubscriptions.length) {
            return this;
        }

        newSubscriptions.forEach(channel => this._pusher.subscribe(channel + PUSHER_SERVER_UID));

        this._subscriptions = [ this._subscriptions, ...newSubscriptions ];

        // console.log('Subscribed to Pusher channels', newSubscriptions);

        return this;
    }

    /**
     * Unsubscribe user from given channels
     * @param {[string] | string} channels
     */
    _unsubscribe(channels) {
        if (! channels.length) {
            return this;
        }

        channels.forEach(channel => this._pusher.unsubscribe(channel + PUSHER_SERVER_UID));

        this._subscriptions = this._subscriptions.filter(channel => ! channels.includes(channel));

        console.log('Unsubscribed from Pusher channels', channels);

        return this;
    }

    /**
     * Register a callback for a specific pusher event
     * @param {string} eventName
     * @param {function} callback
     */
    on(eventName, callback) {
        this._validateOnOffInput(eventName, callback);

        const registeredCallbacks = this._eventCallbacks.get(eventName);

        if (registeredCallbacks) {
            this._eventCallbacks.set(eventName, [ ...registeredCallbacks, callback ]);
        } else {
            this._eventCallbacks.set(eventName, [ callback ]);
        }

        return this;
    }

    /**
     * Remove callback registration
     * @param {string} eventName
     * @param {function} callback
     */
    off(eventName, callback) {
        this._validateOnOffInput(eventName, callback);

        const value = this._eventCallbacks.get(eventName);
        if (value) {
            const index = value.findIndex(eventCallback => eventCallback === callback);
            if (index !== -1) {
                value.splice(index, 1);
                this._eventCallbacks.set(eventName, value);
            }
        }
        return this;
    }

    /**
     * Triggers the pusher event for the registered callbacks
     * @param {string} eventName
     * @param {object} data
     */
    _trigger(eventName, data) {
        const callbacks = this._eventCallbacks.get(eventName);

        if (callbacks) {
            callbacks.forEach(callback => callback(data));
        }
    }

    /**
     *
     * @param {string} eventName
     * @param {function} callback
     */
     _validateOnOffInput(eventName, callback) {
        if (typeof eventName !== 'string' || ! eventName) {
            throw new Error(`Event name must be a non-empty string, received: (${typeof eventName}) ${eventName}`);
        }
        if (typeof callback !== 'function') {
            throw new Error(`callback must be a function, received: (${typeof callback}) ${callback}`);
        }
    }
}

window.pusherManager = new PusherManager(window.member);
