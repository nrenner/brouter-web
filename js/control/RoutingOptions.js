BR.RoutingOptions = L.Evented.extend({
    options: {
        shortcut: {
            switch: 71 // char code for 'g'
        }
    },

    initialize: function() {
        $('#profile-alternative').on('changed.bs.select', this._getChangeHandler());

        // build option list from config
        var profiles = BR.conf.profiles;
        var profiles_list = L.DomUtil.get('profile');
        for (var i = 0; i < profiles.length; i++) {
            var option = document.createElement('option');
            option.value = profiles[i];
            option.text = i18next.t('navbar.profile.' + profiles[i]);
            profiles_list.appendChild(option);
        }
        // set default value, used as indicator for empty custom profile
        profiles_list.children[0].value = 'Custom';
        // <custom> profile is empty at start, select next one
        profiles_list.children[1].selected = true;

        L.DomEvent.addListener(document, 'keydown', this._keydownListener, this);
    },

    refreshUI: function() {
        // we do not allow to select more than one profile and/or alternative at a time
        // so we disable the current selected items
        $('#profile-alternative')
            .find('option:disabled')
            .each(function(index) {
                $(this).prop('disabled', false);
            });
        $('#profile-alternative')
            .find('option:selected')
            .each(function(index) {
                $(this).prop('disabled', true);
            });

        // disable custom option if it has no value yet (default value is "Custom")
        var custom = L.DomUtil.get('profile').children[0];
        if (custom.value === 'Custom') {
            custom.disabled = true;
        }
        $('.selectpicker').selectpicker('refresh');

        // append shortcut text to tooltip
        var button = $('#profile-alternative-form button')[0];
        button.title = button.title + i18next.t('navbar.profile-tooltip', { key: 'G' });
    },

    getOptions: function() {
        var profile = $('#profile option:selected'),
            alternative = $('#alternative option:selected');
        this.refreshUI();

        return {
            profile: profile.val(),
            alternative: alternative.val()
        };
    },

    setOptions: function(options) {
        var values = [
            options.profile ? options.profile : $('#profile option:selected').val(),
            options.alternative ? options.alternative : $('#alternative option:selected').val()
        ];
        $('.selectpicker').selectpicker('val', values);
        this.refreshUI();

        if (options.profile && L.BRouter.isCustomProfile(options.profile)) {
            // custom profile passed with permalink
            this.setCustomProfile(options.profile, true);
        }
    },

    setCustomProfile: function(profile, noUpdate) {
        var profiles_grp, option;

        profiles_grp = L.DomUtil.get('profile');
        option = profiles_grp.children[0];
        option.value = profile || 'Custom';
        option.disabled = !profile;

        if (profile) {
            $('#profile')
                .find('option:selected')
                .each(function(index) {
                    $(this).prop('selected', false);
                });
        } else if (option.selected) {
            // clear, select next in group when custom deselected
            profiles_grp.children[1].selected = true;
        }

        option.selected = !!profile;

        if (!noUpdate) {
            this.fire('update', { options: this.getOptions() });
        }
    },

    getCustomProfile: function() {
        var profiles_grp = L.DomUtil.get('profile'),
            option = profiles_grp.children[0],
            profile = null;

        if (option.value !== 'Custom') {
            profile = option.value;
        }
        return profile;
    },

    _getChangeHandler: function() {
        return L.bind(function(evt) {
            this.fire('update', { options: this.getOptions() });
        }, this);
    },

    _keydownListener: function(e) {
        if (BR.Util.keyboardShortcutsAllowed(e) && e.keyCode === this.options.shortcut.switch) {
            if (!$('#profile-alternative-form .dropdown').hasClass('show')) {
                $('#profile-alternative-form button').click();
            }
        }
    }
});
