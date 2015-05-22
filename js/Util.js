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
        } catch(e) {
            cb(e);
        }
    },

    getError: function(xhr) {
        var msg = 'no response from server';
        if (xhr.responseText) {
          msg = xhr.responseText;
        } else if (xhr.status || xhr.statusText) {
          msg = xhr.status + ': ' + xhr.statusText;
        }
        return new Error(msg);
    }

};