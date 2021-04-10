BR = {};
$ = require('jquery');
i18next = require('i18next');
require('leaflet');
require('../../js/control/Profile.js');
require('../../js/format/Gpx.js');

const fs = require('fs');

class CodeMirrorMock {
    static fromTextArea() {
        return new CodeMirrorMock();
    }
    setValue(value) {
        this.value = value;
    }
    getValue() {
        return this.value;
    }
    isClean() {
        return true;
    }
    markClean() {}
}
CodeMirror = CodeMirrorMock;

BR.Message = jest.fn();

const indexHtmlString = fs.readFileSync('index.html', 'utf8');
const indexHtml = new DOMParser().parseFromString(indexHtmlString, 'text/html');

function toggleSecondaryTab() {
    L.DomUtil.get('profile_params_container').classList.toggle('active');
    profile._activateSecondaryTab();
}

const profileText = `
---context:global   # following code refers to global config
# abc settings
assign isOne   = true  # %isOne% | first var | boolean
assign optTwo  = 2     # %varTwo% | second var | [0=none, 1=opt1, 2=opt2]
assign three   = 3     # %three% | third var | number
`;
const paramsHtml = `
 <input name="isOne" id="customize-profile-isOne" type="checkbox">
 <select name="optTwo" class="form-control form-control-sm" id="customize-profile-optTwo">
  <option value="0">none</option>
  <option value="1">opt1</option>
  <option value="2">opt2</option>
 </select>
 <input name="three" id="customize-profile-three" type="number" class="form-control form-control-sm">
`;

let profile;

beforeEach(() => {
    document.body = indexHtml.body.cloneNode(true);
    profile = new BR.Profile();
});

describe('getProfileVar', () => {
    test('with comment', () => {
        toggleSecondaryTab();
        profile._setValue(profileText);
        expect(profile.getProfileVar('isOne')).toEqual('true');
        expect(profile.getProfileVar('optTwo')).toEqual('2');
        expect(profile.getProfileVar('three')).toEqual('3');
    });

    test('without comment', () => {
        profile._setValue('   assign foo=1');
        const value = profile.getProfileVar('foo');
        expect(value).toEqual('1');
    });

    test('without "="', () => {
        profile._setValue('assign foo 1');
        const value = profile.getProfileVar('foo');
        expect(value).toEqual('1');
    });

    test('not defined', () => {
        profile._setValue('');
        const value = profile.getProfileVar('foo');
        expect(value).toEqual(undefined);
    });

    test('text undefined', () => {
        profile._setValue(undefined);
        const value = profile.getProfileVar('foo');
        expect(value).toEqual(undefined);
    });

    test('options tab active', () => {
        profile._setValue(profileText);
        document.getElementById('customize-profile-optTwo').value = '1';

        expect(profile.getProfileVar('isOne')).toEqual(true);
        expect(profile.getProfileVar('optTwo')).toEqual('1');
        expect(profile.getProfileVar('three')).toEqual('3');
    });
});

describe('getTransportMode', () => {
    test('bike true', () => {
        const profileText = `
# Bike profile
assign validForBikes = true

# comment`;
        profile._setValue(profileText);
        expect(profile.getTransportMode()).toEqual('bike');
    });

    test('car 1', () => {
        profile._setValue('assign validForCars 1');
        expect(profile.getTransportMode()).toEqual('car');
    });

    test('default foot', () => {
        profile._setValue('');
        expect(profile.getTransportMode()).toEqual('foot');
    });
});

test('_buildParamsForm', () => {
    profile._buildParamsForm(profileText);
    const getValue = (name) => {
        const input = document.getElementById('customize-profile-' + name);
        return input.type === 'checkbox' ? input.checked : input.value;
    };

    expect(getValue('isOne')).toEqual(true);
    expect(getValue('optTwo')).toEqual('2');
    expect(getValue('three')).toEqual('3');
});

test('_buildCustomProfile', () => {
    document.getElementById('profile_params').innerHTML = paramsHtml;
    document.getElementById('customize-profile-isOne').checked = true;
    document.getElementById('customize-profile-optTwo').value = '2';
    document.getElementById('customize-profile-three').value = '3';

    const result = profile._buildCustomProfile(profileText).split('\n');
    expect(result[3]).toMatch(/isOne   = true/);
    expect(result[4]).toMatch(/optTwo  = 2/);
    expect(result[5]).toMatch(/three   = 3/);
});
