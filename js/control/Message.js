BR.Message = L.Class.extend({
    options: {
        // true to manually attach click event to close button,
        // Bootstrap data-api's auto-initialization doesn't work in Controls because of stopPropagation
        alert: false,
        onClosed: null,
    },

    initialize(id, options) {
        L.setOptions(this, options);
        this.id = id;
    },

    _show(msg, type) {
        var ele = L.DomUtil.get(this.id),
            iconClass,
            alertClass;
        switch (type) {
            case 'error':
                iconClass = 'fa-times-circle';
                alertClass = 'alert-danger';
                break;
            case 'warning':
                iconClass = 'fa-exclamation-triangle';
                alertClass = 'alert-warning';
                break;
            case 'loading':
                iconClass = 'fa-spinner fa-pulse';
                alertClass = 'alert-secondary';
                break;
            default:
            case 'info':
                iconClass = 'fa-info-circle';
                alertClass = 'alert-info';
                break;
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

        if (this.options.onClosed) {
            $('#' + this.id + ' .alert').on('closed.bs.alert', this.options.onClosed);
        }

        if (this.options.alert) {
            $('#' + this.id + ' .alert').alert();
        }
    },

    hide() {
        $('#' + this.id + ' .alert').alert('close');
    },

    showError(err) {
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

    showWarning(msg) {
        this._show(msg, 'warning');
    },

    showInfo(msg) {
        this._show(msg, 'info');
    },

    showLoading(msg) {
        this._show(msg, 'loading');
    },
});

// static instance as global control
BR.message = new BR.Message('message');
