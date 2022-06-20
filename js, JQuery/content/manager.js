"use strict";

const $contentTemplates = $('<template />');
const allLoadedScripts  = [];
const allLoadedCss      = [];

/**
 * @name            ContentManager
 * @description     Content manager library for Squirrel Social
 * @author          Diego Barreiro <diego.bindart@gmail.com>
 * @date            07/24/2020
 * @version         1.0
 *
 * ContentManager can be used to automagically load templates, javascript files
 * and css stylesheets on demand.
 *
 * The library handles requesting, storing and later fetching the templates, and
 * the internals of loading assets: it signals completion to the client (resolving
 * the Promise returned by the load() method).
 *
 * Templates for render() use a mustache-like syntaxis, and only offer variable
 * replacements (i.e. no loops or other structures).
 *
 * OVERVIEW
 *
 *      construct(string contentId)
 *      load([<string> endpoint]): Promise
 *      render(<string> templateId[, <var:value> data]): jQuery
 *
 *
 * USAGE
 *
 *      new ContentManager(contentId).load().then(function(manager) {
 *          manager.render('myTemplate', { color: 'red', id: 5 })
 *                 .in('#myContainer', manager.MODE_APPEND);
 *      });
 */

const defaultContainer = '#appLd';

export default class ContentManager {
    /**
     * @param {string}        contentId
     * @param {string|jQuery} container
     */
    constructor(contentId, container) {
        this.contentId = contentId;
        this.container = container || defaultContainer;

        this.MODE_APPEND  = 1;
        this.MODE_PREPEND = 2;
        this.MODE_INSERT  = 3;
        this.MODE_REPLACE = 4;
    }

    abort() {
        this.aborted = true;
    }

    newManager(contentId, container) {
        return new ContentManager(contentId, container);
    }

    /**
     * Preload assets but don't display them automatically.
     */
    preload(endpoint) {
        this.preloadOnly = true;

        return this.load(endpoint);
    }

    /**
     * Load templates and scripts on the fly, from the Content PHP
     * controller. Will send an ajax GET to content/{contentId}.
     *
     * @param {string} endpoint  Optional. Defaults to content/<contentId>
     * @return Promise  It resolves when all content is fully accessible
     */
    load(endpoint) {
        if (this.aborted) {
            return Promise.resolve();
        }

        if ( ! this.preloadOnly) {
            showLoader();
            hideContainer();
        }

        endpoint = endpoint || urlFrom(`content/${this.contentId}`);

        return new Promise((resolve, reject) => {
            loadAssets(this.contentId, endpoint).then(() => {
                if ( ! this.preloadOnly) {
                    const mainHTML = template(this.contentId, 'main').html();

                    if (mainHTML) {
                        this.setContent(this.container, mainHTML);
                    }
                }

                resolve(this);
            })
            .catch(reject);
        });
    }

    setContent(container, html) {
        if (this.aborted) {
            return;
        }

        refreshContainer(
            container || this.container,
            html || template(this.contentId, 'main').html()
        );

        hideLoader();
    }

    /**
     * Clones, parses and inserts the resulting element into the DOM.
     *
     *     manager.render(<string> templateId, <map key:value> data)
     *            .in(<selector | jQuery> container, <mode> mode)
     *
     * Modes:
     *     manager.MODE_APPEND
     *     manager.MODE_PREPEND
     *     manager.MODE_INSERT
     *     manager.MODE_REPLACE
     *
     * @param {string} templateId
     * @param {object} data
     * @returns the created HTML element, as a jQuery object.
     */
    render(templateId, data, withEval) {
        const $element = $(templateEngine[withEval ? 'eval' : 'parse'](
            template(this.contentId, templateId).html(),
            data || []
        ));

        if (this.aborted) {
            return {
                in:    () => $element,
                fetch: () => $element,
                html:  () => $element.prop('outerHTML'),
            }
        }

        return {
            in: (container, mode) => {
                switch (mode) {
                    default:
                    case this.MODE_APPEND:
                        return $element.appendTo(container);
                    case this.MODE_PREPEND:
                        return $element.prependTo(container);
                    case this.MODE_INSERT:
                        $(container).empty().append($element);
                        return $element;
                    case this.MODE_REPLACE:
                        $(container).replaceWith($element);
                        return $element;
                }
            },
            fetch: () => $element,
            html:  () => $element.prop('outerHTML')
        }
    }
}



