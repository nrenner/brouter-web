(function () {
    var hostname = window.location.hostname;
    var origin = window.location.protocol + '//' + hostname + (window.location.port ? ':' + window.location.port : '');

    BR.conf = {};

    // Switch for intermodal routing demo
    BR.conf.transit = false;
    // or as query parameter (index.html?transit=true#zoom=...)
    // (uses search/query (?) not hash (#) params, as config only executed once at load)
    // TODO not included in permalink (better replace permalink with hash plugin)
    //var params = new URLSearchParams(window.location.search.slice(1));
    //BR.conf.transit = params.has('transit') && (params.get('transit') === 'true');

    if (hostname.endsWith('brouter.de')) {
        // online service (brouter.de) configuration

        BR.conf.host = origin;
        BR.conf.profilesUrl = origin + '/brouter/profiles2/';
    } else {
        // desktop configuration

        BR.conf.host = 'http://localhost:17777';

        // Pre-loading selected profile disabled locally. Needs brouter-web to run on a
        // local web server with the profiles in a subdirectory or allowing file access
        // in the Browser (security!), see
        // https://github.com/mrdoob/three.js/wiki/How-to-run-things-locally
        BR.conf.profilesUrl = 'http://localhost:8000/profiles2/';
        //BR.conf.profilesUrl = 'file://YOUR_PATH_TO/profiles2/';
    }

    BR.conf.privacyPolicyUrl = '/privacypolicy.html';

    // Set the initial position and zoom level of the map
    BR.conf.initialMapLocation = [50.99, 9.86];
    BR.conf.initialMapZoom = 5;

    BR.conf.profiles = [
        'trekking',
        'fastbike',
        'car-eco',
        'car-fast',
        'safety',
        'shortest',
        'trekking-ignore-cr',
        'trekking-steep',
        'trekking-noferries',
        'trekking-nosteps',
        'moped',
        'rail',
        'river',
        'vm-forum-liegerad-schnell',
        'vm-forum-velomobil-schnell',
        'fastbike-lowtraffic',
        'fastbike-asia-pacific',
        'hiking-mountain',
    ];

    // Map old, renamed legacy profile to new name (from hash of shared or bookmarked URLs)
    BR.conf.profilesRename = {
        'hiking-beta': 'hiking-mountain',
    };

    // Removes default base layers when 'true'. Useful for only having custom layers (see below).
    BR.conf.clearBaseLayers = false;

    // Add custom tile layers
    // URL template see http://leafletjs.com/reference.html#tilelayer
    // Multiple entries separated by comma (,)
    BR.conf.baseLayers = {
        // 'display name': 'url'[,]
        // e.g. for offline tiles with https://github.com/develar/mapsforge-tile-server
        //'Mapsforge Tile Server': 'http://localhost:6090/{z}/{x}/{y}.png'
    };

    // Base layer to show on start, as position number in the layer switcher, starting from 0, default is first
    BR.conf.defaultBaseLayerIndex = 0;

    // Initial route line transparency (0-1, overridden by stored slider setting)
    BR.conf.defaultOpacity = 0.67;

    // Minimum transparency slider value on load, values between 0 and 1 (0=invisible).
    // 0 = no minimum, use stored setting; 1 = always reset to full visibility on load
    BR.conf.minOpacity = 0.3;

    BR.conf.routingStyles = {
        trailer: {
            weight: 5,
            dashArray: [10, 10],
            opacity: 0.6,
            color: 'magenta',
        },
        track: {
            weight: 5,
            color: 'magenta',
            opacity: BR.conf.defaultOpacity,
        },
        trackCasing: {
            weight: 8,
            color: 'white',
            // assumed to be same as track, see setOpacity
            opacity: BR.conf.defaultOpacity,
        },
        nodata: {
            color: 'darkred',
        },
        beeline: {
            weight: 5,
            dashArray: [1, 10],
            color: 'magenta',
            opacity: BR.conf.defaultOpacity,
        },
        beelineTrailer: {
            weight: 5,
            dashArray: [1, 10],
            opacity: 0.6,
            color: 'magenta',
        },
    };

    BR.conf.markerColors = {
        // awesome-markers colors (by color picker)
        poi: '#436978',
        start: '#72b026',
        via: '#38aadd',
        stop: '#d63e2a',
    };

    // transit (intermodal routing) demo config
    if (BR.conf.transit) {
        BR.conf.profiles = [
            '../im/bike',
            '../im/foot',
            '../im/like-bike',
            '../im/like-foot',
            'trekking',
            'fastbike',
            'shortest',
            'moped',
            'car-test',
        ];
    }

    // regex needs to be in sync with server, see ServerHandler.getTrackName()
    BR.conf.tracknameAllowedChars = 'a-zA-Z0-9 \\._\\-';

    BR.conf.overpassBaseUrl = 'https://overpass.kumi.systems/api/interpreter';

    // File size limit in kb for loading tracks
    BR.conf.trackSizeLimit = 1024 * 10;
})();
