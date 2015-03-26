BR.Profile = L.Class.extend({
    cache: {},

    initialize: function () {
        L.DomUtil.get('upload').onclick = L.bind(this._upload, this);
        L.DomUtil.get('clear').onclick = L.bind(this.clear, this);
        
        this.ele = document.profile_upload.profile;
        this.message = new BR.Message('profile_message', {
            alert: true
        });
    },

    clear: function(evt) {
        var button = evt.target || evt.srcElement;

        evt.preventDefault();
        this.ele.value = null;
        this.ele.defaultValue = this.ele.value;

        this.fire('clear');
        button.blur();
    },

    update: function(options) {
        var profileName = options.profile,
            profileUrl,
            ele = this.ele,
            dirty = ele.defaultValue !== ele.value;

        this.profileName = profileName;
        if (profileName && BR.conf.profilesUrl && (!ele.value || !dirty)) {
            if (!(profileName in this.cache)) {
                profileUrl = BR.conf.profilesUrl + profileName + '.brf';
                BR.Util.get(profileUrl, L.bind(function(err, profileText) {
                    if (err) {
                        console.warn('Error getting profile from "' + profileUrl + '": ' + err);
                        return;
                    }

                    this.cache[profileName] = profileText;

                    // don't set when option has changed while loading
                    if (!this.profileName || this.profileName === profileName) {
                        ele.value = profileText;
                        ele.defaultValue = ele.value;
                    }
                }, this));
            } else {
                ele.value = this.cache[profileName];
                ele.defaultValue = ele.value;
            }
        }
    },

    _upload: function(evt) {
        var button = evt.target || evt.srcElement,
            profile = this.ele.value;

        this.message.hideError();
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
