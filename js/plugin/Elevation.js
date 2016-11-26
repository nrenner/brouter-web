BR.Elevation = L.Control.Elevation.extend({
    options: {
        width:$('#map').outerWidth(),
        margins: {
            top: 20,
            right: 30,
            bottom: 30,
            left: 60
        },
        theme: "steelblue-theme" //purple
    },

    addBelow: function(map) {
        // waiting for https://github.com/MrMufflon/Leaflet.Elevation/pull/66
        // this.width($('#map').outerWidth());
        this.options.width = $('#map').outerWidth();

        if (this.getContainer() != null) {
            this.remove(map);
        }

        function setParent(el, newParent) {
            newParent.appendChild(el);
         }
         this.addTo(map);
        // move elevation graph outside of the map
         setParent(this.getContainer(), document.getElementById('elevation-chart'));
    },

    update: function(track, layer) {
        this.clear();

        // bring height indicator to front, because of track casing in BR.Routing
        if (this._mouseHeightFocus) {
            var g = this._mouseHeightFocus[0][0].parentNode;
            g.parentNode.appendChild(g);
        }

        if (track && track.getLatLngs().length > 0) {
            this.addData(track.toGeoJSON(), layer);

            layer.on("mouseout", this._hidePositionMarker.bind(this));
        }
    }
});