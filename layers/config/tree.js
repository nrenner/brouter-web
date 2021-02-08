BR.confLayers.tree = {
    'base-layers': {
        'worldwide-international': [
            'standard',
            'cyclosm',
            'OpenTopoMap',
            'Stamen.Terrain',
            'Esri.WorldImagery',
            'wikimedia-map',
            'HDM_HOT',
            '1010', // OpenStreetMap.se (Hydda.Full)
            'opencylemap',
            '1061', // Thunderforest Outdoors
            '1065', // Hike & Bike Map
            '1016', // 4UMaps,
            'openmapsurfer',
            '1059'  // ÖPNV Karte
        ],
        'worldwide-monolingual': [
            'osm-mapnik-german_style',
            'osmfr',
            '1023', // kosmosnimki.ru
            '1021' // sputnik.ru
        ],
        'europe': [
            'MtbMap',
            '1069'  // MRI (maps.refuges.info)
        ],
        'europe-monolingual': [
            'osmfr-basque',
            'osmfr-breton',
            'osmfr-occitan'
        ],
        'country': [
            {
                'BE': [
                    'osmbe',
                    'osmbe-fr',
                    'osmbe-nl',
                ]
            },
            'OpenStreetMap.CH',
            'topplus-open',
            {
                'IL': [
                    'Israel_Hiking',
                    'Israel_MTB',
                ]
            },
            'mtbmap-no',
            '1017',  // Osmapa.pl - Mapa OpenStreetMap Polska
            {
                'SK': [
                    'Freemap.sk-Car',
                    'Freemap.sk-Cyclo',
                    'Freemap.sk-Hiking',
                    'Freemap.sk-Outdoor'
                ]
            },
            'osm-cambodia_laos_thailand_vietnam-bilingual'
        ]
    },
    'overlays': {
        'worldwide': [
            'HikeBike.HillShading',
            'Waymarked_Trails-Cycling',
            'Waymarked_Trails-Hiking',
            'Waymarked_Trails-MTB',
            'mapillary-coverage-raster'
        ],
        'country': [
            'historic-place-contours',
            {
                'HU': [
                    'hu-hillshade',
                    'OpenStreetMap-turistautak',
                ]
            },
            {
                'PL': [
                    'mapaszlakow-cycle',
                    'mapaszlakow-routes'
                ]
            }
        ]
    }
};
