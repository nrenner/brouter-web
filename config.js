(function() {

    var hostname = window.location.hostname;

    BR.conf = {};

    if (hostname === 'brouter.de' || hostname === 'h2096617.stratoserver.net') {

        // online service (brouter.de) configuration

        BR.conf.profiles = [
            'trekking',
            'fastbike',
            'car-test',
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
            'vm-forum-velomobil-schnell'
        ];

        BR.conf.host = 'http://h2096617.stratoserver.net:443';
        BR.conf.profilesUrl = 'http://brouter.de/brouter/profiles2/';

    } else {

        // desktop configuration

        BR.conf.profiles = [
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

})();
