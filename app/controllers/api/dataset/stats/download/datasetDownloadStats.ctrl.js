"use strict";
var express = require('express'),
    router = express.Router(),
    getDownloadStats = require('../../../../../models/gbifdata/gbifdata').getDownloadStats;

module.exports = function (app) {
    app.use('/api', router);
};

router.get('/dataset/stats/download/:key', function (req, res, next) {
    var datasetKey = req.params.key;
    getDownloadStats(datasetKey, 200).then(function (data) {
        res.json(data);
    }, function (err) {
        next(err);
    });
});
