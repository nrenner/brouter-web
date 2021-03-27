BR.Search = class extends L.Control.Geocoder {
    constructor(options) {
        super(
            Object.assign(
                {
                    geocoder: new L.Control.Geocoder.LatLng({
                        next: new L.Control.Geocoder.Nominatim({
                            serviceUrl: 'https://nominatim.openstreetmap.org/',
                        }),
                        sizeInMeters: 800,
                    }),
                    position: 'topleft',
                    expand: 'click',
                    shortcut: {
                        search: 70, // char code for 'f'
                    },
                    placeholder: i18next.t('map.geocoder-placeholder'),
                },
                options
            )
        );

        L.DomEvent.addListener(document, 'keydown', this._keydownListener, this);
    }

    markGeocode(result) {
        this._map.fitBounds(result.geocode.bbox, {
            maxZoom: 17,
        });

        this.clear();
        this._geocodeMarker = new L.CircleMarker(result.geocode.center, {
            interactive: false,
            color: 'red',
            opacity: 1,
            weight: 3,
        }).addTo(this._map);

        return this;
    }

    clear() {
        if (this._geocodeMarker) {
            this._map.removeLayer(this._geocodeMarker);
        }
    }

    _keydownListener(e) {
        if (BR.Util.keyboardShortcutsAllowed(e) && e.keyCode === this.options.shortcut.search) {
            $('#map .leaflet-control-geocoder')[0].dispatchEvent(new MouseEvent('mousedown'));
            e.preventDefault();
        }
    }
};
