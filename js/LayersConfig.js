BR.LayersConfig = L.Class.extend({
    defaultBaseLayers: [
        'standard',
        'osm-mapnik-german_style',
        'OpenTopoMap',
        'Stamen.Terrain',
        'Esri.WorldImagery'
    ],
    defaultOverlays: [
        'HikeBike.HillShading',
        'Waymarked_Trails-Cycling',
        'Waymarked_Trails-Hiking'
    ],

    legacyNameToIdMap: {
        'OpenStreetMap': 'standard',
        'OpenStreetMap.de': 'osm-mapnik-german_style',
        'OpenTopoMap': 'OpenTopoMap',
        'Esri World Imagery': 'Esri.WorldImagery',
        'Cycling (Waymarked Trails)': 'Waymarked_Trails-Cycling',
        'Hiking (Waymarked Trails)': 'Waymarked_Trails-Hiking'
    },

    initialize: function (map) {
        this._map = map;

        this._addLeafletProvidersLayers();

        this._customizeLayers();

        this.loadDefaultLayers();
    },

    loadDefaultLayers: function() {
        if (BR.Util.localStorageAvailable()) {
            var item = localStorage.getItem("map/defaultLayers");
            if (item) {
                var defaultLayers = JSON.parse(item);
                this.defaultBaseLayers = defaultLayers.baseLayers;
                this.defaultOverlays = defaultLayers.overlays;
            }
        }
    },

    storeDefaultLayers: function (baseLayers, overlays) {
        if (BR.Util.localStorageAvailable()) {
            var defaultLayers = {
                baseLayers: baseLayers,
                overlays: overlays
            };
            localStorage.setItem("map/defaultLayers", JSON.stringify(defaultLayers));
        }
    },

    _addLeafletProvidersLayers: function () {
        var includeList = [
            'Stamen.Terrain',
            'MtbMap',
            'OpenStreetMap.CH',
            'HikeBike.HillShading',
            'Esri.WorldImagery'
        ];

        for (var i = 0; i < includeList.length; i++) {
            var id = includeList[i];
            var obj = {
                geometry: null,
                properties: {
                    id: id,
                    name: id.replace('.', ' '),
                    dataSource: 'leaflet-providers'
                },
                type: "Feature"
            };
            BR.layerIndex[id] = obj;
        }
    },

    _customizeLayers: function () {
        // add Thunderforest API key variable
        BR.layerIndex['opencylemap'].properties.url = 'https://{switch:a,b,c}.tile.thunderforest.com/cycle/{zoom}/{x}/{y}.png?apikey={keys_thunderforest}';
        BR.layerIndex['1061'].properties.url = 'http://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey={keys_thunderforest}';

        BR.layerIndex['HikeBike.HillShading'].properties.overlay = true;

        var propertyOverrides = {
            'standard': {
                'name': i18next.t('map.layer.osm'),
                'attribution': {
                    'html': '&copy; <a target="_blank" href="https://www.openstreetmap.org/copyright">openstreetmap.org</a>, <a target="_blank" href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA 2.0</a>'
                },
                'mapUrl': 'https://www.openstreetmap.org/#map={zoom}/{lat}/{lon}'
            },
            'OpenTopoMap': {
                'name': i18next.t('map.layer.topo'),
                'attribution': {
                    'html': '&copy; <a target="_blank" href="https://opentopomap.org/about#verwendung">OpenTopoMap</a>, <a target="_blank" href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA 3.0</a>; <a target="_blank" href="http://viewfinderpanoramas.org">SRTM</a>'
                },
                'mapUrl': 'https://opentopomap.org/#map={zoom}/{lat}/{lon}'
            },
            'Stamen.Terrain': {
                'name': i18next.t('map.layer.stamen-terrain'),
                'attribution': '&copy; <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>',
                'mapUrl': 'http://maps.stamen.com/#terrain/{zoom}/{lat}/{lon}'
            },
            'Esri.WorldImagery': {
                'name': i18next.t('map.layer.esri'),
                'nameShort': i18next.t('credits.esri-tiles'),
                'attribution': i18next.t('credits.esri-license'),
                'mapUrl': 'http://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9'
            },
            'wikimedia-map': {
                'mapUrl': 'https://maps.wikimedia.org/#{zoom}/{lat}/{lon}'
            },
            'HDM_HOT': {
                'nameShort': 'HOT',
                'mapUrl': 'http://map.hotosm.org/#{zoom}/{lat}/{lon}'
            },
            // OpenStreetMap.se (Hydda.Full)
            '1010': {
                'mapUrl': 'https://maps.openstreetmap.se/#{zoom}/{lat}/{lon}'
            },
            'opencylemap': {
                'name': i18next.t('map.layer.cycle'),
                'nameShort': 'OpenCycleMap',
                'mapUrl': 'https://www.opencyclemap.org/?zoom={zoom}&lat={lat}&lon={lon}&layers=B0000'
            },
            '1061': {
                'name': i18next.t('map.layer.outdoors'),
                'nameShort': 'Outdoors',
                'mapUrl': 'https://www.opencyclemap.org/?zoom={zoom}&lat={lat}&lon={lon}&layers=000B0'
            },
            // Hike & Bike Map
            '1065': {
                'mapUrl': 'http://hikebikemap.org/?zoom={zoom}&lat={lat}&lon={lon}&layer=HikeBikeMap'
            },
            // 4UMaps
            '1016': {
                'mapUrl': 'https://www.4umaps.com/map.htm?zoom={zoom}&lat={lat}&lon={lon}&layers=B00'
            },
            'openmapsurfer': {
                'mapUrl': 'https://maps.openrouteservice.org/directions?n1={lat}&n2={lon}&n3={zoom}&b=0&c=0&k1=en-US&k2=km'
            },
            'osm-mapnik-german_style': {
                'name': i18next.t('map.layer.osmde'),
                'language_code': 'de',
                'attribution': {
                    'html': '&copy; <a target="_blank" href="https://openstreetmap.de/karte.html">openstreetmap.de</a>'
                },
                'mapUrl': 'https://www.openstreetmap.de/karte.html?zoom={zoom}&lat={lat}&lon={lon}&layers=B000TF'
            },
            'osmfr': {
                'language_code': 'fr',
                'nameShort': 'OSM French',
                'mapUrl': 'http://tile.openstreetmap.fr/?layers=B00000000FFFFFF&zoom={zoom}&lat={lat}&lon={lon}'
            },
            // Osmapa.pl - Mapa OpenStreetMap Polska
            '1017': {
                'language_code': 'pl',
                'mapUrl': 'http://osmapa.pl/#lat={lat}&lon={lon}&z={zoom}&m=os'
            },
            // kosmosnimki.ru
            '1023': {
                'language_code': 'ru',
                'mapUrl': 'http://kosmosnimki.ru/'
            },
            // sputnik.ru
            '1021': {
                'language_code': 'ru',
                'mapUrl': 'http://maps.sputnik.ru/?lat={lat}&lng={lon}&zoom={zoom}'
            },
            'MtbMap': {
                'mapUrl': 'http://mtbmap.cz/#zoom={zoom}&lat={lat}&lon={lon}',
                'worldTiles': true // -z12
            },
            // MRI (maps.refuges.info)
            '1069': {
                'nameShort': 'Refuges.info',
                'mapUrl': 'http://maps.refuges.info/?zoom={zoom}&lat={lat}&lon={lon}&layers=B',
                'worldTiles': true
            },
            'osmfr-basque': {
                'language_code': 'eu',
                'nameShort': 'OSM Basque',
                'mapUrl': 'http://tile.openstreetmap.fr/?layers=00000000BFFFFFF&zoom={zoom}&lat={lat}&lon={lon}',
                'worldTiles': true
            },
            'osmfr-breton': {
                'language_code': 'br',
                'nameShort': 'OSM Breton',
                'mapUrl': 'https://kartenn.openstreetmap.bzh/#map={zoom}/{lat}/{lon}',
                'worldTiles': true
            },
            'osmfr-occitan': {
                'language_code': 'oc',
                'nameShort': 'OSM Occitan',
                'mapUrl': 'http://tile.openstreetmap.fr/?layers=0000000B0FFFFFF&zoom={zoom}&lat={lat}&lon={lon}',
                'worldTiles': true
            },
            'osmbe': {
                'nameShort': 'OSM Belgium',
                'mapUrl': 'https://tile.osm.be/#map={zoom}/{lat}/{lon}',
                'worldTiles': true // -z7
            },
            'osmbe-fr': {
                'nameShort': 'OSM Belgium (fr)',
                'mapUrl': 'https://tile.osm.be/#map={zoom}/{lat}/{lon}',
                'worldTiles': true // -z7
            },
            'osmbe-nl': {
                'nameShort': 'OSM Belgium (nl)',
                'mapUrl': 'https://tile.osm.be/#map={zoom}/{lat}/{lon}',
                'worldTiles': true // -z7
            },
            'OpenStreetMap.CH': {
                'country_code': 'CH',
                'mapUrl': 'https://osm.ch/#{zoom}/{lat}/{lon}',
                'worldTiles': true
            },
            'topplus-open': {
                'country_code': 'DE',
                'mapUrl': 'http://www.geodatenzentrum.de/geodaten/gdz_rahmen.gdz_div?gdz_spr=deu&gdz_user_id=0&gdz_akt_zeile=5&gdz_anz_zeile=1&gdz_unt_zeile=41',
                'worldTiles': true // World -z9, Europe -z14
            },

            'OpenStreetMap-turistautak': {
                'nameShort': 'OSM Turistautak',
                'mapUrl': 'https://turistautak.openstreetmap.hu/?zoom={zoom}&lat={lat}&lon={lon}&layers=0B00F'
            },
            'Israel_Hiking': {
                'mapUrl': 'https://israelhiking.osm.org.il/map/{zoom}/{lat}/{lon}'
            },
            'Israel_MTB': {
                'mapUrl': 'https://israelhiking.osm.org.il/map/{zoom}/{lat}/{lon}'
            },
            'mtbmap-no': {
                'mapUrl': 'https://mtbmap.no/#{zoom}/{lat}/{lon}'
            },
            'Freemap.sk-Car': {
                'mapUrl': 'https://www.freemap.sk/?map={zoom}/{lat}/{lon}&layers=A'
            },
            'Freemap.sk-Hiking': {
                'mapUrl': 'https://www.freemap.sk/?map={zoom}/{lat}/{lon}&layers=T'
            },
            'Freemap.sk-Cyclo': {
                'mapUrl': 'https://www.freemap.sk/?map={zoom}/{lat}/{lon}&layers=C'
            },
            'osm-cambodia_laos_thailand_vietnam-bilingual': {
                'country_code': 'TH+',
                'nameShort': 'Thaimap',
                'mapUrl': 'http://thaimap.osm-tools.org/?zoom={zoom}&lat={lat}&lon={lon}&layers=BT',
                'worldTiles': true
            },
            'HikeBike.HillShading': {
                'name': i18next.t('map.layer.hikebike-hillshading'),
                'nameShort': i18next.t('map.hikebike-hillshading'),
                'attribution': '&copy; <a target="_blank" href="http://hikebikemap.org">hikebikemap.org</a>; SRTM3 v2 (<a target="_blank" href="http://www2.jpl.nasa.gov/srtm/">NASA</a>)',
                'mapUrl': 'http://hikebikemap.org/?zoom={zoom}&lat={lat}&lon={lon}&layer=HikeBikeMap'
            },
            'Waymarked_Trails-Cycling': {
                'name': i18next.t('map.layer.cycling'),
                'nameShort': i18next.t('map.cycling'),
                'attribution': {
                    'html': '&copy; <a target="_blank" href="https://cycling.waymarkedtrails.org/en/help/legal">waymarkedtrails.org</a>, <a target="_blank" href="https://creativecommons.org/licenses/by-sa/3.0/de/deed.en">CC-BY-SA 3.0 DE</a>'
                },
                'mapUrl': 'http://cycling.waymarkedtrails.org/#?map={zoom}!{lat}!{lon}'
            },
            'Waymarked_Trails-Hiking': {
                'name': i18next.t('map.layer.hiking'),
                'nameShort': i18next.t('map.hiking'),
                'attribution': {
                    'html': '&copy; <a target="_blank" href="https://hiking.waymarkedtrails.org/en/help/legal">waymarkedtrails.org</a>, <a target="_blank" href="https://creativecommons.org/licenses/by-sa/3.0/de/deed.en">CC-BY-SA 3.0 DE</a>'
                },
                'mapUrl': 'http://hiking.waymarkedtrails.org/#?map={zoom}!{lat}!{lon}'
            },
            'Waymarked_Trails-MTB': {
                'nameShort': 'MTB',
                'mapUrl': 'http://mtb.waymarkedtrails.org/#?map={zoom}!{lat}!{lon}'
            },
            'mapillary-coverage-raster': {
                'nameShort': 'Mapillary',
                'mapUrl': 'https://www.mapillary.com/app/?lat={lat}&lng={lon}&z={zoom}&menu=false'
            },
            'historic-place-contours': {
                'mapUrl': 'http://gk.historic.place/historische_objekte/?zoom={zoom}&lat={lat}&lon={lon}&pid=GhHaSaHe'
            },
            'hu-hillshade': {
                'nameShort': 'Hillshade HU',
                'mapUrl': 'http://map.turistautak.hu/?zoom={zoom}&lat={lat}&lon={lon}&layers=0B000FTF'
            },
            'mapaszlakow-cycle': {
                'nameShort': 'Cycleways PL',
                'mapUrl': 'http://mapaszlakow.eu/#{zoom}/{lat}/{lon}'
            },
            'mapaszlakow-bike': {
                'nameShort': 'Bicycle PL',
                'mapUrl': 'http://mapaszlakow.eu/#{zoom}/{lat}/{lon}'
            },
            'mapaszlakow-hike': {
                'nameShort': 'Hiking PL',
                'mapUrl': 'http://mapaszlakow.eu/#{zoom}/{lat}/{lon}'
            },
            'mapaszlakow-mtb': {
                'nameShort': 'MTB:scale PL',
                'mapUrl': 'http://mapaszlakow.eu/#{zoom}/{lat}/{lon}'
            },
            'mapaszlakow-incline': {
                'nameShort': 'Incline PL',
                'mapUrl': 'http://mapaszlakow.eu/#{zoom}/{lat}/{lon}'
            }
        };

        for (id in propertyOverrides) {
            var layer = BR.layerIndex[id];

            if (layer) {
                var properties = propertyOverrides[id];

                for (key in properties) {
                    var value = properties[key];
                    layer.properties[key] = value;
                }
            } else {
                console.error('Layer not found: ' + id);
            }
        }

        // http://download.geofabrik.de/europe.poly
        var europeGeofabrik = {
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        -5.863332,
                        81.43475
                    ],
                    [
                        -6.704456,
                        74.78623
                    ],
                    [
                        -34.49296,
                        62.80744
                    ],
                    [
                        -30.83753,
                        30.81659
                    ],
                    [
                        -15.764107,
                        29.735139
                    ],
                    [
                        -9.611205,
                        35.98587
                    ],
                    [
                        -5.653329,
                        35.89458
                    ],
                    [
                        -5.401044,
                        35.93719
                    ],
                    [
                        -5.377002,
                        35.87962
                    ],
                    [
                        -5.345073,
                        35.86568
                    ],
                    [
                        -5.261097,
                        35.76039
                    ],
                    [
                        -5.001727,
                        35.73424
                    ],
                    [
                        -3.105293,
                        35.432621
                    ],
                    [
                        -2.922474,
                        35.472141
                    ],
                    [
                        -2.914235,
                        35.353502
                    ],
                    [
                        -2.946335,
                        35.324656
                    ],
                    [
                        -2.963845,
                        35.316812
                    ],
                    [
                        -2.970368,
                        35.300843
                    ],
                    [
                        -2.972428,
                        35.28543
                    ],
                    [
                        -2.951485,
                        35.263288
                    ],
                    [
                        -2.929856,
                        35.269174
                    ],
                    [
                        -2.912861,
                        35.287112
                    ],
                    [
                        -2.159529,
                        35.779803
                    ],
                    [
                        3.541102,
                        37.75981
                    ],
                    [
                        11.60037,
                        37.85861
                    ],
                    [
                        11.59562,
                        35.53805
                    ],
                    [
                        13.0029,
                        34
                    ],
                    [
                        33.2715,
                        33.99719
                    ],
                    [
                        34.76975,
                        34.85431
                    ],
                    [
                        35.26666,
                        35.62579
                    ],
                    [
                        36.23694,
                        35.80641
                    ],
                    [
                        36.76862,
                        36.1953
                    ],
                    [
                        36.75406,
                        36.57056
                    ],
                    [
                        39.64272,
                        36.64706
                    ],
                    [
                        40.84017,
                        37.09256
                    ],
                    [
                        41.28895,
                        37.02624
                    ],
                    [
                        42.39857,
                        37.05453
                    ],
                    [
                        43.27242,
                        37.24267
                    ],
                    [
                        44.32863,
                        36.9149
                    ],
                    [
                        44.99693,
                        37.19937
                    ],
                    [
                        44.51902,
                        38.64945
                    ],
                    [
                        44.18354,
                        39.27688
                    ],
                    [
                        44.87971,
                        39.64022
                    ],
                    [
                        44.50794,
                        40.07579
                    ],
                    [
                        43.9816,
                        40.16476
                    ],
                    [
                        43.75998,
                        41.03971
                    ],
                    [
                        44.85145,
                        41.06895
                    ],
                    [
                        44.99714,
                        41.26553
                    ],
                    [
                        45.03948,
                        41.2894
                    ],
                    [
                        45.13693,
                        41.34945
                    ],
                    [
                        45.1819,
                        41.40194
                    ],
                    [
                        45.25686,
                        41.43192
                    ],
                    [
                        45.31682,
                        41.44691
                    ],
                    [
                        45.37179,
                        41.41506
                    ],
                    [
                        45.44924,
                        41.40569
                    ],
                    [
                        45.60915,
                        41.34194
                    ],
                    [
                        45.6941,
                        41.34007
                    ],
                    [
                        45.6841,
                        41.29128
                    ],
                    [
                        45.72658,
                        41.23493
                    ],
                    [
                        45.88399,
                        41.17854
                    ],
                    [
                        46.00642,
                        41.16161
                    ],
                    [
                        46.11135,
                        41.16161
                    ],
                    [
                        46.1963,
                        41.17478
                    ],
                    [
                        46.28875,
                        41.16726
                    ],
                    [
                        46.33622,
                        41.1221
                    ],
                    [
                        46.3762,
                        41.08068
                    ],
                    [
                        46.44616,
                        41.06373
                    ],
                    [
                        46.49363,
                        41.04677
                    ],
                    [
                        46.65354,
                        41.09198
                    ],
                    [
                        46.67852,
                        41.16349
                    ],
                    [
                        46.75348,
                        41.29315
                    ],
                    [
                        46.63605,
                        41.40007
                    ],
                    [
                        46.44366,
                        41.46563
                    ],
                    [
                        46.34622,
                        41.53861
                    ],
                    [
                        46.35871,
                        41.59656
                    ],
                    [
                        46.28625,
                        41.63765
                    ],
                    [
                        46.24128,
                        41.65259
                    ],
                    [
                        46.21879,
                        41.70484
                    ],
                    [
                        46.25877,
                        41.74587
                    ],
                    [
                        46.31873,
                        41.76078
                    ],
                    [
                        46.38869,
                        41.81853
                    ],
                    [
                        46.42367,
                        41.8632
                    ],
                    [
                        46.43616,
                        41.91156
                    ],
                    [
                        46.42117,
                        41.94874
                    ],
                    [
                        46.33872,
                        41.96546
                    ],
                    [
                        46.26626,
                        42.01931
                    ],
                    [
                        46.18131,
                        42.03045
                    ],
                    [
                        46.10386,
                        42.04344
                    ],
                    [
                        45.98893,
                        42.06014
                    ],
                    [
                        45.92396,
                        42.10093
                    ],
                    [
                        45.8665,
                        42.13244
                    ],
                    [
                        45.80154,
                        42.138
                    ],
                    [
                        45.72658,
                        42.17875
                    ],
                    [
                        45.65912,
                        42.21392
                    ],
                    [
                        45.65412,
                        42.25831
                    ],
                    [
                        45.71659,
                        42.26941
                    ],
                    [
                        45.77405,
                        42.2842
                    ],
                    [
                        45.78654,
                        42.3267
                    ],
                    [
                        45.76656,
                        42.36363
                    ],
                    [
                        45.78155,
                        42.42083
                    ],
                    [
                        45.80154,
                        42.46693
                    ],
                    [
                        45.79154,
                        42.49825
                    ],
                    [
                        45.70159,
                        42.51299
                    ],
                    [
                        45.61664,
                        42.54429
                    ],
                    [
                        45.56917,
                        42.55533
                    ],
                    [
                        45.44924,
                        42.55902
                    ],
                    [
                        45.36179,
                        42.55717
                    ],
                    [
                        45.32931,
                        42.59213
                    ],
                    [
                        45.24186,
                        42.67669
                    ],
                    [
                        45.16941,
                        42.71892
                    ],
                    [
                        45.07696,
                        42.74462
                    ],
                    [
                        44.99722,
                        42.75437
                    ],
                    [
                        45,
                        75
                    ],
                    [
                        39.67188,
                        81.47299
                    ],
                    [
                        -5.863332,
                        81.43475
                    ]
                ]
            ]
        };

        BR.layerIndex['MtbMap'].geometry = europeGeofabrik;
        BR.layerIndex['1069'].geometry = europeGeofabrik;

        // https://planet.osm.ch/switzerland-padded.poly
        BR.layerIndex['OpenStreetMap.CH'].geometry = {
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        8.492869,
                        45.90551
                    ],
                    [
                        8.467679,
                        45.92433
                    ],
                    [
                        8.479669,
                        45.94618
                    ],
                    [
                        8.514721,
                        45.95314
                    ],
                    [
                        8.5552,
                        45.93465
                    ],
                    [
                        8.610767,
                        45.96831
                    ],
                    [
                        8.659819,
                        46.0233
                    ],
                    [
                        8.633266,
                        46.03273
                    ],
                    [
                        8.56973,
                        46.04218
                    ],
                    [
                        8.477268,
                        46.14229
                    ],
                    [
                        8.38593,
                        46.18059
                    ],
                    [
                        8.365009,
                        46.20668
                    ],
                    [
                        8.338326,
                        46.29113
                    ],
                    [
                        8.277115,
                        46.25639
                    ],
                    [
                        8.244319,
                        46.22479
                    ],
                    [
                        8.25504,
                        46.1737
                    ],
                    [
                        8.220272,
                        46.0853
                    ],
                    [
                        8.156519,
                        46.03575
                    ],
                    [
                        8.121533,
                        46.02264
                    ],
                    [
                        8.063555,
                        45.93807
                    ],
                    [
                        8.024118,
                        45.9131
                    ],
                    [
                        7.964514,
                        45.9063
                    ],
                    [
                        7.942328,
                        45.86456
                    ],
                    [
                        7.899453,
                        45.83417
                    ],
                    [
                        7.861293,
                        45.82673
                    ],
                    [
                        7.779909,
                        45.8295
                    ],
                    [
                        7.752747,
                        45.83978
                    ],
                    [
                        7.701133,
                        45.83561
                    ],
                    [
                        7.669594,
                        45.84911
                    ],
                    [
                        7.640307,
                        45.88286
                    ],
                    [
                        7.58941,
                        45.88105
                    ],
                    [
                        7.529595,
                        45.86574
                    ],
                    [
                        7.402153,
                        45.80852
                    ],
                    [
                        7.317926,
                        45.82216
                    ],
                    [
                        7.229621,
                        45.77666
                    ],
                    [
                        7.195038,
                        45.77046
                    ],
                    [
                        7.151519,
                        45.78199
                    ],
                    [
                        7.098531,
                        45.76923
                    ],
                    [
                        7.048087,
                        45.78678
                    ],
                    [
                        6.977199,
                        45.86267
                    ],
                    [
                        6.909759,
                        45.95444
                    ],
                    [
                        6.863818,
                        45.95577
                    ],
                    [
                        6.816051,
                        45.98056
                    ],
                    [
                        6.793205,
                        46.00764
                    ],
                    [
                        6.782526,
                        46.04831
                    ],
                    [
                        6.751912,
                        46.05915
                    ],
                    [
                        6.724837,
                        46.0837
                    ],
                    [
                        6.701711,
                        46.16207
                    ],
                    [
                        6.716947,
                        46.2283
                    ],
                    [
                        6.736484,
                        46.26473
                    ],
                    [
                        6.694572,
                        46.30485
                    ],
                    [
                        6.683491,
                        46.36284
                    ],
                    [
                        6.639234,
                        46.37188
                    ],
                    [
                        6.527685,
                        46.36772
                    ],
                    [
                        6.443115,
                        46.32769
                    ],
                    [
                        6.375001,
                        46.31766
                    ],
                    [
                        6.395667,
                        46.28306
                    ],
                    [
                        6.399512,
                        46.24953
                    ],
                    [
                        6.366316,
                        46.17066
                    ],
                    [
                        6.339664,
                        46.1472
                    ],
                    [
                        6.263675,
                        46.11975
                    ],
                    [
                        6.23886,
                        46.09161
                    ],
                    [
                        6.158579,
                        46.05435
                    ],
                    [
                        6.081472,
                        46.05739
                    ],
                    [
                        6.050651,
                        46.04563
                    ],
                    [
                        5.997218,
                        46.05107
                    ],
                    [
                        5.948493,
                        46.04266
                    ],
                    [
                        5.914794,
                        46.0523
                    ],
                    [
                        5.887331,
                        46.07407
                    ],
                    [
                        5.870269,
                        46.10469
                    ],
                    [
                        5.866195,
                        46.1395
                    ],
                    [
                        5.876784,
                        46.17488
                    ],
                    [
                        5.878724,
                        46.22663
                    ],
                    [
                        5.906689,
                        46.27411
                    ],
                    [
                        5.930834,
                        46.29367
                    ],
                    [
                        6.027417,
                        46.33407
                    ],
                    [
                        5.985898,
                        46.37143
                    ],
                    [
                        5.974156,
                        46.42372
                    ],
                    [
                        5.990442,
                        46.50188
                    ],
                    [
                        6.026311,
                        46.5455
                    ],
                    [
                        6.022255,
                        46.59403
                    ],
                    [
                        6.035602,
                        46.62634
                    ],
                    [
                        6.22881,
                        46.76464
                    ],
                    [
                        6.341668,
                        46.81127
                    ],
                    [
                        6.363179,
                        46.87154
                    ],
                    [
                        6.346201,
                        46.90367
                    ],
                    [
                        6.343411,
                        46.94033
                    ],
                    [
                        6.355511,
                        46.97504
                    ],
                    [
                        6.380481,
                        47.00202
                    ],
                    [
                        6.460064,
                        47.0564
                    ],
                    [
                        6.576143,
                        47.07433
                    ],
                    [
                        6.652275,
                        47.15662
                    ],
                    [
                        6.764373,
                        47.21768
                    ],
                    [
                        6.835864,
                        47.27423
                    ],
                    [
                        6.803207,
                        47.30456
                    ],
                    [
                        6.790738,
                        47.3367
                    ],
                    [
                        6.800235,
                        47.40676
                    ],
                    [
                        6.894733,
                        47.51086
                    ],
                    [
                        6.928989,
                        47.56657
                    ],
                    [
                        7.015293,
                        47.59424
                    ],
                    [
                        7.075224,
                        47.58216
                    ],
                    [
                        7.142397,
                        47.59277
                    ],
                    [
                        7.243866,
                        47.57342
                    ],
                    [
                        7.271519,
                        47.55022
                    ],
                    [
                        7.285798,
                        47.52329
                    ],
                    [
                        7.346517,
                        47.53069
                    ],
                    [
                        7.37208,
                        47.56329
                    ],
                    [
                        7.42208,
                        47.58618
                    ],
                    [
                        7.448489,
                        47.61448
                    ],
                    [
                        7.575359,
                        47.67885
                    ],
                    [
                        7.703819,
                        47.69021
                    ],
                    [
                        7.736406,
                        47.68004
                    ],
                    [
                        7.76446,
                        47.65614
                    ],
                    [
                        7.804089,
                        47.67608
                    ],
                    [
                        7.89273,
                        47.67742
                    ],
                    [
                        7.930025,
                        47.66899
                    ],
                    [
                        7.958027,
                        47.64814
                    ],
                    [
                        8.048813,
                        47.64786
                    ],
                    [
                        8.191781,
                        47.70993
                    ],
                    [
                        8.314922,
                        47.69564
                    ],
                    [
                        8.319516,
                        47.7273
                    ],
                    [
                        8.337261,
                        47.75773
                    ],
                    [
                        8.422989,
                        47.83705
                    ],
                    [
                        8.455337,
                        47.85624
                    ],
                    [
                        8.49701,
                        47.86304
                    ],
                    [
                        8.549818,
                        47.89661
                    ],
                    [
                        8.6846,
                        47.88607
                    ],
                    [
                        8.790438,
                        47.82635
                    ],
                    [
                        8.850936,
                        47.81664
                    ],
                    [
                        8.876567,
                        47.79465
                    ],
                    [
                        8.919398,
                        47.78106
                    ],
                    [
                        8.945503,
                        47.75688
                    ],
                    [
                        9.027525,
                        47.77646
                    ],
                    [
                        9.059951,
                        47.7698
                    ],
                    [
                        9.018813,
                        47.79878
                    ],
                    [
                        9.032583,
                        47.82917
                    ],
                    [
                        9.064145,
                        47.82828
                    ],
                    [
                        9.237082,
                        47.74286
                    ],
                    [
                        9.297137,
                        47.74129
                    ],
                    [
                        9.474565,
                        47.67988
                    ],
                    [
                        9.54697,
                        47.62715
                    ],
                    [
                        9.597715,
                        47.61384
                    ],
                    [
                        9.627587,
                        47.58008
                    ],
                    [
                        9.717273,
                        47.56334
                    ],
                    [
                        9.760949,
                        47.53126
                    ],
                    [
                        9.767215,
                        47.51395
                    ],
                    [
                        9.749904,
                        47.49278
                    ],
                    [
                        9.735549,
                        47.49286
                    ],
                    [
                        9.762804,
                        47.38884
                    ],
                    [
                        9.758399,
                        47.35224
                    ],
                    [
                        9.739689,
                        47.32047
                    ],
                    [
                        9.67065,
                        47.2814
                    ],
                    [
                        9.6013,
                        47.21222
                    ],
                    [
                        9.586933,
                        47.18624
                    ],
                    [
                        9.689447,
                        47.15178
                    ],
                    [
                        9.74309,
                        47.13179
                    ],
                    [
                        9.809019,
                        47.1252
                    ],
                    [
                        9.848298,
                        47.10726
                    ],
                    [
                        9.910891,
                        47.10429
                    ],
                    [
                        9.952157,
                        47.06957
                    ],
                    [
                        9.98115,
                        47.00257
                    ],
                    [
                        10.05529,
                        46.98344
                    ],
                    [
                        10.13323,
                        46.93819
                    ],
                    [
                        10.147,
                        46.94095
                    ],
                    [
                        10.16664,
                        46.98267
                    ],
                    [
                        10.19386,
                        47.00829
                    ],
                    [
                        10.25387,
                        47.02058
                    ],
                    [
                        10.30571,
                        47.06984
                    ],
                    [
                        10.39688,
                        47.08916
                    ],
                    [
                        10.54592,
                        47.00777
                    ],
                    [
                        10.56775,
                        46.98195
                    ],
                    [
                        10.57852,
                        46.9499
                    ],
                    [
                        10.5767,
                        46.91614
                    ],
                    [
                        10.55547,
                        46.86624
                    ],
                    [
                        10.5527,
                        46.80989
                    ],
                    [
                        10.51721,
                        46.70432
                    ],
                    [
                        10.56243,
                        46.67151
                    ],
                    [
                        10.58182,
                        46.62438
                    ],
                    [
                        10.55806,
                        46.51803
                    ],
                    [
                        10.53333,
                        46.47741
                    ],
                    [
                        10.48736,
                        46.44756
                    ],
                    [
                        10.43817,
                        46.44193
                    ],
                    [
                        10.39398,
                        46.46106
                    ],
                    [
                        10.27943,
                        46.46153
                    ],
                    [
                        10.25624,
                        46.41816
                    ],
                    [
                        10.24927,
                        46.36574
                    ],
                    [
                        10.2344,
                        46.33451
                    ],
                    [
                        10.25987,
                        46.29219
                    ],
                    [
                        10.26513,
                        46.2426
                    ],
                    [
                        10.23076,
                        46.18647
                    ],
                    [
                        10.15881,
                        46.13887
                    ],
                    [
                        10.04873,
                        46.12991
                    ],
                    [
                        9.978885,
                        46.16745
                    ],
                    [
                        9.958168,
                        46.20371
                    ],
                    [
                        9.924692,
                        46.22991
                    ],
                    [
                        9.895489,
                        46.28132
                    ],
                    [
                        9.786615,
                        46.24558
                    ],
                    [
                        9.759336,
                        46.21665
                    ],
                    [
                        9.728643,
                        46.2038
                    ],
                    [
                        9.617662,
                        46.19762
                    ],
                    [
                        9.513379,
                        46.21998
                    ],
                    [
                        9.444429,
                        46.28666
                    ],
                    [
                        9.388866,
                        46.32289
                    ],
                    [
                        9.379128,
                        46.28609
                    ],
                    [
                        9.338489,
                        46.23249
                    ],
                    [
                        9.320785,
                        46.18026
                    ],
                    [
                        9.276471,
                        46.14852
                    ],
                    [
                        9.234903,
                        46.09644
                    ],
                    [
                        9.176374,
                        46.06414
                    ],
                    [
                        9.147375,
                        46.00762
                    ],
                    [
                        9.119328,
                        45.98555
                    ],
                    [
                        9.15101,
                        45.96603
                    ],
                    [
                        9.170848,
                        45.93834
                    ],
                    [
                        9.178974,
                        45.90526
                    ],
                    [
                        9.167161,
                        45.85595
                    ],
                    [
                        9.129424,
                        45.81787
                    ],
                    [
                        9.089176,
                        45.75155
                    ],
                    [
                        9.023952,
                        45.72831
                    ],
                    [
                        8.95142,
                        45.74819
                    ],
                    [
                        8.902194,
                        45.74103
                    ],
                    [
                        8.853552,
                        45.76223
                    ],
                    [
                        8.82531,
                        45.80715
                    ],
                    [
                        8.830195,
                        45.86642
                    ],
                    [
                        8.80976,
                        45.89852
                    ],
                    [
                        8.766516,
                        45.90127
                    ],
                    [
                        8.721788,
                        45.92601
                    ],
                    [
                        8.70312,
                        45.96104
                    ],
                    [
                        8.61001,
                        45.89371
                    ],
                    [
                        8.63261,
                        45.85761
                    ],
                    [
                        8.638899,
                        45.82102
                    ],
                    [
                        8.60393,
                        45.78804
                    ],
                    [
                        8.586053,
                        45.78422
                    ],
                    [
                        8.609555,
                        45.74774
                    ],
                    [
                        8.631555,
                        45.7349
                    ],
                    [
                        8.625964,
                        45.71327
                    ],
                    [
                        8.579137,
                        45.71122
                    ],
                    [
                        8.532171,
                        45.76848
                    ],
                    [
                        8.524891,
                        45.80268
                    ],
                    [
                        8.558807,
                        45.84379
                    ],
                    [
                        8.55275,
                        45.86345
                    ],
                    [
                        8.512535,
                        45.87963
                    ],
                    [
                        8.492869,
                        45.90551
                    ]
                ]
            ]
        };
    },

    isDefaultLayer: function(id, overlay) {
        var result = false;
        if (overlay) {
            result = this.defaultOverlays.indexOf(id) > -1;
        } else {
            result = this.defaultBaseLayers.indexOf(id) > -1;
        }
        return result;
    },

    getBaseLayers: function() {
        return this._getLayers(this.defaultBaseLayers);
    },

    getOverlays: function() {
        return this._getLayers(this.defaultOverlays);
    },

    _getLayers: function(ids) {
        var layers = {};

        for (var i = 0; i < ids.length; i++) {
            var layerId = ids[i];
            var layerData = BR.layerIndex[layerId];

            if (layerData) {
                layers[layerData.properties.name] = this.createLayer(layerData);
            } else {
                console.error('Layer not found: ' + layerId);
            }
        }

        return layers;
    },

    // own convention: key placeholder with prefix
    // e.g. ?api_key={keys_openrouteservice}
    getKeyName: function (url) {
        var result = null;
        // L.Util.template only matches [\w_-]
        var prefix = 'keys_';
        var regex = new RegExp('{' + prefix + '([^}]*)}');
        var found, name;

        if (!url) return result;

        found = url.match(regex);
        if (found) {
            name = found[1];
            result = {
                name: name,
                urlVar: prefix + name
            };
        }

        return result;
    },

    createLayer: function (layerData) {
        var props = layerData.properties;
        var url = props.url;
        var layer;

        // JOSM:    https://{switch:a,b,c}.tile.openstreetmap.org/{zoom}/{x}/{y}.png
        // Leaflet: https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
        function convertUrlJosm(url) {
            var rxSwitch = /{switch:[^}]*}/;
            var rxZoom = /{zoom}/g;
            var result = url.replace(rxSwitch, '{s}');
            result = result.replace(rxZoom, '{z}');
            return result;
        }

        // JOSM:    https://{switch:a,b,c}.tile.openstreetmap.org/{zoom}/{x}/{y}.png
        // Leaflet: ['a','b','c']
        function getSubdomains(url) {
            var result = 'abc';
            var regex = /{switch:([^}]*)}/;
            var found = url.match(regex);
            if (found) {
                result = found[1].split(',');
            }
            return result;
        }

        function convertAttributionJosm(props) {
            var result = '';
            var attr = props.attribution;

            if (attr) {
                if (attr.html) {
                    result = attr.html;
                } else if (attr.url && attr.text) {
                    result = '<a href="' + attr.url + '" target="_blank" rel="noopener">' + attr.text + '</a>';
                } else if (attr.text) {
                    result = attr.text;
                }
            }
            if (!result) {
                console.warn('No attribution: ' + props.id);
            }

            return result;
        }


        var options = {
            maxZoom: this._map.getMaxZoom(),
            bounds: layerData.geometry && !props.worldTiles ? L.geoJson(layerData.geometry).getBounds() : null
        };
        if (props.mapUrl) {
            options.mapLink = '<a target="_blank" href="' + props.mapUrl + '">' + (props.nameShort || props.name) + '</a>';
        }
        if (props.attribution) {
            options.attribution = props.attribution;
        }

        var keyObj = this.getKeyName(url);
        if (keyObj && BR.keys[keyObj.name]) {
            options[keyObj.urlVar] = BR.keys[keyObj.name];
        }

        if (props.dataSource === 'leaflet-providers') {
            layer = L.tileLayer.provider(props.id);

            var layerOptions = L.Util.extend(options, {
                maxNativeZoom: layer.options.maxZoom,
            });
            L.setOptions(layer, layerOptions);

        } else if (props.dataSource === 'LayersCollection') {
            layer = L.tileLayer(url, L.Util.extend(options, {
                minZoom: props.minZoom || 0,
                maxNativeZoom: props.maxZoom
            }));
            if (props.subdomains) {
                layer.subdomains = props.subdomains;
            }
        } else {
            // JOSM
            var josmUrl = url;
            var url = convertUrlJosm(josmUrl);

            var josmOptions = L.Util.extend(options, {
                minZoom: props.min_zoom || 0,
                maxNativeZoom: props.max_zoom,
                subdomains: getSubdomains(josmUrl),
                attribution: convertAttributionJosm(props)
            });

            if (props.type && props.type === 'wms') {
                layer = L.tileLayer.wms(url, L.Util.extend(josmOptions, {
                    layers: props.layers,
                    format: props.format
                }));
            } else {
                layer = L.tileLayer(url, josmOptions);
            }
        }

        // Layer attribution here only as short link to original site,
        // to keep current position use placeholders: {zoom}/{lat}/{lon}
        // Copyright attribution in index.html #credits
        var getAttribution = function () {
            return this.options.mapLink;
        }
        layer.getAttribution = getAttribution;

        layer.id = props.id;

        return layer;
    }
});

BR.layersConfig = function (map) {
	return new BR.LayersConfig(map);
};
