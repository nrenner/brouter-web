BR.Csv = {
    format: function (geoJson) {
        const separator = '\t';
        const newline = '\n';
        const messages = geoJson.features[0].properties.messages;
        let csv = '';

        for (const entries of messages) {
            csv += entries.join(separator) + newline;
        }

        return csv;
    },
};
