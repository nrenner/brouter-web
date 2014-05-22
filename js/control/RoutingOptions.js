BR.RoutingOptions = BR.Control.extend({
    options: {
        heading: 'Options',
        divId: 'route_options'
    },

    onAdd: function (map) {
        L.DomUtil.get('profile').onchange = this._getChangeHandler();
        L.DomUtil.get('alternative').onchange = this._getChangeHandler();

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
        select.value = profile;
        option.disabled = false;

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
