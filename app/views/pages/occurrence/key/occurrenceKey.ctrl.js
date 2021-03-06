'use strict';

var angular = require('angular'),
    parseGeometry = require('wellknown'),
    globeCreator = require('../../../components/map/basic/globe');

angular
    .module('portal')
    .controller('occurrenceKeyCtrl', occurrenceKeyCtrl);

/** @ngInject */
function occurrenceKeyCtrl(leafletData, env, moment, $http, hotkeys) {
    var vm = this,
        globe,
        globeCanvas = document.querySelector('.occurrenceKey__map .globe');
    vm.mediaExpand = {
        isExpanded: false
    };
    vm.mediaItems = {};
    vm.dataApi = env.dataApi;
    //vm.similarities = {
    //    similarRecords: []
    //};
    vm.hideDetails = true;

    //vm.SimilarOccurrence = SimilarOccurrence;//.getSimilar({TAXONKEY: 2435146});
    vm.center = {zoom: 7, lat: 0, lng: 0};
    vm.markers = {};
    var accessToken = 'pk.eyJ1IjoiZ2JpZiIsImEiOiJjaWxhZ2oxNWQwMDBxd3FtMjhzNjRuM2lhIn0.g1IE8EfqwzKTkJ4ptv3zNQ';

    vm.highlights = {
        issues: {
            expanded: false
        }
    };
    vm.tiles = {
        "name": "Outdoor",
        "url": "https://api.mapbox.com/v4/mapbox.outdoors/{z}/{x}/{y}.png?access_token=" + accessToken,
        options: {
            attribution: "&copy; <a href='https://www.mapbox.com/'>Mapbox</a> <a href='http://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap contributors</a>",
            detectRetina: false //TODO can this be fixed? Currently the mapbox retina tiles have such a small text size that I'd prefer blurry maps that I can read
        },
        type: 'xyz',
        layerOptions: {
            "showOnSelector": false,
            palette: 'yellows_reds'
        }
    };
    vm.mapDefaults = {
        zoomControlPosition: 'topleft',
        scrollWheelZoom: false
    };
    vm.mapEvents = {
        map: {
            enable: [], //https://github.com/tombatossals/angular-leaflet-directive/issues/1033
            logic: 'broadcast'
        },
        marker: {
            enable: [],
            logic: 'broadcast'
        }
    };
    vm.controls = {
        scale: true
    };

    vm.paths = {};

    vm.markerMessage = {
        template: '<dl class="occurrenceKey__markerMessage">{{coordinateUncertainty}}{{elevation}}</dl>',
        coordinateUncertaintyTemplate: '<dt>Coordinate uncertainty</dt><dd>{{coordinateUncertainty}}m</dd>',
        elevationTemplate: '<dt>Elevation<span>{{elevationSource}}</span></dt><dd>{{elevation}}</dd>',
        elevationAccuracyTemplate: '<dt>Elevation<span>{{elevationSource}}</span></dt><dd>{{elevation}} ±{{elevationAccuracy}}m</dd>',
        elevation: undefined
    };
    vm.updateMarkerMessage = function () {
        if(!vm.markers.taxon){
            return;
        }
        var message, elevation = '', coordinateUncertainty = '';

        if (vm.data.coordinateUncertaintyInMeters) {
            coordinateUncertainty = vm.markerMessage.coordinateUncertaintyTemplate.replace('{{coordinateUncertainty}}', vm.data.coordinateUncertaintyInMeters);
        }

        if (vm.markerMessage.elevation) {
            var e = vm.markerMessage.elevation.elevation + 'm';
            var eAccuracy = vm.markerMessage.elevation.elevationAccuracy;
            var source = vm.markerMessage.elevation.source || '';
            if (typeof eAccuracy !== 'undefined') {
                elevation = vm.markerMessage.elevationAccuracyTemplate.replace('{{elevation}}', e).replace('{{elevationSource}}', source).replace('{{elevationAccuracy}}', eAccuracy);
            } else {
                elevation = vm.markerMessage.elevationTemplate.replace('{{elevation}}', e).replace('{{elevationSource}}', source);
            }
        }

        if ( elevation || coordinateUncertainty) {
            message = vm.markerMessage.template.replace('{{elevation}}', elevation).replace('{{coordinateUncertainty}}', coordinateUncertainty);
            vm.markers.taxon.message = message;
        }
    };

    //create globe
    if (!globe && globeCanvas) {
        globe = globeCreator(globeCanvas, {
            land: '#4d5258',
            focus: 'deepskyblue'
        });
    }


    //vm.tilePosStyle = {};
    vm.data;
    //vm.table = {
    //    filter: undefined
    //};

    hotkeys.add({
        combo: 'alt+d',
        description: 'Show record details',
        callback: function () {
            vm.hideDetails = !vm.hideDetails;
            vm.expandMore = false;
        }
    });
    vm.verbatim = gb.occurrenceRecordVerbatim;
    vm.data = gb.occurrenceRecord;

    if ((typeof vm.data.footprintWKT === 'undefined' || !hasValidOrNoSRS(vm.data)) && (typeof vm.data.decimalLatitude === 'undefined' || typeof vm.data.decimalLongitude === 'undefined')) {
        vm.hideMap = true;

    } else {
        vm.hideMap = false;
    }


    vm.setData = function () {
        //TODO find a better way to parse required data to controller from server without seperate calls
        //vm.occurrenceCoreTerms = gb.occurrenceCoreTerms;

        setMap(vm.data);
        if (typeof vm.data.elevation !== 'undefined') {
            vm.markerMessage.elevation = {
                elevation: vm.data.elevation,
                elevationAccuracy: vm.data.elevationAccuracy
            };
            vm.updateMarkerMessage();
        }
    };

    function hasValidOrNoSRS(data) {

        if(typeof data.footprintSRS === "undefined"){
            return true;
        } else  if(data.footprintSRS.toLowerCase().indexOf("wgs84") > -1 || data.footprintSRS.toLowerCase().indexOf("wgs_1984") > -1 || data.footprintSRS.toLowerCase().indexOf("wgs_1984") > -1 || data.footprintSRS.toLowerCase().indexOf("epsg:4326") > -1){

            return true
        } else {

            return false;
        }

    }
    function setMap(data) {


        if(typeof data.decimalLatitude !== 'undefined' && typeof data.decimalLongitude !== 'undefined'){
            vm.markers.taxon = {
                lat: data.decimalLatitude,
                lng: data.decimalLongitude,
                focus: false
            };
            vm.center = {
                zoom: 6,
                lat: data.decimalLatitude,
                lng: data.decimalLongitude
            };

        }

        if(data.footprintWKT && hasValidOrNoSRS(data)){
            try {
               var geojsonGeometry = parseStringToWKTs(data.footprintWKT);
                leafletData.getMap('occurrenceMap')
                .then(function(map){
                    var layer;
                    try {
                        layer = L.GeoJSON.geometryToLayer(geojsonGeometry);
                        layer.addTo(map);
                        var ext = layer.getBounds();
                        map.fitBounds(ext);
                    } catch(err){
                        vm.hideMap = !(typeof data.decimalLatitude !== 'undefined' && typeof data.decimalLongitude !== 'undefined');
                        console.log(err.message)
                        console.log('Unparsable footprintWKT')
                    }


                }).catch(function(err){
                    // no coordinates and the WKT is invalid
                    vm.hideMap = !(typeof data.decimalLatitude !== 'undefined' && typeof data.decimalLongitude !== 'undefined');;
                    throw err
                })

              
            } catch(err){
                console.log(err.message)
                console.log('Unparsable footprintWKT')
            }



        }

        else if (data.coordinateUncertaintyInMeters > 50) {
            vm.paths.c1 = {
                weight: 2,
                color: '#ff612f',
                latlngs: {
                    lat: data.decimalLatitude,
                    lng: data.decimalLongitude
                },
                radius: data.coordinateUncertaintyInMeters,
                type: 'circle'
            };
        }
        //set static marker
        leafletData.getMap('occurrenceMap').then(function (map) {
            //var a= L.latLng(data.decimalLatitude, data.decimalLongitude);
            //var projPos = map.project(a, 0);
            //vm.tilePosStyle = {
            //    left: projPos.x/2.56 + '%',
            //    top: projPos.y/2.56 + '%',
            //    display: 'block'
            //};
            //attach globe to map
            if (globe) {
                globe.setCenter(map.getCenter().lat, map.getCenter().lng, map.getZoom());
                map.on('move', function () {
                    globe.setCenter(map.getCenter().lat, map.getCenter().lng, map.getZoom());
                });
            }
            //only enable scroll zoom once the map has been clicked
            map.once('focus', function () {
                map.scrollWheelZoom.enable();
            });
        });
    }

    function parseStringToWKTs(str) {
        var geojsonGeometry;
        try {
            geojsonGeometry = parseGeometry(str);
            if (geojsonGeometry) {
                return geojsonGeometry
            } else {
                throw 'Not valid wkt';
            }
        } catch(err) {
            return {
                error: 'FAILED_PARSING'
            }
        }

    }
}

module.exports = occurrenceKeyCtrl;