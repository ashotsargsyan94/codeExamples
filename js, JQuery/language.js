function languageInit(locale) {
    i18next
    .use(i18nextHttpBackend)
    .init({
        lng: locale,
        debug: false,
        ns: ['messages'],
        defaultNS: 'messages',
        nsSeparator: '>>', //defaults to ':' which we use in our copy, so set to '>>' since we're unlikely to use that.
        keySeparator: false, //allows us to have '.' in the message
        fallbackLng: 'en_US',
        returnEmptyString: false,
        backend: {
            loadPath: "dist/locales/{{lng}}/LC_MESSAGES/{{ns}}.json",
        }
    });
};

function translate(str, params = {}) {
    return i18next.t(str, params);
}