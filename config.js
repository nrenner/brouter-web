(function() {

    var hostname = window.location.hostname;

    BR.conf = {};

    if (hostname === 'brouter.de' || hostname === 'h2096617.stratoserver.net') {

        // online service (brouter.de) configuration

        BR.conf.profiles = [
            '../im/bike',
            '../im/foot',
            '../im/like-bike',
            '../im/like-foot',
            'trekking',
            'fastbike',
            'shortest',
            'moped',
            'car-test'
        ];

        BR.conf.host = 'http://h2096617.stratoserver.net:443';
        BR.conf.profilesUrl = 'http://brouter.de/brouter/profiles2/';

    } else {

        // desktop configuration

        BR.conf.profiles = [
            '../im/bike',
            '../im/foot',
            '../im/like-bike',
            '../im/like-foot',
            'trekking',
            'fastbike',
            'shortest',
            'moped',
            'car-test'
        ];

        BR.conf.host = 'http://localhost:17777';

        // Pre-loading selected profile disabled locally. Needs brouter-web to run on a
        // local web server with the profiles in a subdirectory or allowing file access 
        // in the Browser (security!), see
        // https://github.com/mrdoob/three.js/wiki/How-to-run-things-locally
        //BR.conf.profilesUrl = 'http://localhost:8000/profiles2/';
        //BR.conf.profilesUrl = 'file://YOUR_PATH_TO/profiles2/';
    }

    // COPYING: Please get your own Bing maps key at http://www.microsoft.com/maps/default.aspx
    //BR.conf.bingKeyUrl = 'bingkey.txt';
    // External URL for key retrieval, does not work locally on desktop
    BR.conf.bingKeyUrl = 'http://norbertrenner.de/key/bing.php';

    // Add custom tile layers
    // URL template see http://leafletjs.com/reference.html#tilelayer
    // Multiple entries separated by comma (,)
    BR.conf.baseLayers = {
        // 'display name': 'url'[,]
        // e.g. for offline tiles with https://github.com/develar/mapsforge-tile-server
        //'Mapsforge Tile Server': 'http://localhost:6090/{z}/{x}/{y}.png'
    };

    // Minimum transparency slider value on load, values between 0 and 1 (0=invisible).
    // 0 = no minimum, use stored setting; 1 = always reset to full visibility on load
    BR.conf.minOpacity = 0.3;
})();
