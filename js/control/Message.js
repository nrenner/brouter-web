BR.Message = L.Class.extend({
    options: {
        // true to manually attach click event to close button,
        // Bootstrap data-api's auto-initialization doesn't work in Controls because of stopPropagation
        alert: false
    },
    
    initialize: function (id, options) {
        L.setOptions(this, options);
        this.id = id;
    },

    _show: function (msg, type) {
        var ele = L.DomUtil.get(this.id),
            iconClass = (type === 'warning') ? 'fa-exclamation-triangle' : 'fa-times-circle',
            alertClass = (type === 'warning') ? 'alert-warning' : 'alert-danger';

        ele.innerHTML =
              '<div class="alert ' + alertClass + ' alert-dismissible fade in" role="alert">'
            + '  <button type="button" class="close" data-dismiss="alert" aria-label="Close">'
            + '    <span aria-hidden="true">&times;</span>'
            + '  </button>'
            + '  <span class="fa ' + iconClass + '" aria-hidden="true"/></span>'
            + msg
            + '</div>';

        if (this.options.alert) {
            $('#' + this.id + ' .alert').alert();
        }
    },

    hide: function () {
        $('#' + this.id + ' .alert').alert('close');
    },

    showError: function (err) {
        this._show(err, 'error');
    },

    showWarning: function (msg) {
        this._show(msg, 'warning');
    }
});

// static instance as global control
BR.message = new BR.Message('message');
