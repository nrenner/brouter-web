BR = {};
turf = require('@turf/turf');
togpx = require('togpx');
require('leaflet');
require('../../js/format/VoiceHints.js');
require('../../js/format/Gpx.js');

const fs = require('fs');

const geoJson = require('./data/track.json');
const path = 'tests/format/data/';

// resolve intended/accepted differences before comparing
function adoptGpx(gpx, replaceCreator = true) {
    const creator = 'togpx';
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
    gpx = gpx.replace(/(lon|lat)="([-0-9]+.[0-9]+?)0+"/g, '$1="$2"'); // remove trailing zeros
    gpx = gpx.replace('</gpx>\n', '</gpx>');

    return gpx;
}

function read(fileName, replaceCreator) {
    return BR.Gpx.pretty(adoptGpx(fs.readFileSync(path + fileName, 'utf8'), replaceCreator));
}

test('simple track', () => {
    const brouterGpx = read('track.gpx');
    const gpx = BR.Gpx.format(geoJson);
    expect(gpx).toEqual(brouterGpx);
});

describe('voice hints', () => {
    test('2-locus', () => {
        let brouterGpx = read('2-locus.gpx');
        brouterGpx = brouterGpx.replace(/<(\/?)locus:/g, '<$1'); // TODO 'locus:' namespace
        brouterGpx = brouterGpx.replace(/.0<\/rteDistance/g, '</rteDistance'); // ignore .0 decimal
        brouterGpx = brouterGpx.replace(/\n\s*<\/extensions>\n\s*<extensions>/, ''); // ignore (invalid) double tag

        const gpx = BR.Gpx.format(geoJson, 2);
        expect(gpx).toEqual(brouterGpx);
    });

    test('3-osmand', () => {
        const brouterGpx = read('3-osmand.gpx', false);
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
});
