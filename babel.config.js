module.exports = {
    presets: [['@babel/preset-env', {}]],
    sourceType: 'script',
    exclude: [/node_modules\/(?!overpass-layer\/).*/],
};
