require('../../js/util/CheapRuler.js');

test('distance', () => {
    // https://github.com/abrensch/brouter/issues/3#issuecomment-440375918
    const latlng1 = [48.8124, 2.3158];
    const latlng2 = [48.8204, 2.321];

    const ilon1 = (latlng1[1] + 180) * 1e6;
    const ilat1 = (latlng1[0] + 90) * 1e6;
    const ilon2 = (latlng2[1] + 180) * 1e6;
    const ilat2 = (latlng2[0] + 90) * 1e6;

    const distance = btools.util.CheapRuler.distance(ilon1, ilat1, ilon2, ilat2);

    // 968.1670119067338 - issue #3 (App.java)
    // 968.0593622374572 - CheapRuler.java
    expect(distance).toBeCloseTo(968.0593622374572);
});
