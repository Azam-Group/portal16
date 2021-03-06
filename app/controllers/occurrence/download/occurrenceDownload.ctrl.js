"use strict";

var express = require('express'),
    Download = require('../../../models/gbifdata/gbifdata').Download,
    apiConfig = require('../../../models/gbifdata/apiConfig'),
    resourceSearch = rootRequire('app/controllers/api/resource/search/resourceSearch'),
    queryResolver = require('./queryResolver'),
    router = express.Router(),
    _ = require('lodash'),
    downloadHelper = require('./downloadKeyHelper');

module.exports = function (app) {
    app.use('/occurrence', router);
};


router.get('/download/:key/card\.:ext?', function (req, res, next) {
    renderDownload(req, res, next, 'pages/occurrence/download/key/downloadCardContent');
});

router.get('/download/:key\.:ext?', function (req, res, next) {
    renderDownload(req, res, next, 'pages/occurrence/download/key/occurrenceDownloadKey');
});

function renderDownload(req, res, next, template) {
    var key = req.params.key,
        offset = req.query.offset || 0,
        limit = 500;

    var datasetsUrl = apiConfig.occurrenceDownload.url + key + '/datasets?offset=' + offset + '&limit=' + limit;
    Promise.all([downloadHelper.getResource(datasetsUrl), Download.get(key)]).then(function(values){
        let datasets = values[0],
            download = values[1];
        download.datasets = datasets;
        download.isFileAvailable = _.get(download, 'record.downloadLink') && _.get(download, 'record.status') !== 'FILE_ERASED';

        let downloadDoi = _.get(download, 'record.doi', '').substring(4);
        let promiseList = [resourceSearch.search({contentType: 'literature', q: '"' + downloadDoi + '"', limit: 0}, req.__)];
        try{
            download.predicateString = JSON.stringify(download.record.request.predicate, undefined, 2);

            if (!download.record.request.predicate) {
                download.noFilters = true;
                Promise.all(promiseList).then(function(completedPromises){
                    download._citationCount = completedPromises[0].count;
                    renderPage(req, res, next, download, template);
                }).catch(function(err){
                console.log(err);
                    next(err);
                });
            } else {
                downloadHelper.addChildKeys(download.record.request.predicate);
                downloadHelper.addSyntheticTypes(download.record.request.predicate);
                downloadHelper.setDepths(download.record.request.predicate);
                download.isSimple = downloadHelper.getSimpleQuery(download.record.request.predicate);
                downloadHelper.flattenSameType(download.record.request.predicate);
                downloadHelper.addpredicateResolveTasks(download.record.request.predicate, queryResolver, promiseList, res.__mf);
                Promise.all(promiseList).then(function(completedPromises){
                    download._citationCount = completedPromises[0].count;
                    renderPage(req, res, next, download, template);
                });
            }
        } catch(err){
            console.log(err);
            if (err.type == 'NOT_FOUND') {
                next();
            } else {
                next(err);
            }
        }

    }, function(err){
        if (err.type == 'NOT_FOUND') {
            next();
        } else {
            next(err);
        }
    });
}

function renderPage(req, res, next, download, template) {
    try {
        if (req.params.ext == 'debug') {
            res.json(download);
        } else {
            if (download.record.status == 'PREPARING' || download.record.status == 'RUNNING') {
                res.setHeader('Cache-Control', 'no-cache');
            } else {
                res.setHeader('Cache-Control', 'public, max-age=' + 600);//10 minutes
            }
            res.render(template, {
                download: download,
                title: 'Ocurrences',
                _meta: {
                    title: res.__('stdTerms.download')
                }
            });
        }
    } catch (e) {
        next(e);
    }
}