BR.Profile = BR.Control.extend({
    options: {
        divId: 'profile_div'
    },

    onAdd: function (map) {
        L.DomUtil.get('profile_upload').onsubmit = L.bind(this._submit, this);
        L.DomUtil.get('clear').onclick = L.bind(this.clear, this);

        $('#tab a').click(function (e) {
          e.preventDefault();
          $(this).tab('show');
        });

        return BR.Control.prototype.onAdd.call(this, map);
    },

    clear: function(evt) {
        evt.preventDefault();
        document.profile_upload.profile.value = null;

        this.fire('clear');
    },

    _submit: function(evt) {
        var form = evt.target || evt.srcElement,
            profile = document.profile_upload.profile.value;

        evt.preventDefault();

        this.fire('update', { profileText: profile });
    }
});

BR.Profile.include(L.Mixin.Events);
