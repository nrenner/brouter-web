require('../../js/util/CheapRuler.js');
const geoJson = require('../format/data/track.json');

test('distance', () => {
    // https://github.com/abrensch/brouter/issues/3#issuecomment-440375918
    const lngLat1 = [2.3158, 48.8124];
    const lngLat2 = [2.321, 48.8204];

    const [ilon1, ilat1] = btools.util.CheapRuler.toIntegerLngLat(lngLat1);
    const [ilon2, ilat2] = btools.util.CheapRuler.toIntegerLngLat(lngLat2);

    const distance = btools.util.CheapRuler.distance(ilon1, ilat1, ilon2, ilat2);

    // 968.1670119067338 - issue #3 (App.java)
    // 968.0593622374572 - CheapRuler.java
    expect(distance).toBeCloseTo(968.0593622374572);
});

test('total distance', () => {
    const coordinates = geoJson.features[0].geometry.coordinates;
    const properties = geoJson.features[0].properties;
    let totalDistance = 0;

    for (let i = 0; i < coordinates.length; i++) {
        if (i === 0) continue;

        const coord1 = coordinates[i - 1];
        const coord2 = coordinates[i];

        const [ilon1, ilat1] = btools.util.CheapRuler.toIntegerLngLat(coord1);
        const [ilon2, ilat2] = btools.util.CheapRuler.toIntegerLngLat(coord2);

        const distance = btools.util.CheapRuler.calcDistance(ilon1, ilat1, ilon2, ilat2);
        totalDistance += distance;
    }

    expect(Math.round(totalDistance)).toEqual(+properties['track-length']);
});
