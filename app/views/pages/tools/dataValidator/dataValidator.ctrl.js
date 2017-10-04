'use strict';
var _ = require('lodash'),
moment = require('moment'),
    fixedUtil = require('../../dataset/key/main/submenu');

require('../../../components/fileUpload/fileUpload.directive');


//only available on dev for now
var devApiUrl = '//api.gbif-dev.org/v1/';

angular
    .module('portal')
    .controller('dataValidatorCtrl', dataValidatorCtrl);

/** @ngInject */
function dataValidatorCtrl($http, $stateParams, $state, $timeout, DwcExtension, Remarks, $location,  $sessionStorage) {
    var vm = this;
    vm.$state = $state;

    vm.resourceToValidate = {};

    vm.issueSampleExpanded = {};
    vm.issuesMap = {};
    vm.remarks = {};



    vm.dwcextensions = DwcExtension.get();

    Remarks.then(function (response) {
        vm.remarks = {};
        response.data.map(function (remark) {
            vm.remarks[remark.id] = remark;
        });
    });

    vm.handleUploadFile = function(params) {
        var formData = new FormData();
        formData.append('file', params.files[0]);
        vm.jobStatus = "SUBMITTED";
        $http({
            url: devApiUrl + 'validator/jobserver/submit',
            method: "POST",
            data: formData,
            transformRequest: angular.identity,
            headers: {'Content-Type': undefined}
        }).success(function (data, status) {
            handleValidationSubmitResponse(data, status);
        }).error(function (data, status) {
            handleWSError(data, status);
        });
    };

    vm.handleFileUrl = function(params) {

        vm.jobStatus = "FETCHING";
        var url = devApiUrl + 'validator/jobserver/submiturl';
        $http({url: url, params: params, method : "POST"})
            .success(function (data, status) {
                handleValidationSubmitResponse(data, status);
            })
            .error(function (data, status, headers) {
                handleWSError(data, status);
            });
    };

    vm.getValidationResults = function(jobid) {

        $http.get(
            devApiUrl + 'validator/jobserver/status/' + jobid, {params: {nonse: Math.random()}}

        ).success(function (data) {
            vm.startTimestamp = moment(data.startTimestamp).subtract(moment().utcOffset(), 'minutes').fromNow();
            handleValidationSubmitResponse(data);
        }).error(function (err, status, headers) { //data, status, headers, config

            if((err && err.statusCode === 404 )|| status === 404){
                handleValidationSubmitResponse(err)
            } else{

                handleWSError(err, status)

            }
        });
    };

    if($stateParams.jobid){
        vm.jobid = $stateParams.jobid;


        loadEvaluationCategory().then(function(){
            vm.getValidationResults(vm.jobid)

        })

    } else if($sessionStorage.gbifRunningValidatonJob){
        $state.go('dataValidatorKey', {jobid: $sessionStorage.gbifRunningValidatonJob})
    }

    function loadEvaluationCategory() {
       return $http({
            url: devApiUrl + 'validator/enumeration/simple/EvaluationCategory'
        }).success(function (data) {
            vm.evaluationCategory = data;
        }).error(function (err, status) { //data, status, headers, config

            handleWSError(err, status)

        });
    }
    vm.retries404 = 10;
    function handleValidationSubmitResponse(data) {

        vm.jobStatus = data.status;

        if((data.status === "RUNNING"  || data.status === "ACCEPTED" || data.status === "NOT_FOUND") && data.jobId){


            /* currently the validator webservice may return 404 and then after a few attempts it will return 200
                We give it 5 attempts before throwing 404

             */
            vm.jobId = data.jobId;
            if(data.status === "NOT_FOUND"){
                vm.retries404 --;
            } else {
                vm.retries404 = 10;
            }
            $timeout(function(){

                if($state.is('dataValidatorKey')){

                    if(data.status === "NOT_FOUND" && vm.retries404 < 1){
                        delete $sessionStorage.gbifRunningValidatonJob;

                        handleWSError(data, 404)
                    } else {
                        $sessionStorage.gbifRunningValidatonJob = data.jobId;
                        // pretend the job is running if we haven´t reached 404 retry limit
                        if(data.status === "NOT_FOUND" && vm.retries404 > 0){
                            vm.jobStatus = "CONTACTING_SERVER";
                        }
                        if(data.status === "RUNNING" && data.result){
                            handleValidationResult(data);
                        }
                        vm.getValidationResults($stateParams.jobid)

                    };

                } else if($state.is('dataValidator')){

                    $state.go("dataValidatorKey", {jobid: vm.jobId});

                }

            }, 1000)
        } else if(data.status === "FAILED"){
            delete $sessionStorage.gbifRunningValidatonJob;
            handleFailedJob(data);
        } else if(data.status === "FINISHED"){

            delete $sessionStorage.gbifRunningValidatonJob;

            var port = ($location.port() !== 80 && $location.port() !== 443) ? ":"+$location.port() : "";

            vm.jobUrl =   $location.protocol()+"://"+$location.host()+port+$location.path() ;
            handleValidationResult(data);
        }
        //$window.location.href = '/tools/data-validator/' + data.jobId;
    }

    var sortIssues = function(issues){



      return  _.sortBy(issues,[
        function(issue){
            return (issue.severity === 'INFO') ? 3 : (issue.severity === 'WARNING') ? 2 : 1;
        },
          function(issue){
              return (issue.count) ? (- parseInt(issue.count)) : 0 ;
          },
        ]);


    }

    function getIssueSeverity(e) {

                return (vm.remarks[e]) ? vm.remarks[e].severity : "WARNING";

    };

    function handleValidationResult(responseData) {


            var data = responseData.result;

            data.results.sort(function(a, b){
                if(a.fileType === "CORE" && b.fileType !== "CORE"){
                    return -1
                } else if(a.fileType !== "CORE" && b.fileType === "CORE"){
                    return 1
                } else {
                    return 0
                };
            })

            vm.extensionCount = 0;

            for(var i=0; i< data.results.length; i++){
                if(data.results[i].fileType === "CORE"){
                    vm.coreDataType = data.results[i].rowType;
                } else if(data.results[i].fileType === "EXTENSION"){
                    vm.extensionCount ++
                }
            }

            vm.validationResults = {
                summary: _.omit(data, 'results'),
                results: []
            };
            vm.validationResults.summary.issueTypesFound = {};
             vm.unknownTermMap = {};

        angular.forEach(data.results, function(resourceResult) {
                var vmResourceResult = _.omit(resourceResult, 'issues');
                //the order of the evaluationCategory is important
                vmResourceResult.issues = _.orderBy(resourceResult.issues, function (value) {return _.indexOf(vm.evaluationCategory, value.issueCategory)});

                //prepare terms frequency
                if(resourceResult.termsFrequency){

                    for(var i=0; i < resourceResult.termsFrequency.length; i++){

                        var key = Object.keys(resourceResult.termsFrequency[i])[0];
                        resourceResult.termsFrequency[i].key = key;
                        resourceResult.termsFrequency[i].count = resourceResult.termsFrequency[i][key];
                        resourceResult.termsFrequency[i].percentage = Math.round((resourceResult.termsFrequency[i].count/ resourceResult.numberOfLines)*100);

                    }

                }


                vmResourceResult.issuesMap = {};
                var issueBlock, issueSample;
                angular.forEach(resourceResult.issues, function(value) {
                    this[value.issueCategory] = this[value.issueCategory] || [];
                    if(value.issue === "UNKNOWN_TERM"){
                        vm.unknownTermMap[value.relatedData] = true;
                    };
                    value.severity = getIssueSeverity(value.issue);
                    vm.validationResults.summary.hasIssues = true;
                    vm.validationResults.summary.issueTypesFound[value.issueCategory] = vm.validationResults.summary.issueTypesFound[value.issueCategory] || {};
                    vm.validationResults.summary.issueTypesFound[value.issueCategory][value.issue] =  vm.remarks[value.issue] || {severity: "WARNING", id: value.issue};
                    //rewrite sample to exclude redundant information (e.g. evaluationType)
                    //TODO to the same thing for issues with non sample
                    issueBlock = _.omit(value, 'sample');
                    angular.forEach(value.sample, function(sample) {
                        this.sample = this.sample || [];
                        issueSample = {};
                        issueSample.issueData = _.omit(sample, ['evaluationType', 'relatedData']);
                        issueSample.relatedData = sample.relatedData;
                        issueSample.allData = _.assign({}, issueSample.issueData, issueSample.relatedData)
                        this.sample.push(issueSample);
                    }, issueBlock);
                    if(issueBlock.related)
                    issueBlock.sample = _.sortBy(issueBlock.sample, [function(o) {

                    return (_.isArray(o.relatedData)) ? - Object.keys(o.relatedData).length : 0 }

                    ]);



                    if(issueBlock.sample && issueBlock.sample.length > 0 && issueBlock.sample[0].issueData && issueBlock.sample[0].relatedData){
                        issueBlock.headers = Object.keys(issueBlock.sample[0].issueData).concat(Object.keys(issueBlock.sample[0].relatedData));

                    } else if(issueBlock.sample && issueBlock.sample.length > 0 && issueBlock.sample[0].issueData ){
                        issueBlock.headers = Object.keys(issueBlock.sample[0].issueData);
                    };

                    this[value.issueCategory].push(issueBlock);
                }, vmResourceResult.issuesMap);
               _.each(vmResourceResult.issuesMap, function(val, key){
                   vmResourceResult.issuesMap[key] =  sortIssues(val)
                })
                this.push(vmResourceResult);
            }, vm.validationResults.results);

        _.each(vm.validationResults.summary.issueTypesFound, function(val, key){
                vm.validationResults.summary.issueTypesFound[key] =  _.values(sortIssues(val));
        })





    }

    vm.handleDrop = function (e) {
        vm.handleUploadFile(e.dataTransfer);
    };

    function handleWSError(data, status) {

        vm.hasError = true;
        switch(status) {
            case 413:
                vm.hasApi413Error = true;
                break;
            case 404:
                vm.hasApi404Error = true;
                break;
            case 400:
                vm.hasApi400Error = true;
                break;
            default:
                vm.hasApiCriticalError = true;
        }
        //vm.hasApiCriticalError = true;
      //  alert("error")
    }

    function handleFailedJob(data){
        vm.jobStatus = data.status;
    }


    vm.attachTabListener = function () {
        fixedUtil.updateTabs();
    };

    vm.attachMenuListener = function () {
        fixedUtil.updateMenu();
    };
}

module.exports = dataValidatorCtrl;
