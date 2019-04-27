BR.confLayers = {};

BR.confLayers.defaultBaseLayers = [
    'standard',
    'osm-mapnik-german_style',
    'OpenTopoMap',
    'Stamen.Terrain',
    'Esri.WorldImagery'
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
