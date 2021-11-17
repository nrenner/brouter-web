BR.confLayers.getPropertyOverrides = function() {
    return {
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
            // add Thunderforest API key variable
            'url': 'https://{switch:a,b,c}.tile.thunderforest.com/cycle/{zoom}/{x}/{y}.png?apikey={keys_thunderforest}',
            'mapUrl': 'https://www.opencyclemap.org/?zoom={zoom}&lat={lat}&lon={lon}&layers=B0000'
        },
        '1061': {
            'name': i18next.t('map.layer.outdoors'),
            'nameShort': 'Outdoors',
            'url': 'http://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey={keys_thunderforest}',
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
        // ÖPNV Karte
        '1059': {
            'name': 'Public transport (ÖPNVKarte)',
            'nameShort': 'ÖPNVKarte',
            'mapUrl': 'http://öpnvkarte.de/#{lon};{lat};{zoom}'
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
        'swisstopo-landeskarte': {
            'country_code': 'CH',
            'mapUrl': 'https://map.geo.admin.ch/?swisssearch={lat},{lon}&bgLayer=ch.swisstopo.pixelkarte-farbe',
        },
        'swisstopo-aerial': {
            'country_code': 'CH',
            'mapUrl': 'https://map.geo.admin.ch/?swisssearch={lat},{lon}&bgLayer=ch.swisstopo.swissimage',
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
        // Osmapa.pl - Mapa OpenStreetMap Polska
        '1017': {
            "country_code": "PL",
            'language_code': 'pl',
            'mapUrl': 'http://osmapa.pl/#lat={lat}&lon={lon}&z={zoom}&m=os',
            'worldTiles': true // -z13
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
        'Freemap.sk-Outdoor': {
            'mapUrl': 'https://www.freemap.sk/?map={zoom}/{lat}/{lon}&layers=X'
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
            'mapUrl': 'http://hikebikemap.org/?zoom={zoom}&lat={lat}&lon={lon}&layer=HikeBikeMap',
            'overlay': true
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
        'osm-notes': {
            'nameShort': 'OSM Notes',
            'mapUrl': 'https://www.openstreetmap.org/#map={zoom}/{lat}/{lon}&layers=N'
        },
        'openpt_map': {
            'nameShort': 'openptmap',
            'mapUrl': 'http://openptmap.org/?zoom={zoom}&lat={lat}&lon={lon}&layers=B0000TFT'
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
        'mapaszlakow-routes': {
            'nameShort': 'Routes PL',
            'mapUrl': 'http://mapaszlakow.eu/#{zoom}/{lat}/{lon}'
        },
        'cyclosm': {
            'pseudo_language_code': 'fr',
            'nameShort': 'CyclOSM',
            'mapUrl': 'https://www.cyclosm.org/#map={zoom}/{lat}/{lon}/cyclosm'
        },
    };
};
