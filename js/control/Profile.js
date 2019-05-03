BR.Profile = L.Evented.extend({
    cache: {},

    initialize: function () {
        var textArea = L.DomUtil.get('profile_upload');
        this.editor = CodeMirror.fromTextArea(textArea, {
            lineNumbers: true
        });

        L.DomUtil.get('upload').onclick = L.bind(this._upload, this);
        L.DomUtil.get('clear').onclick = L.bind(this.clear, this);

        this.message = new BR.Message('profile_message', {
            alert: true
        });
    },

    clear: function(evt) {
        var button = evt.target || evt.srcElement;

        evt.preventDefault();
        this._setValue("");

        this.fire('clear');
        button.blur();
    },

    update: function(options) {
        var profileName = options.profile,
            profileUrl,
            empty = !this.editor.getValue(),
            clean = this.editor.isClean();

        this.profileName = profileName;
        if (profileName && BR.conf.profilesUrl && (empty || clean)) {
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
                        this._setValue(profileText);
                    }
                }, this));
            } else {
                this._setValue(this.cache[profileName]);
            }
        }
    },

    show: function() {
        this.editor.refresh();
    },

    onResize: function() {
        this.editor.refresh();
    },

    _upload: function(evt) {
        var button = evt.target || evt.srcElement,
            profile = this.editor.getValue();

        this.message.hide();
        $(button).button('uploading');
        evt.preventDefault();

        this.fire('update', {
            profileText: profile,
            callback: function () {
                $(button).button('reset');
                $(button).blur();
            }
        });
    },

    _setValue: function(profileText) {
        this.editor.setValue(profileText);
        this.editor.markClean();
    }
});
