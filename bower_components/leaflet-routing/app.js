/*
  Routing capability using the Leaflet framework
  Copyright (c) 2013, Turistforeningen, Hans Kristian Flaatten

  https://github.com/Turistforeningen/leaflet-routing
*/

var routing, data;

(function() {
  "use strict";
  jQuery(function($) {
    var api, apiKey, rUrl, sUrl, topo, map, snapping, inport, myRouter;

    api = window.location.hash.substr(1).split('@');
    if (api.length === 2) {
      rUrl = 'http://' + api[1] + '/route/?coords='
      sUrl = 'http://' + api[1] + '/bbox/?bbox=';
      apiKey = api[0];
    } else {
      throw new Error('API auth failed');
    }

    topo = L.tileLayer('http://opencache.statkart.no/gatekeeper/gk/gk.open_gmaps?layers=topo2&zoom={z}&x={x}&y={y}', {
      maxZoom: 16,
      attribution: '<a href="http://www.statkart.no/">Statens kartverk</a>'
    });

    var summer = L.tileLayer('http://mt3.turistforeningen.no/prod/trail_summer/{z}/{x}/{y}.png', {
      maxZoom: 16,
      attribution: '<a href="http://www.turistforeningen.no/">DNT</a>'
    });
    var winter = L.tileLayer('http://mt3.turistforeningen.no/prod/trail_winter/{z}/{x}/{y}.png', {
      maxZoom: 16,
      attribution: '<a href="http://www.turistforeningen.no/">DNT</a>'
    });
    var cabin = L.tileLayer('http://mt3.turistforeningen.no/prod/cabin/{z}/{x}/{y}.png', {
      maxZoom: 16,
      attribution: '<a href="http://www.turistforeningen.no/">DNT</a>'
    });

    map = new L.Map('map', {
      layers: [topo]
      ,center: new L.LatLng(61.5, 9)
      ,zoom: 13
    });
    cabin.addTo(map);
    summer.addTo(map);

    L.control.layers({'Topo 2': topo}, {
      'DNTs merkede stier': summer
      ,'DNTs merkede vinterruter': winter
      ,'DNTs turisthytter': cabin
    }, {
      position: 'topleft'
    }).addTo(map);

    // Import Layer
    inport = new L.layerGroup(null, {
      style: {
        opacity:0.5
        ,clickable:false
      }
    }).addTo(map);

    // Snapping Layer
    snapping = new L.geoJson(null, {
      style: {
        opacity:0
        ,clickable:false
      }
    }).addTo(map);
    map.on('moveend', function() {
      if (map.getZoom() > 12) {
        var url;
        url = sUrl + map.getBounds().toBBoxString() + '&callback=?';
        $.getJSON(url).always(function(data, status) {
          if (status === 'success') {
            data = JSON.parse(data);
            if (data.geometries && data.geometries.length > 0) {
              snapping.clearLayers();
              snapping.addData(data);
            }
          } else {
            console.error('Could not load snapping data');
          }
        });
      } else {
        snapping.clearLayers();
      }
    });
    map.fire('moveend');

    // Routing Function
    // @todo speed up geometryToLayer()
    myRouter = function(l1, l2, cb) {
      var req = $.getJSON(rUrl + [l1.lng, l1.lat, l2.lng, l2.lat].join(',') + '&callback=?');
      req.always(function(data, status) {
        if (status === 'success') {
          try {
            L.GeoJSON.geometryToLayer(JSON.parse(data)).eachLayer(function (layer) {
              // 14026
              var d1 = l1.distanceTo(layer._latlngs[0]);
              var d2 = l2.distanceTo(layer._latlngs[layer._latlngs.length-1]);

              if (d1 < 10 && d2 < 10) {
                return cb(null, layer);
              } else {
                return cb(new Error('This has been discarded'));
              }
            });
          } catch(e) {
            return cb(new Error('Invalid JSON'));
          }
        } else {
          return cb(new Error('Routing failed'));
        }
      });
    }

    // Leaflet Routing Module
    routing = new L.Routing({
      position: 'topleft'
      ,routing: {
        router: myRouter
      }
      ,snapping: {
        layers: [snapping]
        ,sensitivity: 15
        ,vertexonly: false
      }
    });
    map.addControl(routing);
    routing.draw(true); // enable drawing mode

    $('#eta-export').hide();
    $('#eta-export').on('click', function() {
      var id = $('#eta-id').val();
      if (!id) { alert('Ingen tp_id definert!'); return; }
      if (confirm('Eksport til ETA vil overskrive eksisterende geometri!')) {
        var coords = routing.toGeoJSON().coordinates;
        var data = [];
        for (var i = 0; i < coords.length; i++) {
          data.push(coords[i][0] + ' ' + coords[i][1]);
        }
        data = 'LINESTRING(' + data.join(',') + ')';
        $.post('http://mintur.ut.no/lib/ajax/post_geom.php?api_key=' + apiKey + '&tp_id=' + id, {coords: data}, function(data) {
          if (data.error) {
            alert('Eksport feilet med feilkode ' + data.error);
          } else if (data.success) {
            window.location.href = 'http://mintur.ut.no/index.php?tp_id=' + id + '&tab=kart';
            //alert('Eksport suksess!');
          }
        });
      }
    });

    $('#eta-import').on('click', function() {
      var id = $('#eta-id').val();
      if (!id) { alert('Ingen tp_id definert!'); return; }
      $.get('http://mintur.ut.no/lib/ajax/post_geom.php?api_key=' + apiKey + '&tp_id=' + id, function(data) {
        if (data.error) {
          alert('Import feilet med feilkode ' + data.error);
        } else if (typeof data.coords !== 'undefined') {
          $('#eta-import').hide();
          $('#eta-export').show();
          $('#eta-id').attr('readonly', 'readonly');

          if (data.coords) {
            data.coords = data.coords.replace('LINESTRING(', '').replace(')', '').split(',');
            for (var i = 0; i < data.coords.length; i++) {
              data.coords[i] = new L.LatLng(data.coords[i].split(' ')[1], data.coords[i].split(' ')[0]);
            }
            inport.clearLayers();
            var p = new L.Polyline(data.coords, {clickable:false, color: '#000000', opacity: 0.4});
            inport.addLayer(p);
            map.fitBounds(p.getBounds());
          }
        }
      });
    });

    function fetchSsrAc(search, cb) {
      var result = [];
      $.ajax({
        url: "https://ws.geonorge.no/SKWS3Index/ssr/sok?navn=" + search + "*&epsgKode=4326&antPerSide=10"
        ,type: "GET"
        ,dataType: 'xml'
        ,success: function(xml) {
          $(xml).find('sokRes > stedsnavn').each(function(){
            result.push({
              title: $(this).find('stedsnavn').text()
              ,lat: $(this).find('aust').text()
              ,lng: $(this).find('nord').text()
            });
          });
          cb(null, result);
        }
      });
    }

    $('#ssr-search').typeahead({
      remote: {
        url: 'https://ws.geonorge.no/SKWS3Index/ssr/sok?navn=%QUERY*&epsgKode=4326&antPerSide=10',
        dataType: 'xml',
        filter: function(xml) {
          var result = [];
          $(xml).find('sokRes > stedsnavn').each(function(){
            result.push({
              value: $(this).find('stedsnavn').text()
              ,tokens: [$(this).find('stedsnavn').text()]
              ,lat: $(this).find('nord').text()
              ,lng: $(this).find('aust').text()
            });
          });
          return result;
        }
      }
    });

    $('#ssr-search').on('typeahead:selected', function(e, object) {
      var ll = new L.LatLng(object.lat, object.lng);
      map.panTo(ll);
      $('#ssr-search').val('');
    })

  });
}).call(this);
