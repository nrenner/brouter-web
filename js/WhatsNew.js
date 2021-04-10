BR.WhatsNew = {
    newOnly: undefined,

    init: function () {
        var self = this;
        self.dismissableMessage = new BR.Message('whats_new_message', {
            onClosed: function () {
                document.getElementsByClassName('version')[0].classList.remove('version-new');
                if (BR.Util.localStorageAvailable()) {
                    localStorage.setItem('changelogVersion', self.getLatestVersion());
                }
            },
        });
        $('#whatsnew').on('shown.bs.modal', function () {
            self.dismissableMessage.hide();
        });
        $('#whatsnew').on('hidden.bs.modal', function () {
            // next time popup is open, by default we will see everything
            self.prepare(false);
        });
        if (!self.getCurrentVersion() && BR.Util.localStorageAvailable()) {
            localStorage.setItem('changelogVersion', self.getLatestVersion());
        }
        self.prepare(self.hasNewVersions());

        if (self.hasNewVersions()) {
            self.dismissableMessage.showInfo(i18next.t('whatsnew.new-version'));
            document.getElementsByClassName('version')[0].classList.add('version-new');
        }
    },

    getLatestVersion: function () {
        return BR.changelog.match('<h2 id="(.*)">')[1];
    },

    getCurrentVersion: function () {
        if (!BR.Util.localStorageAvailable()) return null;

        return localStorage.getItem('changelogVersion');
    },

    hasNewVersions: function () {
        return this.getCurrentVersion() && this.getCurrentVersion() !== this.getLatestVersion();
    },

    prepare: function (newOnly) {
        if (newOnly === this.newOnly) {
            // do not rebuild modal content unnecessarily
            return;
        }
        this.newOnly = newOnly;
        var container = document.querySelector('#whatsnew .modal-body');
        var cl = BR.changelog;
        if (newOnly && this.getCurrentVersion()) {
            var head = '<h2 id="' + this.getCurrentVersion() + '">';
            var idx = cl.indexOf(head);
            if (idx >= 0) cl = cl.substring(0, idx);
        }
        container.innerHTML = cl;
    },
};
