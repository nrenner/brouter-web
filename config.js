(function() {

    var hostname = window.location.hostname;

    BR.conf = {};

    if (hostname === 'brouter.de' || hostname === 'h2096617.stratoserver.net') {

        // online service (brouter.de) configuration

        BR.conf.profiles = [
            'trekking',
            'fastbike',
            'shortest',
            'shortest-eudem',
            'all',
            /* "does not contain expressions for context node" (?)
             'softaccess',
             */
            'moped',
            'car-test',
            'vm-forum-liegerad-schnell',
            'vm-forum-velomobil-schnell'
        ];

    } else {

        // desktop configuration

        BR.conf.profiles = [
            'trekking',
            'fastbike',
            'shortest',
            'all',
            /* "does not contain expressions for context node" (?)
             'softaccess',
             */
            'moped',
            'car-test'
        ];

    }

})();
