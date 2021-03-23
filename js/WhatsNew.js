BR.WhatsNew = {
    init: function () {
        var self = this;
        self.prepare(self.hasNewVersions());
        $('#whatsnew').on('hidden.bs.modal', function () {
            localStorage.setItem('changelogVersion', self.getLatestVersion());
            // next time popup is open, by default we will see everything
            self.prepare(false);
        });
        $('#whatsnew').on('shown.bs.modal', function () {
            BR.message.hide();
            document.getElementsByClassName('version')[0].classList.remove('version-new');
        });
        if (self.hasNewVersions()) {
            BR.message.showInfo(i18next.t('whatsnew.new-version'));
            document.getElementsByClassName('version')[0].classList.add('version-new');
        }
    },

    getLatestVersion: function () {
        return BR.changelog.match('<h2 id="(.*)">')[1];
    },

    hasNewVersions: function () {
        if (!BR.Util.localStorageAvailable()) return false;

        var currentVersion = localStorage.getItem('changelogVersion');

        return currentVersion && currentVersion < this.getLatestVersion();
    },

    prepare: function (newOnly) {
        var currentVersion = localStorage.getItem('changelogVersion');
        var container = document.querySelector('#whatsnew .modal-body');
        var cl = BR.changelog;
        if (newOnly && currentVersion) {
            var head = '<h2 id="' + currentVersion + '">';
            cl = cl.substring(0, cl.indexOf(head));
        }
        container.innerHTML = cl;
    },
};
