"use strict";

var _ = require('lodash'),
    apiConfig = require('../../../models/gbifdata/apiConfig'),
    userAgent = require('../../../../config/config').userAgent,
    querystring = require('querystring'),
    request = require('requestretry');

module.exports = {
    start: function(){
        return start(testConfig);
    }
};

async function start(tests) {
    var results = await Promise.all(tests.map(function(test){
        return test();
    }));
    return {
        components: _.keyBy(results, 'component')
    };
}

async function clusterLoad() {
    var options = {
        url: apiConfig.yarnResourceManager.url + 'cluster/scheduler?v=' + Date.now(),
        json: true,
        userAgent: userAgent
    };
    let response = await request(options);
    if (response.statusCode != 200) {
        throw response;
        return;
    }
    let result = response.body;

    //calculate load as fraction of memory usage or core usage - whichever is higher
    let maxMemory = _.get(result, 'scheduler.schedulerInfo.rootQueue.maxResources.memory', 1);
    let maxCores = _.get(result, 'scheduler.schedulerInfo.rootQueue.maxResources.vCores', 1);

    let usedMemory = _.get(result, 'scheduler.schedulerInfo.rootQueue.usedResources.memory', 1);
    let usedCores = _.get(result, 'scheduler.schedulerInfo.rootQueue.usedResources.vCores', 1);

    let load = Math.max( (usedMemory/maxMemory), (usedCores/maxCores) );

    return {
        component: 'CLUSTER',
        load: load,
        severity: load > 0.90 ? 'WARNING' : 'OPERATIONAL'
    };
}

async function crawlerLoad() {
    var options = {
        url: apiConfig.crawlingDatasetProcessRunning.url + '?v=' + Date.now(),
        json: true,
        userAgent: userAgent
    };
    let response = await request(options);
    if (response.statusCode != 200) {
        throw response;
        return;
    }
    let result = response.body;
    return {
        component: 'CRAWLER',
        load: result.length,
        severity: result.total > 200 ? 'WARNING' : 'OPERATIONAL'
    };
}

async function downloadQueue() {
    let query = {
        timezone: 'GMT',
        filter: 'status=RUNNING',
        _dc: Date.now()
    };
    let options = {
        url: apiConfig.oozie.url + 'jobs?' + querystring.stringify(query),
        json: true,
        userAgent: userAgent
    };
    let response = await request(options);
    if (response.statusCode != 200) {
        throw response;
        return;
    }
    let result = response.body;
    return {
        component: 'DOWNLOAD',
        load: result.total,
        severity: result.total > 100 ? 'WARNING' : 'OPERATIONAL'
    };
}

//tests are expected to return {component name, load?: [high, medium, low], values: {custom obj}}
let testConfig = [clusterLoad, crawlerLoad, downloadQueue];
