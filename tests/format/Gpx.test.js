BR = {};
togpx = require('togpx');
require('../../js/format/Gpx.js');

const fs = require('fs');

const geoJson = require('./data/track.json');
const path = 'tests/format/data/';

// resolve intended/accepted differences before comparing
function adoptGpx(gpx) {
    const creator = 'togpx';
    const name = 'Track';
    const newline = '\n';

    gpx = gpx.replace('=.0', '=0.0');
    gpx = gpx.replace(/creator="[^"]*"/, `creator="${creator}"`);
    gpx = gpx.replace(`creator="${creator}" version="1.1"`, `version="1.1" \n creator="${creator}"`);
    gpx = gpx.replace(/<trk>\n  <name>[^<]*<\/name>/, `<trk>\n  <name>${name}</name>`);
    gpx = gpx
        .split(newline)
        .map((line) => line.replace(/lon="([^"]*)" lat="([^"]*)"/, 'lat="$2" lon="$1"'))
        .join(newline);
    gpx = gpx.replace(/0"><ele>/g, '"><ele>');
    gpx = gpx.replace('</gpx>\n', '</gpx>');

    return gpx;
}

function read(fileName) {
    return adoptGpx(fs.readFileSync(path + fileName, 'utf8'));
}

test('simple track', () => {
    const brouterGpx = read('track.gpx');
    const gpx = BR.Gpx.format(geoJson);
    expect(gpx).toEqual(brouterGpx);
});
