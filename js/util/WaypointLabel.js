BR.WaypointLabel = L.Class.extend({
    statics: {
        getLabel: (numericLabel) => {
            let result = '';

            while (numericLabel > 0) {
                let remainder = (numericLabel - 1) % 26;
                result = String.fromCharCode(65 + remainder) + result;
                numericLabel = Math.floor((numericLabel - 1) / 26);
            }

            return result;
        },
    },
});
