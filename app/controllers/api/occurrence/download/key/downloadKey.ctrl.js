"use strict";
var express = require('express'),
    router = express.Router(),
    auth = require('../../../../auth/auth.service'),
    _ = require('lodash'),
    downloadHelper = require('../../../../occurrence/download/downloadKeyHelper');

const querystring = require('querystring');

module.exports = function (app) {
    app.use('/api', router);
};

router.get('/occurrence/download/:key', auth.appendUser(), function (req, res) {
    if (req.user) {
        auth.setNoCache(res);
    }
    downloadHelper.getDownload(req.params.key, _.get(req, 'user.userName'))
        .then(function(download){
            res.json(download);
        })
        .catch(function(err){
            res.status(err.statusCode || 500);
            res.send();
        })
});

router.post('/occurrence/download/:key/delete', auth.isAuthenticated(), function (req, res) {
    auth.setNoCache(res);
    downloadHelper.deleteDownload(req.params.key, _.get(req, 'user.userName'))
        .then(function(download){
            //res.status(201);
            res.json(download);
        })
        .catch(function(err){
            res.status(err.statusCode || 500);
            res.send();
        })
});

router.post('/occurrence/download/:key/postpone', auth.isAuthenticated(), function (req, res) {
    auth.setNoCache(res);
    downloadHelper.postponeDeletion(req.params.key, _.get(req, 'user.userName'))
        .then(function(download){
            //res.status(201);
            res.json(download);
        })
        .catch(function(err){
            res.status(err.statusCode || 500);
            res.send();
        })
});