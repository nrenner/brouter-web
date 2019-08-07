(function() {
    var touchScreen = (function() {
            var result = null;

            if ('maxTouchPoints' in navigator) {
                result = navigator.maxTouchPoints > 0;
            } else if (
                window.matchMedia &&
                window.matchMedia('(any-pointer:coarse),(any-pointer:fine),(any-pointer:none)').matches
            ) {
                result = window.matchMedia('(any-pointer:coarse)').matches;
            } else if ('msMaxTouchPoints' in navigator) {
                result = navigator.msMaxTouchPoints > 0;
            }

            return result;
        })(),
        touchScreenDetectable = touchScreen !== null,
        touch = touchScreenDetectable ? touchScreen : L.Browser.touch;

    BR.Browser = {
        touchScreen: touchScreen,
        touchScreenDetectable: touchScreenDetectable,
        touch: touch
    };
})();
