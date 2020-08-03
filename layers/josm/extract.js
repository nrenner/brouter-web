
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const outDir = __dirname;

const includeList = [
    "cyclosm",
    "osmbe",
    "osmbe-fr",
    "osmbe-nl",
    "osmfr-basque",
    "osmfr-breton",
    "osmfr-occitan",
    "OpenStreetMap-turistautak",
    "hu-hillshade",
    "Israel_Hiking",
    "Israel_MTB",
    "mtbmap-no",
    "Freemap.sk-Outdoor",
    "Freemap.sk-Car",
    "Freemap.sk-Hiking",
    "Freemap.sk-Cyclo",
    "opencylemap",
    "standard",
    "HDM_HOT",
    "osmfr",
    "osm-mapnik-german_style",
    "OpenTopoMap",
    "osm-cambodia_laos_thailand_vietnam-bilingual",
    "Waymarked_Trails-Hiking",
    "Waymarked_Trails-Cycling",
    "Waymarked_Trails-MTB",
    "wikimedia-map",
    "openpt_map"
];

function extract(layersJosm) {
    for (let i = 0; i < layersJosm.features.length; i++) {
        let layer = layersJosm.features[i];
        let props = layer.properties;
        let id = props.id;
        if (includeList.includes(id)) {
            //console.log(`${id}, ${props.name}, ${props.url}`);

            props.dataSource = 'JOSM';

            const outFileName = path.join(outDir, id + '.geojson');
            const data = JSON.stringify(layer, null, 2);
            fs.writeFileSync(outFileName, data);

            includeList.splice(includeList.indexOf(id), 1);
        }
    }

    if (includeList.length > 0) {
        console.warn('Layers not found: ', includeList);
    }
}

fetch('https://josm.openstreetmap.de/maps?format=geojson')
    .then(res => res.json())
    .then(json => extract(json))
    .catch(err => console.error(err));
