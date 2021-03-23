BR.WhatsNew = {
    init: function () {
        var self = this;
        self.dismissableMessage = new BR.Message('whats_new_message', {
            onClosed: function () {
                document.getElementsByClassName('version')[0].classList.remove('version-new');
                localStorage.setItem('changelogVersion', self.getLatestVersion());
                // next time popup is open, by default we will see everything
                self.prepare(false);
            },
        });
        $('#whatsnew').on('shown.bs.modal', function () {
            self.dismissableMessage.hide();
        });
        if (!self.getCurrentVersion()) {
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
        return localStorage.getItem('changelogVersion');
    },

    hasNewVersions: function () {
        if (!BR.Util.localStorageAvailable()) return false;

        return this.getCurrentVersion() && this.getCurrentVersion() < this.getLatestVersion();
    },

    prepare: function (newOnly) {
        var container = document.querySelector('#whatsnew .modal-body');
        var cl = BR.changelog;
        if (newOnly && this.getCurrentVersion()) {
            var head = '<h2 id="' + this.getCurrentVersion() + '">';
            cl = cl.substring(0, cl.indexOf(head));
        }
        container.innerHTML = cl;
    },
};
