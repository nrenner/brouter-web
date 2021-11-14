BR.Search = class extends L.Control.Geocoder {
    constructor(options) {
        super(
            Object.assign(
                {
                    geocoder: new L.Control.Geocoder.LatLng({
                        next: new L.Control.Geocoder.Nominatim({
                            serviceUrl: 'https://nominatim.openstreetmap.org/',
                        }),
                        sizeInMeters: 800,
                    }),
                    position: 'topleft',
                    expand: 'click',
                    shortcut: {
                        search: 70, // char code for 'f'
                    },
                    placeholder: i18next.t('map.geocoder-placeholder'),
                },
                options
            )
        );

        L.DomEvent.addListener(document, 'keydown', this._keydownListener, this);
    }

    markGeocode(result) {
        this._map.fitBounds(result.geocode.bbox, {
            maxZoom: 17,
        });

        this.clear();
        this._geocodeMarker = new L.CircleMarker(result.geocode.center, {
            interactive: false,
            color: 'red',
            opacity: 1,
            weight: 3,
        }).addTo(this._map);

        return this;
    }

    clear() {
        if (this._geocodeMarker) {
            this._map.removeLayer(this._geocodeMarker);
        }
    }

    _keydownListener(e) {
        if (BR.Util.keyboardShortcutsAllowed(e) && e.keyCode === this.options.shortcut.search) {
            $('#map .leaflet-control-geocoder')[0].dispatchEvent(new MouseEvent('click'));
            e.preventDefault();
        }
    }

    /* Search favorites handling */
    onAdd(map) {
        if (!BR.Util.localStorageAvailable()) return super.onAdd(map);

        let container = super.onAdd(map);
        new SearchFavorites(this, container);
        return container;
    }
};

class SearchFavorites {
    constructor(geocoder, container) {
        //because eslint does not support instance var declaration
        this.searchInput = undefined;
        this.autocompleteContainer = undefined;
        this.autocompleteSelect = undefined;
        this.autocompleteMenu = undefined;
        this.geocoderForm = undefined;
        this.geocoder = undefined;
        this.favElements = undefined;
        this.isFiltered = true;
        this.arFavitems = [];
        this.arFavitemsLC = [];

        this.geocoder = geocoder;
        this.searchInput = $(container).find('.leaflet-control-geocoder-form input[type=text]');
        this.searchInput.after(`<span class="search-fav-ctrls btn-group btn-group-sm">
				<button 	id="search-fav-add"  
					title="${i18next.t('searchfav.addfavorite')}" 
					class="fa fa-star-o  border-0">
				</button><button 	data-toggle="collapse" 
					href="#search-autocomplete-container"  
					id="search-fav-expand" 
					title="${i18next.t('searchfav.openfavorites')}"  
					class="fa fa-angle-double-down  border-0">
				</button>
			</span>
		`);

        //otherwise parent catches event and click is never fired
        $(container)
            .find('.leaflet-control-geocoder-form .search-fav-ctrls')
            .on('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
            });

        $(container)
            .find('.leaflet-control-geocoder-form .search-fav-ctrls')
            .click((e) => this.onCtrlsClick(e));

        $(container).find('.leaflet-control-geocoder-form').append(`
			<div class="collapse autocomplete-container filtered" id="search-autocomplete-container">
				<div class="autocomplete-select-container">
					<div class="list-group autocomplete-select" id="search-autocomplete-select" ></div>
				</div>
				<div class="autocomplete-menu  bg-light rounded-bottom">
					<div id="search-fav-menu-toggle" class="" data-toggle="collapse" href="#autocomplete-btngroup">
					 <span class="bt-more align-top">...</span>
					</div>
				  <div class="btn-group btn-group-sm collapse" id="autocomplete-btngroup">
						<button id="search-fav-deleteall"  
							title="${i18next.t('searchfav.removeall')}"  
							class="fa fa-eraser  border">
						</button>
						<button id="search-fav-export"  
							title="${i18next.t('searchfav.export')}"  
							class="fa fa-floppy-o  border">
						</button>
						<button id="search-fav-import"
							class="fa fa-folder-open-o  border"
							title="${i18next.t('searchfav.import')}" >
								<input id="search-fav-file" type="file" class="d-none" accept=".json">
						</button>
				  </div>
				</div>				
		`);

        this.autocompleteContainer = $(container).find('#search-autocomplete-container');
        this.autocompleteSelect = this.autocompleteContainer.find('#search-autocomplete-select');
        this.autocompleteMenu = this.autocompleteContainer.find('#autocomplete-btngroup');
        this.geocoderForm = $(container).find('.leaflet-control-geocoder-form');

