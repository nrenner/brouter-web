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
        if (options.profile) {
            L.DomUtil.get('profile').value = options.profile;
        }
        if (options.alternative) {
            L.DomUtil.get('alternative').value = options.alternative;
        }
    },

    _getChangeHandler: function() {
        return L.bind(function(evt) {
            this.fire('update', {options: this.getOptions()});
        }, this);
    }
});

BR.RoutingOptions.include(L.Mixin.Events);
