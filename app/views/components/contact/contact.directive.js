'use strict';

var angular = require('angular'),
    _ = require('lodash');

angular
    .module('portal')
    .directive('contact', contactDirective);

/** @ngInject */
function contactDirective(BUILD_VERSION) {
    var directive = {
        restrict: 'E',
        templateUrl: '/templates/components/contact/contact.html?v=' + BUILD_VERSION,
        scope: {
            contactInfo: '='
        },
        controller: contactCtrl,
        controllerAs: 'vm',
        bindToController: true
    };

    return directive;

    /** @ngInject */
    function contactCtrl() {
        var vm = this;
        vm.contact = vm.contactInfo;
    }
}

module.exports = contactDirective;

