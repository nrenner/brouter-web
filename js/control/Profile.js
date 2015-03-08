BR.Profile = L.Class.extend({
    initialize: function () {
        L.DomUtil.get('upload').onclick = L.bind(this._upload, this);
        L.DomUtil.get('clear').onclick = L.bind(this.clear, this);
    },

    clear: function(evt) {
        var button = evt.target || evt.srcElement;

        evt.preventDefault();
        document.profile_upload.profile.value = null;

        this.fire('clear');
        button.blur();
    },

    _upload: function(evt) {
        var button = evt.target || evt.srcElement,
            profile = document.profile_upload.profile.value;

        $(button).button('uploading');
        evt.preventDefault();

        this.fire('update', { 
            profileText: profile, 
            callback: function () {
                $(button).button('reset');
                $(button).blur();
            }
        });
    }
});

BR.Profile.include(L.Mixin.Events);
