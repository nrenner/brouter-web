BR.BingLayer = L.BingLayer.extend({
    options: {
        maxZoom: 19,
        attribution: '<a target="_blank" href="http://www.bing.com/maps/">Bing Maps</a>'
            + ' (<a target="_blank" href="http://go.microsoft.com/?linkid=9710837">TOU</a>)'
    },

    initialize: function(key, options) {
        // override super to disable loadMetadata until async key load (called explicitly then)
        L.Util.setOptions(this, options);

        this._key = key;
        this._url = null;
        this.meta = {};
        //this.loadMetadata();

        this._logo = L.control({position: 'bottomleft'});
        this._logo.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'bing-logo');
            this._div.innerHTML = '<img src="http://www.microsoft.com/maps/images/branding/Bing%20logo%20white_50px-19px.png">';
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
