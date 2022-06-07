BR = {};
$ = require('jquery');
i18next = require('i18next');
require('bootstrap');
require('bootstrap-select');
require('leaflet');

require('../../config.js');
require('../../js/Util.js');
require('../../js/router/BRouter.js');
require('../../js/control/RoutingOptions.js');

const fs = require('fs');
const indexHtmlString = fs.readFileSync('index.html', 'utf8');
const indexHtml = new DOMParser().parseFromString(indexHtmlString, 'text/html');

let defaultProfile;

beforeEach(() => {
    document.body = indexHtml.body.cloneNode(true);
    location.hash = '';
    // as used in BRouter.getUrlParams
    defaultProfile = BR.conf.profiles[0];
});

describe('Profile selection', () => {
    test('sets default profile (trekking) when no hash and no localStorage entry', () => {
        let routingOptions = new BR.RoutingOptions();
        routingOptions.setOptions({});
        const profile = routingOptions.getOptions().profile;
        expect(profile).toEqual(defaultProfile);
    });

    // defaults are not set in hash, see BRouter.getUrlParams
    test('sets default profile (trekking) when hash without `profile` param regardless of localStorage', () => {
        location.hash = '#map=5/50.986/9.822/standard';
        localStorage.routingprofile = 'shortest';

        let routingOptions = new BR.RoutingOptions();
        routingOptions.setOptions({});
        const profile = routingOptions.getOptions().profile;
        expect(profile).toEqual(defaultProfile);
    });

    test('sets profile from hash', () => {
        location.hash = '#map=5/50.986/9.822/standard&profile=fastbike';
        localStorage.routingprofile = 'shortest';

        let routingOptions = new BR.RoutingOptions();
        routingOptions.setOptions({ profile: 'fastbike' });
        const profile = routingOptions.getOptions().profile;
        expect(profile).toEqual('fastbike');
    });

    test('sets profile from localStorage when no hash', () => {
        localStorage.routingprofile = 'shortest';

        let routingOptions = new BR.RoutingOptions();
        routingOptions.setOptions({});
        const profile = routingOptions.getOptions().profile;
        expect(profile).toEqual('shortest');
    });
});
