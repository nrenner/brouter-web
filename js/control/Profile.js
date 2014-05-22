BR.Profile = BR.Control.extend({
    options: {
        heading: 'Profile',
        divId: 'profile_div'
    },

    onAdd: function (map) {
        L.DomUtil.get('profile_upload').onsubmit = L.bind(this._submit, this)

        return BR.Control.prototype.onAdd.call(this, map);
    },

    _submit: function(evt) {
        var form = evt.target || evt.srcElement,
            profile = document.profile_upload.profile.value;

        evt.preventDefault();

        this.fire('update', { profileText: profile });
    }
});

BR.Profile.include(L.Mixin.Events);
