BR.Util = {
    get: function(url, cb) {
        var xhr = new XMLHttpRequest();

        xhr.open('GET', url, true);
        xhr.onload = function() {
            if ((xhr.status === 200 || xhr.status === 0) && xhr.responseText) {
                cb(null, xhr.responseText);
            } else {
                cb(BR.Util.getError(xhr));
            }
        };
        xhr.onerror = function() {
            cb(BR.Util.getError(xhr));
        };
        try {
            xhr.send();
        } catch (e) {
            cb(e);
        }
    },

    getError: function(xhr) {
        var msg = i18next.t('warning.no-response');
        if (xhr.responseText) {
            msg = xhr.responseText;
        } else if (xhr.status || xhr.statusText) {
            msg = xhr.status + ': ' + xhr.statusText;
        }
        return new Error(msg);
    },

    // check if localStorage is available, especially for catching SecurityError
    // when cookie settings are blocking access (Chrome, Pale Moon, older Firefox)
    //
    // see also https://github.com/Modernizr/Modernizr/blob/master/feature-detects/storage/localstorage.js
    //
    // https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API#Testing_for_support_vs_availability
    // by Mozilla Contributors, with modifications;
    // Any copyright is dedicated to the Public Domain. https://creativecommons.org/publicdomain/zero/1.0/
    localStorageAvailable: function() {
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
    getResponsiveBreakpoint: function() {
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
    }
};