        this.autocompleteContainer.on('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();
        });

        this.autocompleteContainer.find('#search-fav-menu-toggle').on('mousedown touchend', (e) => {
            e.stopPropagation();
            e.preventDefault();
        });

        this.autocompleteContainer.find('#search-fav-menu-toggle').on('click touchend', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.autocompleteMenu.collapse('toggle');
        });

        this.autocompleteContainer.find('.autocomplete-select-container').on('wheel', (e) => {
            e.stopPropagation();
        });

        this.autocompleteContainer.on('shown.bs.collapse', (e) => this.geocoderForm.addClass('stayvisible'));
        this.autocompleteContainer.on('hidden.bs.collapse', (e) => {
            this.geocoderForm.removeClass('stayvisible');
            this.autocompleteMenu.collapse('hide');
        });

        this.autocompleteSelect.click((e) => this.onFavItemClicked(e));

        this.autocompleteContainer.find('.autocomplete-menu').click((e) => this.onFavMenuClicked(e));
        this.autocompleteContainer.find('#search-fav-file').on('change', (e) => this.onImportFavFile(e));

        let strFavitems = localStorage['searchFavItems'];
        if (strFavitems) {
            this.arFavitems = JSON.parse(strFavitems);
            this.arFavitemsLC = this.arFavitems.map((x) => x.toLowerCase()); //copy to Lowercase
        }

        this.updateFavList();

        this.searchInput.on('keyup', (e) => this.onInput(e));
    }

    updateFavList() {
        if (this.arFavitems.length > 0) {
            let opts = this.arFavitems.join(
                '</button><button class="list-group-item list-group-item-action rounded-0 favitem"><span class="fa fa-trash-o mr-1 del-favitem"></span>'
            );
            this.autocompleteSelect.html(
                `<button class="list-group-item list-group-item-action rounded-0 favitem"><span class="fa fa-trash-o mr-1 del-favitem"></span>${opts}</button>`
            );
        } else this.autocompleteSelect.empty();

        this.favElements = this.autocompleteSelect.find('button');
    }

    appendFavorite(strFav) {
        if (strFav === '') {
            return;
        }
        this.arFavitems.push(strFav);

        this.arFavitems = [...new Set(this.arFavitems)]; //remove duplicates
        this.arFavitems.sort();
        this.arFavitemsLC = this.arFavitems.map((x) => x.toLowerCase()); //copy to Lowercase

        localStorage['searchFavItems'] = JSON.stringify(this.arFavitems);
        this.updateFavList();
    }

    deleteFavorite(strFav) {
        let pos = this.arFavitems.indexOf(strFav);
        if (pos >= 0) {
            this.arFavitems.splice(pos, 1);
            this.arFavitems = [...new Set(this.arFavitems)]; //remove duplicates
            this.arFavitems.sort();
            this.arFavitemsLC = this.arFavitems.map((x) => x.toLowerCase()); //copy to Lowercase

            localStorage['searchFavItems'] = JSON.stringify(this.arFavitems);

            this.updateFavList();
        }
    }

    onInput(e) {
        if (e.keyCode == 13) {
            this.autocompleteContainer.collapse('hide');
            return;
        }

        if (e.keyCode <= 45 && e.keyCode != 8) return;

        let srch = this.searchInput.val().toLowerCase();

        if (!srch || srch.length < 2) {
            this.autocompleteContainer.collapse('hide');
            return;
        }

        if (!this.isFiltered) {
            this.autocompleteContainer.addClass('filtered');
            this.isFiltered = true;
        }

        let matches = false;
        this.favElements.removeClass('match');
        this.arFavitemsLC.forEach((val, idx) => {
            if (val.indexOf(srch) != -1) {
                this.favElements.eq(idx).addClass('match');
                matches = true;
            }
        });

        if (matches) this.autocompleteContainer.collapse('show');
        else this.autocompleteContainer.collapse('hide');
    }

    onCtrlsClick(e) {
        e.stopPropagation();
        e.preventDefault();
        switch (e.target.id) {
            case 'search-fav-add':
                this.appendFavorite(this.searchInput.val());
                break;

            case 'search-fav-expand':
                if (this.autocompleteContainer.hasClass('show')) {
                    if (this.isFiltered) {
                        this.autocompleteContainer.removeClass('filtered');
                        this.isFiltered = false;
                    } else {
                        this.autocompleteContainer.collapse('hide');
                        this.autocompleteContainer.addClass('filtered');
                        this.isFiltered = true;
                    }
                } else {
                    this.autocompleteContainer.removeClass('filtered');
                    this.isFiltered = false;
                    this.autocompleteContainer.collapse('show');
                }
                break;

            default:
                break;
        }
    }

    onFavItemClicked(e) {
        e.stopPropagation();
        e.preventDefault();

        if ($(e.target).hasClass('favitem')) {
            this.autocompleteContainer.collapse('hide');
            this.geocoder.setQuery(e.target.innerText);
            this.searchInput.focus();

            this.geocoder._keydown({ keyCode: 13 });
        } else if ($(e.target).hasClass('del-favitem')) {
            this.deleteFavorite($(e.target).closest('button').text());
        }
    }

    onFavMenuClicked(e) {
        switch (e.target.id) {
            case 'search-fav-deleteall':
                if (confirm(i18next.t('searchfav.ask_removeall'))) {
                    this.arFavitems = [];
                    this.arFavitemsLC = [];
                    localStorage['searchFavItems'] = JSON.stringify(this.arFavitems);
                    this.updateFavList();
                }
                break;

            case 'search-fav-export':
                let exp = JSON.stringify(this.arFavitems, null, 2);
                const blob = new Blob([exp], {
                    type: 'application/json;charset=utf-8',
                });
                const objectUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = objectUrl;
                link.download = 'SearchFavorites.json';
                link.click();
                break;

            case 'search-fav-import':
                $(e.target).find('input[type=file]').click();
                e.preventDefault();
                break;

            default:
                break;
        }
    }

    onImportFavFile(e) {
        if (!e.target.files[0]) return;

        let r = new FileReader();
        r.onload = (f) => {
            let importFavItems = JSON.parse(f.target.result);
            this.arFavitems = this.arFavitems.concat(importFavItems);
            this.arFavitems = [...new Set(this.arFavitems)]; //remove duplicates
            this.arFavitems.sort();
            this.arFavitemsLC = this.arFavitems.map((x) => x.toLowerCase()); //copy to Lowercase
            localStorage['searchFavItems'] = JSON.stringify(this.arFavitems);
            this.updateFavList();
        };

        r.readAsText(e.target.files[0]);

        e.target.value = '';
    }
}
