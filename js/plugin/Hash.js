BR.Hash = L.hash.extend({

    formatHash: function(map) {
        var center = map.getCenter(),
            zoom = map.getZoom(),
            precision = Math.max(0, Math.ceil(Math.log(zoom) / Math.LN2)),
            layers = [];

        //console.log(this.options);
        var options = this.options;
        //Check active layers
        for(var key in options) {
            if (options.hasOwnProperty(key)) {
                if (map.hasLayer(options[key])) {
                    layers.push(key);
                };
            };
        };

        var url = "#" + [zoom,
            center.lat.toFixed(precision),
            center.lng.toFixed(precision),
            layers.join("-")
        ].join("/");

        if (this.additionalCb != null) {
            var additional = this.additionalCb();
            if (additional != null) {
                url += additional;
            }
        }

        return url;
    },

    update: function() {
        var hash = location.hash;
        if (hash === this.lastHash) {
            return;
        }
        var parsed = this.parseHash(hash);
        if (parsed) {
            this.movingMap = true;

            this.map.setView(parsed.center, parsed.zoom);
            var layers = parsed.layers,
                options = this.options,
                that = this;
            //Add/remove layers
            this.map.eachLayer(function(layer) {
                that.map.removeLayer(layer);
            });

            layers.forEach(function(element, index, array) {
                //console.log(options[element]);
                that.map.addLayer(options[element]);
            });

            this.movingMap = false;
        } else {
            this.onMapMove(this.map);
        }
    },

});