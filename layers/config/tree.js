BR.confLayers.tree = {
    'base-layers': {
        'worldwide-international': [
            'standard',
            'OpenTopoMap',
            'Stamen.Terrain',
            'Esri.WorldImagery',
            'wikimedia-map',
            'HDM_HOT',
            '1010', // OpenStreetMap.se (Hydda.Full)
            'opencyclemap',
            '1061', // Thunderforest Outdoors
            '1065', // Hike & Bike Map
            '1016', // 4UMaps,
            'openmapsurfer'
        ],
        'worldwide-monolingual': [
            'osm-mapnik-german_style',
            'osmfr',
            '1017',  // Osmapa.pl - Mapa OpenStreetMap Polska
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
            'OpenStreetMap-turistautak',
            {
                'IL': [
                    'Israel_Hiking',
                    'Israel_MTB',
                ]
            },
            'mtbmap-no',
            {
                'SK': [
                    'Freemap.sk-Car',
                    'Freemap.sk-Hiking',
                    'Freemap.sk-Cyclo',
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
            'hu-hillshade',
            {
                'PL': [
                    'mapaszlakow-cycle',
                    'mapaszlakow-routes'
                ]
            }
        ]
    }
};
