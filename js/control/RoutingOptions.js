BR.RoutingOptions = BR.Control.extend({
    options: {
        heading: 'Options',
        divId: 'route_options'
    },

    onAdd: function (map) {
        var select = L.DomUtil.get('profile'),
            i,
            option;

        select.onchange = this._getChangeHandler();
        L.DomUtil.get('alternative').onchange = this._getChangeHandler();

        // build option list from config
        var profiles = BR.conf.profiles;
        for (i = 0; i < profiles.length; i++) {
            option = document.createElement("option");
            option.value = profiles[i];
            option.text = profiles[i];
            select.add(option, null);
        }
        // <custom> option disabled, select next
        select.options[1].selected = true;

        return BR.Control.prototype.onAdd.call(this, map);
    },

    getOptions: function() {
        return {
            profile: L.DomUtil.get('profile').value,
            alternative: L.DomUtil.get('alternative').value
        };
    },

    setOptions: function(options) {
        var select,
            profile = options.profile;

        if (profile) {
            select = L.DomUtil.get('profile');
            select.value = profile;

            // profile got not selected = not in option values -> custom profile passed with permalink
            if (select.value != profile) {
                this.setCustomProfile(profile, true);
            }

        }
        if (options.alternative) {
            L.DomUtil.get('alternative').value = options.alternative;
        }
    },

    setCustomProfile: function(profile, noUpdate) {
        var select,
            option;

        select = L.DomUtil.get('profile');
        option = select.options[0]
        option.value = profile;
        option.disabled = !profile;
        option.selected = !!profile;

        if (!noUpdate) {
            this.fire('update', {options: this.getOptions()});
        }
    },

    getCustomProfile: function() {
        var select = L.DomUtil.get('profile'),
            option = select.options[0],
            profile = null;

        if (!option.disabled) {
            profile = option.value;
        }
        return profile;
    },

    _getChangeHandler: function() {
        return L.bind(function(evt) {
            this.fire('update', {options: this.getOptions()});
        }, this);
    }
});

BR.RoutingOptions.include(L.Mixin.Events);
