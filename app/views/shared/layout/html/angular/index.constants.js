(function () {
    'use strict';
    var angular = require('angular');
    require('./env.constants');

    angular
        .module('portal')
        .constant('endpoints', {
            download: '/api/user/download',
            cancelDownload: '/api/user/cancelDownload/',
            iucnUserLink: 'http://www.iucnredlist.org/details/',
            userDownloads: '/api/user/myDownloads',
            datasetDownloads: 'occurrence/download/dataset/'
        })
})();
