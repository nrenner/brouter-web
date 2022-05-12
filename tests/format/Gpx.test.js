BR = {};
BR.version = '1.5.1';
turf = require('@turf/turf');
togpx = require('togpx');
require('leaflet');
require('../../js/Browser.js');
require('../../js/format/VoiceHints.js');
require('../../js/format/Xml.js');
require('../../js/format/Gpx.js');

const fs = require('fs');

// lonlats=8.467712,49.488117;8.470598,49.488849 + turnInstructionMode = 4 (comment-style)
const geoJson = require('./data/track.json');
// lonlats=8.467712,49.488117;8.469354,49.488394;8.470556,49.488946;8.469982,49.489176 + turnInstructionMode = 5
// console log in Export._formatTrack
const waypointsGeoJson = require('./data/waypoints.json');
const path = 'tests/format/data/';

// resolve intended/accepted differences before comparing
function adoptGpx(gpx, replaceCreator = true) {
    const creator = 'BRouter-Web 1.5.1';
    const name = 'Track';
    const newline = '\n';

    gpx = gpx.replace('=.0', '=0.0');
    if (replaceCreator) {
        gpx = gpx.replace(/creator="[^"]*"/, `creator="${creator}"`);
    }
    gpx = gpx.replace(/creator="([^"]*)" version="1.1"/, 'version="1.1" \n creator="$1"');
    gpx = gpx.replace(/<trk>\n  <name>[^<]*<\/name>/, `<trk>\n  <name>${name}</name>`);
    gpx = gpx
        .split(newline)
        .map((line) => line.replace(/lon="([^"]*)" lat="([^"]*)"/, 'lat="$2" lon="$1"'))
        .join(newline);
    gpx = gpx.replace(/(lon|lat)="([-0-9]+\.[0-9]+?)0+"/g, '$1="$2"'); // remove trailing zeros
    gpx = gpx.replace(/>([-0-9]+\.\d*0+)<\//g, (match, p1) => `>${+p1}</`); // remove trailing zeros
    gpx = gpx.replace('</gpx>\n', '</gpx>');

    return gpx;
}

function read(fileName, replaceCreator) {
    return adoptGpx(fs.readFileSync(path + fileName, 'utf8'), replaceCreator);
}

test('simple track', () => {
    const brouterGpx = read('track.gpx');
    const gpx = BR.Gpx.format(geoJson);
    expect(gpx).toEqual(brouterGpx);
});

test('waypoints', () => {
    const brouterGpx = BR.Xml.pretty(read('waypoints.gpx'));
    const gpx = BR.Gpx.format(waypointsGeoJson, 5);
    expect(gpx).toEqual(brouterGpx);
});

describe('voice hints', () => {
    test('2-locus', () => {
        let brouterGpx = BR.Xml.pretty(read('2-locus.gpx'));
        brouterGpx = brouterGpx.replace(/\n\s*<\/extensions>\n\s*<extensions>/, ''); // ignore (invalid) double tag
        // ignore float rounding differences
        brouterGpx = brouterGpx.replace(
            /:(rteTime|rteSpeed)>([\d.]*)<\//g,
            (match, p1, p2) => `:${p1}>${(+p2).toFixed(3)}</`
        );
        // ignore off by one due to times passed with 3 decimals
        brouterGpx = brouterGpx.replace('rteSpeed>9.361<', 'rteSpeed>9.360<');

        const gpx = BR.Gpx.format(geoJson, 2);
        expect(gpx).toEqual(brouterGpx);
    });

    test('3-osmand', () => {
        const brouterGpx = BR.Xml.pretty(read('3-osmand.gpx', false));
        const gpx = BR.Gpx.format(geoJson, 3);
        expect(gpx).toEqual(brouterGpx);
    });

    test('4-comment', () => {
        let brouterGpx = read('4-comment.gpx');
        brouterGpx = brouterGpx.replace(/;\s*([-0-9]+.[0-9]+?)0+;/g, (match, p1) => `;${p1.padStart(10)};`); // remove trailing zeros

        const gpx = BR.Gpx.format(geoJson, 4);
        expect(gpx).toEqual(brouterGpx);
    });

    test('5-gpsies', () => {
        const brouterGpx = read('5-gpsies.gpx');
        const gpx = BR.Gpx.format(geoJson, 5);
        expect(gpx).toEqual(brouterGpx);
    });

    test('6-orux', () => {
        let brouterGpx = BR.Xml.pretty(read('6-orux.gpx'));
        const gpx = BR.Gpx.format(geoJson, 6);
        expect(gpx).toEqual(brouterGpx);
    });
});
