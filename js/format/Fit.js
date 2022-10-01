BR.Fit = {
    format: function (geoJson, turnInstructionMode = 0) {
        if (!geoJson?.features) return '';

        function calcDistance(p1, p2) {
            const [ilon1, ilat1] = btools.util.CheapRuler.toIntegerLngLat(p1);
            const [ilon2, ilat2] = btools.util.CheapRuler.toIntegerLngLat(p2);
            return btools.util.CheapRuler.distance(ilon1, ilat1, ilon2, ilat2);
        }

        const course = geoJson.features[0];
        const track = course.geometry.coordinates;
        const startPoint = track[0];
        const endPoint = track[track.length - 1];
        let trackStamps = course.properties.times || course.properties.coordTimes || [];
        let last = 0;
        trackStamps = trackStamps.map((stamp) => {
            stamp = Math.round(stamp); // FIT only support seconds
            // avoid strange & identical timestamps. This is required(?) for matching
            // of turn instructions with the route.
            if (stamp <= last) {
                stamp = last + 1;
            }
            last = stamp;
            // FIT epoch starts at 1989-12-31T00:00 - avoid wrapping
            return (631065600 + stamp) * 1000;
        });

        const encoder = new FITCourseFile(
            course.properties.name,
            trackStamps[0],
            course.properties['total-time'],
            startPoint,
            endPoint,
            course.properties['filtered-ascend']
        );
        let distanceTotal = 0;
        let distanceTillPoint = [0];
        encoder.point(trackStamps[0], track[0], track[0][2], 0);
        for (let i = 1; i < track.length; i++) {
            distanceTotal += calcDistance(track[i - 1], track[i]);
            distanceTillPoint[i] = distanceTotal;
            encoder.point(trackStamps[i], track[i], track[i][2], distanceTotal);
        }
        // Note 1: Mixing points and hints is also legal should some devices
        // require it - until then keep it simple.
        // Note 2: The distance inside the FIT files seems somewhat redundant.
        // Not sure if it is really required. May depend on the device?
        // Note 3: Can't use hint.distance that is the value to the next turn.
        const voiceHints = BR.voiceHints(geoJson, 2);
        voiceHints._loopHints((hint, cmd, coord) => {
            encoder.turn(
                trackStamps[hint.indexInTrack],
                coord,
                cmd.fit,
                cmd.fit === 'generic' ? cmd.message : undefined,
                distanceTillPoint[hint.indexInTrack]
            );
        });

        return encoder.finalize(trackStamps[trackStamps.length - 1]);
    },
};
