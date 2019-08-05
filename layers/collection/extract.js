
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const outDir = __dirname;

var includeList = [
    "1016", // 4UMaps
    "1065", // Hike & Bike Map
    "1061", // Thunderforest Outdoors
    "1021", // kosmosnimki.ru
    "1017", // sputnik.ru
    "1023", // Osmapa.pl - Mapa OpenStreetMap Polska
    "1010", // OpenStreetMap.se (Hydda.Full)
    "1069", // MRI (maps.refuges.info),
    "1059"  // ÖPNV Karte
];

function extract(constantsJs) {
    eval(constantsJs);

    for (let i = 0; i < includeList.length; i++) {
        let id = includeList[i];

        let layer = getLayerDataByID(id);
        if (!layer) {
            console.warn('Layer not found: ' + id);
            continue;
        }
        //console.log(`${layer.id}, ${layer.name}, ${layer.address}`);

        layer.url = layer.address;
        delete layer.address;

        let geoJson = {
            geometry: null,
            properties: layer,
            type: "Feature"
        };
        geoJson.properties.dataSource = 'LayersCollection';

        const outFileName = path.join(outDir, layer.id + '.geojson');
        const data = JSON.stringify(geoJson, null, 2);
        fs.writeFileSync(outFileName, data);
    }
}

// https://github.com/Edward17/LayersCollection/blob/gh-pages/constants.js
fetch('http://edward17.github.io/LayersCollection/constants.js')
    .then(res => res.text())
    .then(text => extract(text))
    .catch(err => console.error(err));
