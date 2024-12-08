/**
 * @jest-environment jsdom
 */

BR = {};
BR.conf = {};
$ = require('jquery');
require('leaflet');
turf = require('@turf/turf');
require('../../js/Browser.js');
require('../../js/control/Export.js');
const fs = require('fs');

const indexHtmlString = fs.readFileSync('index.html', 'utf8');
const indexHtml = new DOMParser().parseFromString(indexHtmlString, 'text/html');

// Geojson results created by server for
//  * lonlats=8.467712,49.488117;8.469354,49.488394;8.470556,49.488946;8.469982,49.489176
//  * with turnInstructionMode=2
//
// a) Each segment separate
//   * curl "https://brouter.de/brouter?lonlats=8.467712,49.488117|8.469354,49.488394&profile=trekking&alternativeidx=0&format=geojson&profile:turnInstructionMode=2"
//  * repeated for each segment and copied together
const segments = require('./data/segments.json');
// b) All segments in a single request
//   * curl "https://brouter.de/brouter?lonlats=8.467712,49.488117|8.469354,49.488394|8.470556,49.488946|8.469982,49.489176&profile=trekking&alternativeidx=0&format=geojson&profile:turnInstructionMode=2" > ./data/segments.json
const brouterTotal = require('./data/brouterTotal.json');

function allowRoundigDifference(obj, field, client, brouter) {
    if (obj[field] === client) {
        obj[field] = brouter;
    }
}

// resolve intended/accepted differences before comparing
function adopt(total, brouterTotal) {
    // BRouter total aggregates messages over segments, client total does not,
    // but that's Ok, so just fix for the test comparison
    let messages = total.features[0].properties.messages;

    // Time & Energy are totals: Client restart those at segment boundary
    let offsetTime = 0,
        offsetEnergy = 0;
    for (let i = 1; i < messages.length; i++) {
        // 3 - distance, 9 - WayTags, 11 - Time, 12 - Energy
        let message = messages[i].slice();
        messages[i] = message;
        if (message[9] === messages[i - 1][9]) {
            messages[i - 1][3] = (+message[3] + +messages[i - 1][3]).toString();
            offsetTime = +messages[i - 1][11];
            messages[i - 1][11] = (+message[11] + +messages[i - 1][11]).toString();
            offsetEnergy = +messages[i - 1][12];
            messages[i - 1][12] = (+message[12] + +messages[i - 1][12]).toString();
            messages.splice(i, 1);
            i--;
        } else {
            message[11] = (+message[11] + offsetTime).toString();
            message[12] = (+message[12] + offsetEnergy).toString();
        }
    }

    allowRoundigDifference(total.features[0].properties, 'total-energy', '6835', '6837');
    allowRoundigDifference(total.features[0].properties, 'total-time', '69', '68');
    allowRoundigDifference(total.features[0].properties, 'filtered ascend', '3', '2');
    allowRoundigDifference(total.features[0].properties, 'plain-ascend', '2', '-1');

    allowRoundigDifference(total.features[0].properties.messages[2], 11, '41', '42');
    allowRoundigDifference(total.features[0].properties.messages[2], 12, '4201', '4202');
    allowRoundigDifference(total.features[0].properties.messages[3], 11, '57', '58');
    allowRoundigDifference(total.features[0].properties.messages[3], 12, '5817', '5818');
    allowRoundigDifference(total.features[0].properties.messages[4], 11, '66', '68');
    allowRoundigDifference(total.features[0].properties.messages[4], 12, '6835', '6837');

    allowRoundigDifference(total.features[0].properties.times, 7, 58.182, 58.183);
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

test('hint distance fix', () => {
    const segmentsCopy = JSON.parse(JSON.stringify(segments, null, 2));

    // general case already tested

    // special case: second segment without hint
    segmentsCopy[1].feature.properties.voicehints = null;
    let total = BR.Export._concatTotalTrack(segmentsCopy);
    expect(total.features[0].properties.voicehints[0][3]).toEqual(294);
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
