/* Generated from Java with JSweet 3.1.0 - http://www.jsweet.org */
//var btools;
btools = {};
(function (btools) {
    var util;
    (function (util) {
        class CheapRuler {
            static __static_initialize() {
                if (!CheapRuler.__static_initialized) {
                    CheapRuler.__static_initialized = true;
                    CheapRuler.__static_initializer_0();
                }
            }
            static DEG_TO_RAD_$LI$() {
                CheapRuler.__static_initialize();
                if (CheapRuler.DEG_TO_RAD == null) {
                    CheapRuler.DEG_TO_RAD = Math.PI / 180.0;
                }
                return CheapRuler.DEG_TO_RAD;
            }
            static SCALE_CACHE_$LI$() {
                CheapRuler.__static_initialize();
                if (CheapRuler.SCALE_CACHE == null) {
                    CheapRuler.SCALE_CACHE = ((s) => {
                        let a = [];
                        while (s-- > 0) a.push(null);
                        return a;
                    })(CheapRuler.SCALE_CACHE_LENGTH);
                }
                return CheapRuler.SCALE_CACHE;
            }
            static __static_initializer_0() {
                for (let i = 0; i < CheapRuler.SCALE_CACHE_LENGTH; i++) {
                    {
                        CheapRuler.SCALE_CACHE_$LI$()[i] = CheapRuler.calcKxKyFromILat(
                            i * CheapRuler.SCALE_CACHE_INCREMENT + ((CheapRuler.SCALE_CACHE_INCREMENT / 2) | 0)
                        );
                    }
                }
            }
            /*private*/ static calcKxKyFromILat(ilat) {
                const lat = CheapRuler.DEG_TO_RAD_$LI$() * (ilat * CheapRuler.ILATLNG_TO_LATLNG - 90);
                const cos = Math.cos(lat);
                const cos2 = 2 * cos * cos - 1;
                const cos3 = 2 * cos * cos2 - cos;
                const cos4 = 2 * cos * cos3 - cos2;
                const cos5 = 2 * cos * cos4 - cos3;
                const kxky = [0, 0];
                kxky[0] =
                    (111.41513 * cos - 0.09455 * cos3 + 1.2e-4 * cos5) *
                    CheapRuler.ILATLNG_TO_LATLNG *
                    CheapRuler.KILOMETERS_TO_METERS;
                kxky[1] =
                    (111.13209 - 0.56605 * cos2 + 0.0012 * cos4) *
                    CheapRuler.ILATLNG_TO_LATLNG *
                    CheapRuler.KILOMETERS_TO_METERS;
                return kxky;
            }
            /**
             * Calculate the degree-&gt;meter scale for given latitude
             *
             * @return {double[]} [lon-&gt;meter,lat-&gt;meter]
             * @param {number} ilat
             */
            static getLonLatToMeterScales(ilat) {
                return CheapRuler.SCALE_CACHE_$LI$()[(ilat / CheapRuler.SCALE_CACHE_INCREMENT) | 0];
            }
            /**
             * Compute the distance (in meters) between two points represented by their
             * (integer) latitude and longitude.
             *
             * @param {number} ilon1   Integer longitude for the start point. this is (longitude in degrees + 180) * 1e6.
             * @param {number} ilat1   Integer latitude for the start point, this is (latitude + 90) * 1e6.
             * @param {number} ilon2   Integer longitude for the end point, this is (longitude + 180) * 1e6.
             * @param {number} ilat2   Integer latitude for the end point, this is (latitude + 90) * 1e6.
             * @return        {number} The distance between the two points, in meters.
             *
             * Note:
             * Integer longitude is ((longitude in degrees) + 180) * 1e6.
             * Integer latitude is ((latitude in degrees) + 90) * 1e6.
             */
            static distance(ilon1, ilat1, ilon2, ilat2) {
                const kxky = CheapRuler.getLonLatToMeterScales((ilat1 + ilat2) >> 1);
                const dlon = (ilon1 - ilon2) * kxky[0];
                const dlat = (ilat1 - ilat2) * kxky[1];
                return Math.sqrt(dlat * dlat + dlon * dlon);
            }
        }
        CheapRuler.__static_initialized = false;
        /**
         * Cheap-Ruler Java implementation
         * See
         * https://blog.mapbox.com/fast-geodesic-approximations-with-cheap-ruler-106f229ad016
         * for more details.
         *
         * Original code is at https://github.com/mapbox/cheap-ruler under ISC license.
         *
         * This is implemented as a Singleton to have a unique cache for the cosine
         * values across all the code.
         */
        CheapRuler.ILATLNG_TO_LATLNG = 1.0e-6;
        CheapRuler.KILOMETERS_TO_METERS = 1000;
        CheapRuler.SCALE_CACHE_LENGTH = 1800;
        CheapRuler.SCALE_CACHE_INCREMENT = 100000;
        util.CheapRuler = CheapRuler;
        CheapRuler['__class'] = 'btools.util.CheapRuler';
    })((util = btools.util || (btools.util = {})));
})(btools || (btools = {}));
btools.util.CheapRuler.__static_initialize();

btools.util.CheapRuler.toIntegerLngLat = (coordinate) => {
    const ilon = Math.round((coordinate[0] + 180) * 1e6);
    const ilat = Math.round((coordinate[1] + 90) * 1e6);

    return [ilon, ilat];
};

btools.util.CheapRuler.calcDistance = (ilon1, ilat1, ilon2, ilat2) => {
    const distanceFloat = btools.util.CheapRuler.distance(ilon1, ilat1, ilon2, ilat2);

    // Convert to integer (no decimals) values to match BRouter OsmPathElement.calcDistance:
    // `(int)(CheapRuler.distance(ilon, ilat, p.getILon(), p.getILat()) + 1.0 );`
    // https://github.com/abrensch/brouter/blob/1640bafa800f8bab7aebde797edc99fdbeea3b07/brouter-core/src/main/java/btools/router/OsmPathElement.java#L81
    return Math.trunc(distanceFloat + 1.0);
};
