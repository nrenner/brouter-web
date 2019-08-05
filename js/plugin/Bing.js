BR.BingLayer = L.BingLayer.extend({
    options: {
        maxZoom: 19,
        attribution:
            '<a target="_blank" href="https://www.bing.com/maps/">Bing Maps</a>' +
            ' (<a target="_blank" href="https://go.microsoft.com/?linkid=9710837">TOU</a>)'
    },

    initialize: function(key, options) {
        L.BingLayer.prototype.initialize.call(this, key, options);

        this._logo = L.control({ position: 'bottomleft' });
        this._logo.onAdd = function(map) {
            this._div = L.DomUtil.create('div', 'bing-logo');
            this._div.innerHTML =
                '<img src="https://www.microsoft.com/maps/images/branding/Bing%20logo%20white_50px-19px.png">';
            return this._div;
        };
    },

    onAdd: function(map) {
        L.BingLayer.prototype.onAdd.call(this, map);
        map.addControl(this._logo);
    },

    onRemove: function(map) {
        L.BingLayer.prototype.onRemove.call(this, map);
        map.removeControl(this._logo);
    }
});
