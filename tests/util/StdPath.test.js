BR = {};
require('../../js/util/CheapRuler.js');
require('../../js/util/StdPath.js');

const geoJson = require('../format/data/track.json');

test('simple track', () => {
    const coordinates = geoJson.features[0].geometry.coordinates;
    const properties = geoJson.features[0].properties;
    const dummyProfileVars = {
        getProfileVar(name) {
            const vars = { validForBikes: 1 };
            return vars[name];
        },
    };
    const rc = new BR.RoutingContext(dummyProfileVars);
    const stdPath = new BR.StdPath();

    for (let i = 0; i < coordinates.length; i++) {
        if (i === 0) continue;

        const coord1 = coordinates[i - 1];
        const coord2 = coordinates[i];

        const [ilon1, ilat1] = btools.util.CheapRuler.toIntegerLngLat(coord1);
        const [ilon2, ilat2] = btools.util.CheapRuler.toIntegerLngLat(coord2);

        const distance = btools.util.CheapRuler.calcDistance(ilon1, ilat1, ilon2, ilat2);
        const deltaHeight = coord2[2] - coord1[2];

        stdPath.computeKinematic(rc, distance, deltaHeight, true);
    }

    expect(Math.round(stdPath.getTotalEnergy())).toEqual(+properties['total-energy']);
    expect(Math.round(stdPath.getTotalTime())).toEqual(+properties['total-time']);
});