/*****************************
 ** Module ("private") methods
 *****************************/

const loadAssets = (contentId) => {
    return new Promise((resolve, reject) => {
        if (contentLoaded(contentId)) {
            return resolve();
        }

        $.get(urlFrom('content/' + contentId))
            .then(response => {
                if ( ! response.success || ! response.templates) {
                    return reject(response.error || 'error');
                }

                if (response.templates) {
                    storeTemplates(contentId, response.templates);
                }

                if (response.css) {
                    loadCss(response.css);
                }

                if (response.scripts) { // Wait for scripts to load
                    loadScripts(response.scripts).then(() => {
                        resolve();
                    });
                } else {
                    resolve();
                }

            })
            .fail(reject);
    });
}

const storeTemplates = (contentId, templates) => {
    clearStorage(contentId);

    $contentTemplates.append(`<template class="${ contentId }"></template>`);

    $.each(templates, (id, template) => {
        $(`.${ contentId }`, $contentTemplates)
            .append(`<template class="${id}">${template}</template>`);
    });
}

const loadScripts = (scripts) => {
    if (typeof scripts === 'string') {
        scripts = [ scripts ];
    }

    // console.log('ContentManager previously loaded scripts: ', allLoadedScripts.join(', ')); // Uncomment for debugging

    const loadedScripts = [];

    scripts.forEach(url => {
        if (allLoadedScripts.includes(url)) {
            return;
        }

        allLoadedScripts.push(url);

        // console.log('ContentManager now loading script: ' + url); // Uncomment for debugging

        loadedScripts.push(new Promise(resolve => {
            // The order must be: create > to DOM > onload handler > src attribute
            const script = document.createElement('script');
            script.onload = resolve;
            document.head.appendChild(script);
            script.src = `${url}?v-${window.app.assetsVersion}`;
        }));
    });

    return Promise.all(loadedScripts); // All scripts loaded
}

const loadCss = (css) => {
    if (typeof css === 'string') {
        css = [css];
    }

    // console.log('ContentManager previously loaded css: ', allLoadedCss.join(', ')); // Uncomment for debugging

    const loadedCss = [];

    css.forEach(url => {
        if (allLoadedCss.includes(url)) {
            return;
        }

        allLoadedCss.push(url);

        // console.log('ContentManager now loading css: ' + url); // Uncomment for debugging

        loadedCss.push('url')

        const css = document.createElement('link');
        document.head.appendChild(css);
        css.rel = "stylesheet";
        css.type = "text/css";
        css.href = `${url}?v-${window.app.assetsVersion}`;
    });
}

const clearStorage = (contentId) => {
    $(`.${ contentId }`, $contentTemplates).remove();
}

const template = (contentId, templateId) => {
    return $(`.${contentId} .${templateId}`, $contentTemplates);
}

const contentLoaded = (contentId) => {
    return $(`.${contentId}`, $contentTemplates).length > 0;
}

const refreshContainer = (container, html) => {
    $(container)
        .empty()
        .append(html || '')
        .removeClass('hidden');
}

const hideContainer = () => {
    $('#appLd').addClass('hidden');
}


/*****************************
 ** Helper ("private") classes
 *****************************/

const templateEngine = new class {
    eval(html, data) {
        let parsed;

        eval('parsed = `' + html.replace() + '`');

        return parsed;
    }

    parse(html, data) {
        /**
         * Matches and replaces: ${ var } and {{  var }}
         * Doesn't match (\ escapes): \${var}, \{{var}}
         */
        const regex = /(^|.)(?:\${\s*(\w+)\s*}|{{\s(\w+)\s*}})/g;

        if ( ! html) {
            console.log('Content@parse received empty html');
        }

        return html ? html.replace(regex, this.callback.bind(this, data)) : '';
    }

    callback(data, original, escape, group1, group2) {
        if (escape === '\\') {
            return original;
        }

        const match = group1 || group2;
        const found = typeof data[match] !== 'undefined' && data[match] !== null;

        if (! found) {
            console.log(`Warning: template var ${ match } is not defined.`);
        }

        return escape + (found ? data[match] : '');
    }
}
