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
            {
                'CH': [
                    'OpenStreetMap.CH',
                    'swisstopo-landeskarte',
                    'swisstopo-aerial',
                ]
            },
            'topplus-open',
            {
                'FR': [
                    'ignf-aerial',
                    'ignf-map',
                    'ignf-scan25',
                ]
            },
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
            'terrarium-hillshading',
            'Waymarked_Trails-Cycling',
            'Waymarked_Trails-Hiking',
            'Waymarked_Trails-MTB',
            'openrailwaymap',
            'mapillary-coverage',
            'osm-notes'
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
    },
    'overpass': {
        'amenity': {
            'financial': [
                'atm',
                'bank',
            ],
            'others': [
                'bench',
                'kneipp_water_cure',
                'public_bath',
                'shelter',
                'shower',
                'telephone',
                'toilets',
                'water_point',
            ],
            'sustenance': [
                'bar',
                'bbq',
                'biergarten',
                'cafe',
                'drinking_water',
                'fast_food',
                'food_court',
                'ice_cream',
                'pub',
                'restaurant',
            ],
            'transportation': [
                'bicycle_charging_station',
                'bicycle_parking',
                'bicycle_rental',
                'bicycle_repair_station',
                'boat_rental',
                'boat_sharing',
                'bus_station',
                'car_rental',
                'car_sharing',
                'car_wash',
                'charging_station',
                'ferry_terminal',
                'fuel',
                'grit_bin',
                'motorcycle_parking',
                'parking_entrance',
                'parking',
                'parking_space',
                'railway_station',
                'taxi',
                'vehicle_inspection',
            ]
        },
        'shop': {
            'food': [
                'bakery',
                'beverages',
                'butcher',
                'cheese',
                'coffee',
                'convenience',
                'greengrocer',
                'health_food',
                'ice_cream_shop',
                'organic',
                'supermarket',
            ]
        },
        'tourism': [
            'apartment',
            'artwork',
            'attraction',
            'camp_site',
            'caravan_site',
            'chalet',
            'gallery',
            'guest_house',
            'hostel',
            'hotel',
            'information',
            'motel',
            'museum',
            'picnic_site',
            'viewpoint',
            'wilderness_hut',
            'shelter',
        ]
    }
};
