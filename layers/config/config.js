BR.confLayers = {};

BR.confLayers.defaultBaseLayers = [
    'standard',
    'OpenTopoMap',
    'Stamen.Terrain',
    'Esri.WorldImagery'
];

// worldwide monolingual layers to add as default when browser language matches
BR.confLayers.languageDefaultLayers = [
    'osm-mapnik-german_style',
    'osmfr',
    '1021' // sputnik.ru
];

BR.confLayers.defaultOverlays =  [
    'HikeBike.HillShading',
    'Waymarked_Trails-Cycling',
    'Waymarked_Trails-Hiking'
];

BR.confLayers.legacyNameToIdMap = {
    'OpenStreetMap': 'standard',
    'OpenStreetMap.de': 'osm-mapnik-german_style',
    'OpenTopoMap': 'OpenTopoMap',
    'Esri World Imagery': 'Esri.WorldImagery',
    'Cycling (Waymarked Trails)': 'Waymarked_Trails-Cycling',
    'Hiking (Waymarked Trails)': 'Waymarked_Trails-Hiking'
};

BR.confLayers.leafletProvidersIncludeList = [
    'Stamen.Terrain',
    'MtbMap',
    'OpenStreetMap.CH',
    'HikeBike.HillShading',
    'Esri.WorldImagery'
];
