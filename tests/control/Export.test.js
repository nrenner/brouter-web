BR = {};
BR.conf = {};
$ = require('jquery');
require('leaflet');
turf = require('@turf/turf');
require('../../js/control/Export.js');
const fs = require('fs');

const indexHtmlString = fs.readFileSync('index.html', 'utf8');
const indexHtml = new DOMParser().parseFromString(indexHtmlString, 'text/html');

// &lonlats=8.467712,49.488117;8.469354,49.488394;8.470556,49.488946;8.469982,49.489176 + turnInstructionMode=2
const segments = require('./data/segments.json');
const brouterTotal = require('./data/brouterTotal.json');

// resolve intended/accepted differences before comparing
function adopt(total, brouterTotal) {
    // BRouter total aggregates messages over segments, client total does not,
    // but that's Ok, so just fix for the test comparison
    const messages = total.features[0].properties.messages;
    const message = messages[4].slice();
    messages[4] = message;
    message[3] = (+message[3] + +messages[2][3] + +messages[3][3]).toString();
    message[6] = (+message[6] + +messages[2][6] + +messages[3][6]).toString();
    messages.splice(2, 2);

    // fix minor float rounding difference
    total.features[0].properties.times[6] = 28.833; // 28.832

    total.features[0].properties.name = brouterTotal.features[0].properties.name;
}

let track;
const getLngCoord = (i) => track.features[i].geometry.coordinates[0];
const getProperty = (i, p) => track.features[i].properties[p];

beforeEach(() => {
    document.body = indexHtml.body.cloneNode(true);

    track = turf.featureCollection([
        turf.lineString([
            [0, 0],
            [1, 1],
            [2, 2],
        ]),
    ]);
});

test('total track', () => {
    const segmentsString = JSON.stringify(segments, null, 2);
    let total = BR.Export._concatTotalTrack(segments);
    adopt(total, brouterTotal);
    expect(total).toEqual(brouterTotal);

    // test original segments are not modified
    expect(JSON.stringify(segments, null, 2)).toEqual(segmentsString);

    // should be repeatable
    total = BR.Export._concatTotalTrack(segments);
    adopt(total, brouterTotal);
    expect(total).toEqual(brouterTotal);
});

test('include route points', () => {
    const latLngs = [L.latLng(0, 0), L.latLng(1, 1), L.latLng(2, 2)];
    const exportRoute = new BR.Export();

    exportRoute.update(latLngs, null);
    exportRoute._addRouteWaypoints(track);

    expect(track.features[0].geometry.type).toEqual('LineString');
    expect(getLngCoord(1)).toEqual(0);
    expect(getLngCoord(2)).toEqual(1);
    expect(getLngCoord(3)).toEqual(2);
    expect(getProperty(1, 'name')).toEqual('from');
    expect(getProperty(2, 'name')).toEqual('via1');
    expect(getProperty(3, 'name')).toEqual('to');
    expect(getProperty(1, 'type')).toEqual('from');
    expect(getProperty(2, 'type')).toEqual('via');
    expect(getProperty(3, 'type')).toEqual('to');
});

test('pois', () => {
    const markers = [
        {
            latlng: L.latLng(1, 1),
            name: 'poi 1',
        },
        {
            latlng: L.latLng(2, 2),
            name: 'poi 2',
        },
    ];
    const pois = { getMarkers: () => markers };
    const exportRoute = new BR.Export(null, pois, null);

    exportRoute._addPois(track);

    expect(track.features[0].geometry.type).toEqual('LineString');
    expect(getLngCoord(1)).toEqual(1);
    expect(getLngCoord(2)).toEqual(2);
    expect(getProperty(1, 'name')).toEqual('poi 1');
    expect(getProperty(2, 'name')).toEqual('poi 2');
    expect(getProperty(1, 'type')).toEqual('poi');
    expect(getProperty(2, 'type')).toEqual('poi');
});
