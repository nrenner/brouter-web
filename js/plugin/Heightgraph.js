BR.Heightgraph = L.Control.Heightgraph.extend({
    options: {
        width: $('#map').outerWidth(),
        margins: {
            top: 20,
            right: 30,
            bottom: 30,
            left: 60
        },
        expandControls: false,
        mappings: {
            steepness: {
                '-5': {
                    text: '16%+',
                    color: '#028306'
                },
                '-4': {
                    text: '10-15%',
                    color: '#2AA12E'
                },
                '-3': {
                    text: '7-9%',
                    color: '#53BF56'
                },
                '-2': {
                    text: '4-6%',
                    color: '#7BDD7E'
                },
                '-1': {
                    text: '1-3%',
                    color: '#A4FBA6'
                },
                '0': {
                    text: '0%',
                    color: '#ffcc99'
                },
                '1': {
                    text: '1-3%',
                    color: '#F29898'
                },
                '2': {
                    text: '4-6%',
                    color: '#E07575'
                },
                '3': {
                    text: '7-9%',
                    color: '#CF5352'
                },
                '4': {
                    text: '10-15%',
                    color: '#BE312F'
                },
                '5': {
                    text: '16%+',
                    color: '#AD0F0C'
                }
            },
            waytypes: {
                '0': {
                    text: 'Other',
                    color: '#30959e'
                },
                '1': {
                    text: 'StateRoad',
                    color: '#3f9da6'
                },
                '2': {
                    text: 'Road',
                    color: '#4ea5ae'
                },
                '3': {
                    text: 'Street',
                    color: '#5baeb5'
                },
                '4': {
                    text: 'Path',
                    color: '#67b5bd'
                },
                '5': {
                    text: 'Track',
                    color: '#73bdc4'
                },
                '6': {
                    text: 'Cycleway',
                    color: '#7fc7cd'
                },
                '7': {
                    text: 'Footway',
                    color: '#8acfd5'
                },
                '8': {
                    text: 'Steps',
                    color: '#96d7dc'
                },
                '9': {
                    text: 'Ferry',
                    color: '#a2dfe5'
                },
                '10': {
                    text: 'Construction',
                    color: '#ade8ed'
                }
            },
            surface: {
                '0': {
                    text: 'Other',
                    color: '#ddcdeb'
                },
                '1': {
                    text: 'Paved',
                    color: '#cdb8df'
                },
                '2': {
                    text: 'Unpaved',
                    color: '#d2c0e3'
                },
                '3': {
                    text: 'Asphalt',
                    color: '#bca4d3'
                },
                '4': {
                    text: 'Concrete',
                    color: '#c1abd7'
                },
                '5': {
                    text: 'Cobblestone',
                    color: '#c7b2db'
                },
                '6': {
                    text: 'Metal',
                    color: '#e8dcf3'
                },
                '7': {
                    text: 'Wood',
                    color: '#eee3f7'
                },
                '8': {
                    text: 'Compacted Gravel',
                    color: '#d8c6e7'
                },
                '9': {
                    text: 'Fine Gravel',
                    color: '#8f9de4'
                },
                '10': {
                    text: 'Gravel',
                    color: '#e3d4ef'
                },
                '11': {
                    text: 'Dirt',
                    color: '#99a6e7'
                },
                '12': {
                    text: 'Ground',
                    color: '#a3aeeb'
                },
                '13': {
                    text: 'Ice',
                    color: '#acb6ee'
                },
                '14': {
                    text: 'Salt',
                    color: '#b6c0f2'
                },
                '15': {
                    text: 'Sand',
                    color: '#c9d1f8'
                },
                '16': {
                    text: 'Woodchips',
                    color: '#c0c8f5'
                },
                '17': {
                    text: 'Grass',
                    color: '#d2dafc'
                },
                '18': {
                    text: 'Grass Paver',
                    color: '#dbe3ff'
                }
            },
            suitability: {
                '3': {
                    text: '3/10',
                    color: '#3D3D3D'
                },
                '4': {
                    text: '4/10',
                    color: '#4D4D4D'
                },
                '5': {
                    text: '5/10',
                    color: '#5D5D5D'
                },
                '6': {
                    text: '6/10',
                    color: '#6D6D6D'
                },
                '7': {
                    text: '7/10',
                    color: '#7C7C7C'
                },
                '8': {
                    text: '8/10',
                    color: '#8D8D8D'
                },
                '9': {
                    text: '9/10',
                    color: '#9D9D9D'
                },
                '10': {
                    text: '10/10',
                    color: '#ADADAD'
                }
            }
        }
    },

    /*
    onAdd: function(map) {
        var container = L.Control.Heightgraph.prototype.onAdd.call(this, map);

        // revert registering touch events when touch screen detection is available and negative
        // see https://github.com/MrMufflon/Leaflet.Elevation/issues/67
        if (L.Browser.touch && BR.Browser.touchScreenDetectable && !BR.Browser.touchScreen) {
            // heightgraph registers its own event handlers in _appendBackground()
            //
            // this._background
            //     .on('touchmove.drag', null)
            //     .on('touchstart.drag', null)
            //     .on('touchstart.focus', null);
            // L.DomEvent.off(this._container, 'touchend', this._dragEndHandler, this);
            //
            // this._background
            //     .on('mousemove.focus', this._mousemoveHandler.bind(this))
            //     .on('mouseout.focus', this._mouseoutHandler.bind(this))
            //     .on('mousedown.drag', this._dragStartHandler.bind(this))
            //     .on('mousemove.drag', this._dragHandler.bind(this));
            // L.DomEvent.on(this._container, 'mouseup', this._dragEndHandler, this);
        }

        return container;
    },
    */

    // initialized: false,

    addBelow: function(map) {
        // waiting for https://github.com/MrMufflon/Leaflet.Elevation/pull/66
        // this.width($('#map').outerWidth());
        this.options.width = $('#content').outerWidth();

        if (this.getContainer() != null) {
            this.remove(map);
        }

        function setParent(el, newParent) {
            newParent.appendChild(el);
        }
        this.addTo(map);

        // move elevation graph outside of the map
        setParent(this.getContainer(), document.getElementById('elevation-chart'));

        // this function is also executed on window resize; hence,
        // initialize the internal state on first call,
        // otherwise reset it
        //         if (this.initialized === true) {
        //             this._removeMarkedSegmentsOnMap();
        //             this._resetDrag();
        //             this._onAddData();
        //         } else {
        // bind the the mouse move and mouse out handlers, I'll reuse them later on
        this._mouseMoveHandlerBound = this.mapMousemoveHandler.bind(this);
        this._mouseoutHandlerBound = this._mouseoutHandler.bind(this);

        var self = this;
        var container = $('#elevation-chart');
        $(window).resize(function() {
            // avoid useless computations if the chart is not visible
            if (container.is(':visible')) {
                self.resize({
                    width: container.width(),
                    height: container.height()
                });
            }
        });

        //            this.initialized = true;

        // and render the chart
        this.update();
        //        }
    },

    update: function(track, layer) {
        // bring height indicator to front, because of track casing in BR.Routing
        if (this._mouseHeightFocus) {
            var g = this._mouseHeightFocus[0][0].parentNode;
            g.parentNode.appendChild(g);
        }

        if (track && track.getLatLngs().length > 0) {
            // TODO fix the geojson
            // https://leafletjs.com/reference-1.6.0.html#layer
            var geojson = track.toGeoJSON();
            geojson.properties = { attributeType: 0 };
            var data = [
                {
                    type: 'FeatureCollection',
                    features: [geojson],
                    properties: {
                        Creator: 'OpenRouteService.org',
                        records: 1,
                        summary: 'steepness'
                    }
                }
            ];
            this.addData(data);

            // this adds a blue track on the map, which only overwrites the pink brouter track
            // L.geoJson(geojson).addTo(this._map);

            // re-add handlers
            if (layer) {
                layer.on('mousemove', this._mouseMoveHandlerBound);
                layer.on('mouseout', this._mouseoutHandlerBound);
            }
        } else {
            this._removeMarkedSegmentsOnMap();
            this._resetDrag();

            // clear chart by passing an empty dataset
            this.addData([]);

            // and remove handlers
            if (layer) {
                layer.off('mousemove', this._mouseMoveHandlerBound);
                layer.off('mouseout', this._mouseoutHandlerBound);
            }
        }
    }
});
