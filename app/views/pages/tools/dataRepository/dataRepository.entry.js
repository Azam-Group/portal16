'use strict';

require('./upload/dataRepositoryUpload.ctrl');
require('./about/dataRepositoryAbout.ctrl');
require('./upload/key/dataRepositoryKey.ctrl');
require('./dataPackage.resource');

var _ = require('lodash');

angular
    .module('portal')
    .controller('dataRepositoryCtrl', dataRepositoryCtrl);

/** @ngInject */
function dataRepositoryCtrl($state, DataPackageSearch, User, $sessionStorage) {
    var vm = this;
    vm.$state = $state;
    vm.uploads = {
        count: 1,
        limit: 20,
        results: testData
    };

    //get user from storage - if the user session has expired the backend will fail
    function updateUser() {
        vm.username = _.get($sessionStorage.user, 'username');
    }
    updateUser();

    vm.search = function() {
        var apiQuery = {q: vm.q};
        if (vm.myUploads && vm.username) {
            apiQuery.user = vm.username;
        }
        vm.uploads = DataPackageSearch.query(apiQuery, function (res) {
            console.log(res);
        }, function (err) {
            console.log(err);
        });
    };
}

module.exports = dataRepositoryCtrl;



var testData = [
    {
        title: 'GBIF backbone backup - Jan 5 2017',
        description: 'We regularly take a copy of the backbone for reference, trends and backup. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur...',
        user: 'timrobertson100',
        doi: 'dl/2348987',
        created: 'Uploaded on August 30, 2016',
        archive: {
            url: 'http://api.gbif.org/repository/upload/sdfkjhg/archive.zip',
            size: 547928374
        },
        files: [
            {
                name: 'species.csv',
                size: 247983,
                url: 'http://api.gbif.org/repository/upload/sdfkjhg/files/species.csv'
            },
            {
                name: 'occurrences.csv',
                size: 22479683,
                url: 'http://api.gbif.org/repository/upload/sdfkjhg/files/occurrences.csv'
            }
        ]
    }
];