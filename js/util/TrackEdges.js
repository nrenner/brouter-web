/**
 * The track messages and track analysis panels share some functionality
 * which is defined in this class to prevent code duplication.
 *
 * @type {L.Class}
 */
BR.TrackEdges = L.Class.extend({
    /**
     * List of indexes for the track array where
     * a segment with different features ends
     *
     * @type {number[]}
     * @see BR.TrackMessages
     */
    edges: [],

    /**
     * @param {Array} segments
     */
    initialize: function(segments) {
        this.edges = this.getTrackEdges(segments);
    },

    /**
     * Find the indexes where a track segment ends, i.e. where the waytags change.
     *
     * Used in TrackMessages and TrackAnalysis for highlighting track segments.
     *
     * @param {Array} segments
     *
     * @return {number[]}
     */
    getTrackEdges: function(segments) {
        var messages,
            segLatLngs,
            length,
            si,
            mi,
            latLng,
            i,
            segIndex,
            baseIndex = 0,
            edges = [];

        // track latLngs index for end node of edge
        for (si = 0; si < segments.length; si++) {
            messages = segments[si].feature.properties.messages;
            segLatLngs = segments[si].getLatLngs();
            length = segLatLngs.length;
            segIndex = 0;

            for (mi = 1; mi < messages.length; mi++) {
                latLng = this.getMessageLatLng(messages[mi]);

                for (i = segIndex; i < length; i++) {
                    if (latLng.equals(segLatLngs[i])) {
                        break;
                    }
                }
                if (i === length) {
                    i = length - 1;
                }

                segIndex = i + 1;
                edges.push(baseIndex + i);
            }
            baseIndex += length;
        }

        return edges;
    },

    getMessageLatLng: function(message) {
        var lon = message[0] / 1000000,
            lat = message[1] / 1000000;

        return L.latLng(lat, lon);
    }
});
