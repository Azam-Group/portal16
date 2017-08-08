'use strict';

var angular = require('angular'),
    _ = require('lodash');

angular
    .module('portal')
    .controller('navCtrl', navCtrl);

/** @ngInject */
function navCtrl($window, $http, $location, $rootScope, NAV_EVENTS, AUTH_EVENTS, $sessionStorage, $scope, $state, hotkeys, NOTIFICATIONS, $timeout) {
    var vm = this;
    var toggleGroup = [
        NAV_EVENTS.toggleSearch,
        NAV_EVENTS.toggleFeedback,
        NAV_EVENTS.toggleNotifications,
        NAV_EVENTS.toggleUserMenu
    ];

    vm.scrollOffset = 0;
    angular.element($window).bind('scroll', function(){
        var offset = this.pageYOffset;
        $timeout(function () {
            vm.scrollOffset = offset;
        }, 0);
    });
    vm.activeMenu = undefined;
    vm.toggleMenu = function(firstLevelItem) {
        if (vm.activeMenu == firstLevelItem) {
            vm.activeMenu = undefined;
        } else {
            vm.activeMenu = firstLevelItem
        }
    };

    vm.openMenu = function(navEvent){
        toggleGroup.forEach(function(e){
            if (e === navEvent) {
                $rootScope.$broadcast(e, {state: true});
            } else {
                $rootScope.$broadcast(e, {state: false});
            }
        });
    };

    vm.toggleMobileMenu = function(){
        vm.mobileMenuActive = !vm.mobileMenuActive;
    };

    vm.toggleNotifications = function () {
        vm.openMenu(NAV_EVENTS.toggleNotifications);
    };

    vm.toggleFeedback = function () {
        vm.openMenu(NAV_EVENTS.toggleFeedback);
    };

    vm.toggleSearch = function () {
        vm.openMenu(NAV_EVENTS.toggleSearch);
    };

    vm.toggleUserMenu = function () {
        if ($sessionStorage.user) {
            if (!$state.includes('user')) {
                $window.location = '/user/profile';
            }
        } else {
            vm.openMenu(NAV_EVENTS.toggleUserMenu);
        }
    };

    vm.getIssues = function () {
        $http.get('/api/feedback/issues?item=' + encodeURIComponent($location.path()), {})
            .then(function (response) {
                vm.issuesCount = response.data.total_count;
            }, function () {
                vm.issuesCount = undefined;
                //TODO mark as failure or simply hide
            });
    };
    vm.getIssues();

    function updateUser() {
        vm.loginGreeting = _.get($sessionStorage.user, 'userName', 'Login');
    }
    updateUser();
    $scope.$on(AUTH_EVENTS.USER_UPDATED, function () {
        updateUser();
    });
    $scope.$on(AUTH_EVENTS.LOGIN_SUCCESS, function () {
        updateUser();
    });
    $scope.$on(AUTH_EVENTS.LOGOUT_SUCCESS, function () {
        updateUser();
    });

    hotkeys.add(
        {
            combo: ['alt+f', 'alt+space'],
            description: 'Site search',
            callback: function (event) {
                vm.openMenu(NAV_EVENTS.toggleSearch);
                event.preventDefault();
            }
        }
    );

    $scope.$on(NOTIFICATIONS.CHANGED, function (event, notifications) {
        vm.notifications = notifications;
    });

}

module.exports = navCtrl;
