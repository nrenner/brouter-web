BR.Message = function () {
    this.messageTimeout = null;
};

BR.Message.prototype = {
    _show: function (msg, type) {
        window.clearTimeout(this.messageTimeout);
        var ele = L.DomUtil.get('message');
        ele.innerHTML = msg;
        L.DomUtil.removeClass(ele, 'hidden');
        L.DomUtil.addClass(ele, type);
        return ele;
    },

    _hide: function (type) {
        window.clearTimeout(this.messageTimeout);
        var ele = L.DomUtil.get('message');
        if (!L.DomUtil.hasClass(ele, 'hidden')) {
            L.DomUtil.addClass(ele, 'hidden');
            ele.innerHTML = '';
        }
        if (L.DomUtil.hasClass(ele, type)) {
            L.DomUtil.removeClass(ele, type);
        }
    },

    showError: function (err) {
        this._show(err, 'error');
    },

    hideError: function () {
        this._hide('error');
    },

    showWarning: function (msg) {
        this._show(msg, 'warning');
        this.messageTimeout = window.setTimeout(L.bind(function () {
            this._hide('warning');
        }, this), 10000);
    }
};

// singleton
BR.message = new BR.Message();