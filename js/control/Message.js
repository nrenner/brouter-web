BR.Message = L.Class.extend({
    options: {
        // true to manually attach click event to close button,
        // Bootstrap data-api's auto-initialization doesn't work in Controls because of stopPropagation
        alert: false,
    },

    initialize: function (id, options) {
        L.setOptions(this, options);
        this.id = id;
    },

    _show: function (msg, type) {
        var ele = L.DomUtil.get(this.id),
            iconClass,
            alertClass;
        switch (type) {
            case 'error':
                iconClass = 'fa-times-circle';
                alertClass = 'alert-danger';
            case 'warning':
                iconClass = 'fa-exclamation-triangle';
                alertClass = 'alert-warning';
            case 'info':
                iconClass = 'fa-info-circle';
                alertClass = 'alert-info';
        }

        L.DomEvent.disableClickPropagation(ele);

        ele.innerHTML =
            '<div class="alert ' +
            alertClass +
            ' alert-dismissible fade show" role="alert">' +
            '  <button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
            '    <span aria-hidden="true">&times;</span>' +
            '  </button>' +
            '  <span class="fa ' +
            iconClass +
            '" aria-hidden="true"/></span>' +
            msg +
            '</div>';

        if (this.options.alert) {
            $('#' + this.id + ' .alert').alert();
        }
    },

    hide: function () {
        $('#' + this.id + ' .alert').alert('close');
    },

    showError: function (err) {
        if (err && err.message) err = err.message;

        if (err == 'target island detected for section 0\n') {
            err = i18next.t('warning.no-route-found');
        } else if (err == 'no track found at pass=0\n') {
            err = i18next.t('warning.no-route-found');
        } else if (err == 'to-position not mapped in existing datafile\n') {
            err = i18next.t('warning.invalid-route-to');
        } else if (err == 'from-position not mapped in existing datafile\n') {
            err = i18next.t('warning.invalid-route-from');
        } else if (err && err.startsWith('null description for: ')) {
            err = i18next.t('warning.no-route-found');
        }
        this._show(err, 'error');
    },

    showWarning: function (msg) {
        this._show(msg, 'warning');
    },

    showInfo: function (msg) {
        this._show(msg, 'info');
    },
});

// static instance as global control
BR.message = new BR.Message('message');
