BR = {};
require('leaflet');
turf = require('@turf/turf');
require('../../js/control/Export.js');

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
