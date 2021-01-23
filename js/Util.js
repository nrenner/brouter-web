BR.Util = {
    get: function (url, cb) {
        var xhr = new XMLHttpRequest();

        xhr.open('GET', url, true);
        xhr.onload = function () {
            if ((xhr.status === 200 || xhr.status === 0) && xhr.responseText) {
                cb(null, xhr.responseText);
            } else {
                cb(BR.Util.getError(xhr));
            }
        };
        xhr.onerror = function () {
            cb(BR.Util.getError(xhr));
        };
        try {
            xhr.send();
        } catch (e) {
            cb(e);
        }
    },

    getError: function (xhr) {
        var msg = i18next.t('warning.no-response');
        if (xhr.responseText) {
            msg = xhr.responseText;
        } else if (xhr.status || xhr.statusText) {
            msg = xhr.status + ': ' + xhr.statusText;
        }
        return new Error(msg);
    },

    getJson: function (url, context, cb) {
        BR.Util.get(url, function (err, data) {
            if (err) {
                BR.message.showError('Error getting ' + context + ': ' + err);
                return cb(err);
            }

            try {
                var json = JSON.parse(data);
                cb(null, json);
            } catch (err) {
                BR.message.showError('Error parsing ' + context + ': ' + err);
                console.error(err);
                cb(err);
            }
        });
    },

    getGeoJson: function (url, context, cb) {
        BR.Util.getJson(url, context, function (err, data) {
            if (err) return cb(err);

            var geoJson = data;
            if (data && data.type && data.type === 'Topology') {
                var key = Object.keys(data.objects)[0];
                geoJson = topojson.feature(data, data.objects[key]);
            }

            cb(null, geoJson);
        });
    },

    // check if localStorage is available, especially for catching SecurityError
    // when cookie settings are blocking access (Chrome, Pale Moon, older Firefox)
    //
    // see also https://github.com/Modernizr/Modernizr/blob/master/feature-detects/storage/localstorage.js
    //
    // https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API#Testing_for_support_vs_availability
    // by Mozilla Contributors, with modifications;
    // Any copyright is dedicated to the Public Domain. https://creativecommons.org/publicdomain/zero/1.0/
    localStorageAvailable: function () {
        try {
            var storage = window.localStorage,
                x = '__storage_test__';
            storage.setItem(x, x);
            storage.removeItem(x);
            return true;
        } catch (e) {
            return false;
        }
    },

    // see https://stackoverflow.com/a/37141090/1906123
    getResponsiveBreakpoint: function () {
        var envs = { '1xs': 'd-none', '2sm': 'd-sm-none', '3md': 'd-md-none', '4lg': 'd-lg-none', '5xl': 'd-xl-none' };
        var env = '';

        var $el = $('<div>');
        $el.appendTo($('body'));

        for (var i = Object.keys(envs).length - 1; i >= 0; i--) {
            env = Object.keys(envs)[i];
            $el.addClass(envs[env]);
            if ($el.is(':hidden')) {
                break; // env detected
            }
        }
        $el.remove();
        return env;
    },

    keyboardShortcutsAllowed: function (keyEvent) {
        // Skip auto-repeating key events
        if (keyEvent.repeat) {
            return false;
        }

        // Suppress shortcut handling when a text or number input field is focussed
        if (
            document.activeElement.type == 'number' ||
            document.activeElement.type == 'text' ||
            document.activeElement.type == 'textarea'
        ) {
            return false;
        }

        // Only allow shortcuts without modifiers for now, to prevent triggering map functions
        // when browser shortcuts are triggered (e.g. Ctrl+P for print should not add a POI)
        if (keyEvent.ctrlKey || keyEvent.metaKey || keyEvent.altKey) {
            return false;
        }

        // Do not allow shortcuts triggering actions behind Bootstrap's
        // modal dialogs or when dropdown menus are opened
        if ($('.modal.show').length || $('.dropdown.show').length) {
            return false;
        }

        return true;
    },

    // this method must only be used to sanitize for textContent.
    // do NOT use it to sanitize any attribute,
    // see https://web.archive.org/web/20121208091505/http://benv.ca/2012/10/4/you-are-probably-misusing-DOM-text-methods/
    sanitizeHTMLContent: function (str) {
        var temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    },

    isCountry: function (country, language) {
        // de-DE | fr-FR
        var lang = i18next.languages[0].split('-');

        if (lang.length > 1) {
            // if available only test country, to avoid e.g. de-CH to match
            return lang[1] === country;
        }

        // fallback when country not available
        if (language) {
            return lang[0] === language;
        }

        return false;
    },
};
