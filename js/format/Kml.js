BR.Kml = {
    format(geoJson) {
        // don't export properties as <ExtendedData>, probably no need for it
        geoJson.features[0].properties = { name: geoJson.features[0].properties.name };
        return BR.Xml.pretty(tokml(geoJson));
    },
};
