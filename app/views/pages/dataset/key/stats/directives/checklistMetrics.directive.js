'use strict';

var angular = require('angular');
var _ = require('lodash');

angular
    .module('portal')
    .directive('checklistMetrics', checklistMetrics);

/** @ngInject */
function checklistMetrics() {
    var directive = {
        restrict: 'E',
        templateUrl: '/templates/pages/dataset/key/stats/directives/checklistMetrics.html',
        scope: {},
        controller: checklistMetrics,
        link: chartLink,
        controllerAs: 'checklistMetrics',
        bindToController: {
            metrics: '=',
            dimension: '=',
            api: '=',
            options: '='
        }
    };
    return directive;

    function chartLink(scope, element) {//, attrs, ctrl
        scope.create(element);
    }

    /** @ngInject */
    function checklistMetrics(Highcharts,  $scope, $translate, $filter, enums) {
        console.log(enums.rank)
        var vm = this;
        vm.logScale = true;
        if(vm.dimension === "countByIssue"){
            vm.unit =  "issues";
        };
        if(vm.dimension === "countExtRecordsByExtension"){
            vm.unit =  "extensions";
        };
        if(vm.dimension === "countNamesByLanguage"){
            vm.unit = "names"
        };

        $scope.create = function (element) {
            vm.chartElement = element[0].querySelector('.chartArea');
        };

        vm.loading = true;

        angular.element(document).ready(function () {

            vm.metrics.$promise.then(function (metrics) {

                vm.loading = false;
                if (vm.metrics[vm.dimension]) {



                    var data = {categories: [], series: [{data: [], total: 0}]}
                    var mappedData = _.map(vm.metrics[vm.dimension], function (value, key) {
                        return {key: key, count: value};
                    });
                    var sorted = (vm.dimension !== 'countByRank') ? _.orderBy(mappedData, ['count'], ['desc']) :
                        _.sortBy(mappedData, [function(r) { return enums.rank.indexOf(r.key); }]);

                    for (var i = 0; i < sorted.length; i++) {
                    if(sorted[i].count > 0){
                        data.categories.push(getTranslation(vm.dimension, sorted[i].key));
                        data.series[0].data.push(sorted[i].count);
                        data.series[0].total += sorted[i].count;
                    }
                    }
                    data.title = $translate.instant("datasetMetrics."+vm.dimension);
                    vm.data = data;

                    if (vm.myChart) {
                        vm.myChart.destroy();
                    }

                    setChartHeight();
                    vm.chartElement.style.height = vm.chartHeight + 'px';
                    if (vm.options.type == 'BAR') {
                        vm.myChart = Highcharts.chart(asBarChart(vm.data, vm.logScale));
                    } else if (vm.options.type == 'PIE') {
                        vm.myChart = Highcharts.chart(asPieChart(vm.data));
                    }

                } else {
                    vm.error = true
                }
            });


        });

        function setChartHeight() {
            var categories = _.get(vm.data, 'categories.length');
            if (vm.options.type == 'BAR') {
                categories = categories || 10;
                vm.chartHeight = categories * 20 + 100;
            } else {
                if (categories <= 3) {
                    vm.chartHeight = 300;
                } else {
                    vm.chartHeight = 400;
                }
            }
        }


        function asBarChart(data, isLogaritmic) {
            return {
                chart: {
                    animation: false,
                    type: 'bar',
                    renderTo: vm.chartElement,
                    className: (vm.dimension === 'countByIssue')? 'chart-field-issue' : ''
                },
                plotOptions: {
                    series: {
                        animation: false,

                        pointWidth: 20,
                        pointPadding: 0,
                        groupPadding: 0
                    }
                },
                legend: {
                    enabled: false
                },
                bar: {
                    minPointLength: 10
                },
                title: {
                    text: ''//data.title
                },
                xAxis: {
                    categories: data.categories,
                    visible: true
                },
                yAxis: {
                    title: {
                        text: (vm.unit || 'Taxon' )+' count'
                    },
                    type: isLogaritmic ? 'logarithmic' : 'linear',
                    minorTickInterval: isLogaritmic ? 1 : undefined,
                    visible: true
                },
                series: [{
                    name: vm.unit || 'Taxa',
                    data: data.series[0].data
                }],
                credits: {
                    enabled: false
                },
                exporting: {
                    buttons: {
                        contextButton: {
                            enabled: false
                        }
                    }
                }
            }
        }

        function asPieChart(data) {
            var serie = data.series[0].data.map(function (e, i) {
                return {
                    name: data.categories[i],
                    y: e
                }
            }).sort(function (a, b) {
                return b.y - a.y;
            });

            var lowCount = data.series[0].total / 50;
            var lowIndex = _.findIndex(serie, function (a) {
                return a.y < lowCount;
            });
            lowIndex = Math.min(20, lowIndex);
            var majorSerie = serie;
            if (lowIndex != -1) {
                lowIndex = Math.max(lowIndex, 5);
                majorSerie = serie.slice(0, lowIndex);
                var minor = serie.slice(lowIndex);
                if (minor.length > 0) {
                    majorSerie.push({y: _.sumBy(minor, 'y'), name: 'other'});
                }
            }

            return {
                chart: {
                    animation: false,
                    type: 'pie',
                    renderTo: vm.chartElement
                },
                plotOptions: {
                    series: {
                        animation: false
                    }
                },
                credits: {
                    enabled: false
                },
                title: {
                    text: ''//data.title
                },
                tooltip: {
                    pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
                },
                xAxis: {
                    visible: false
                },
                yAxis: {
                    visible: false
                },
                series: [{
                    name: vm.unit || 'Taxa',
                    data: majorSerie
                }],
                exporting: {
                    buttons: {
                        contextButton: {
                            enabled: false
                        }
                    }
                }
            };
        };

        function getTranslation(dimension, key){

            switch (dimension)
            {
                case 'countByKingdom':
                    return $filter('capitalizeFirstLetter')(key.replace("_", " ").toLowerCase());
                    break;
                case 'countByRank':
                    return $filter('capitalizeFirstLetter')($translate.instant('taxonRank.'+key));
                    break;
                case 'countByOrigin':
                    return $filter('capitalizeFirstLetter')($translate.instant('taxon.originEnum.'+key));
                    break;
                case 'countByIssue':
                    return $filter('capitalizeFirstLetter')($translate.instant('taxon.issueEnum.'+key));
                    break;
                case 'countExtRecordsByExtension':
                    return $filter('capitalizeFirstLetter')($translate.instant('taxon.extensionEnum.'+key));
                    break;
                case 'countNamesByLanguage':
                    return $filter('capitalizeFirstLetter')(key.replace("_", " ").toLowerCase());
                    break;


            };


        }

        vm.toggleBarChart = function () {
            vm.myChart.destroy();
            setChartHeight();
            vm.chartElement.style.height = vm.chartHeight + 'px';
            vm.myChart = Highcharts.chart(asBarChart(vm.data, vm.logScale));
        };

        vm.togglePieChart = function () {
            vm.myChart.destroy();
            setChartHeight();
            vm.chartElement.style.height = vm.chartHeight + 'px';
            vm.myChart = Highcharts.chart(asPieChart(vm.data));
        };
        //create API
        vm.api.print = function () {
            vm.myChart.print();
        };
        vm.api.png = function () {
            vm.myChart.exportChart();
        };
        vm.api.svg = function(){
            vm.myChart.exportChart({
                type: 'image/svg+xml'
            });
        };
        vm.api.getTitle = function () {
            return _.get(vm.data, 'title');
        };
        vm.api.asPieChart = function () {
            vm.options.type = 'PIE';
            return vm.togglePieChart();
        };
        vm.api.asBarChart = function () {
            vm.options.type = 'BAR';
            return vm.toggleBarChart();
        };

        if (Object.freeze) {
            Object.freeze(vm.api);
        }

    }
}

module.exports = checklistMetrics;

