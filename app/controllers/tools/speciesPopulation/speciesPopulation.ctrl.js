"use strict";

var express = require('express'),
    router = express.Router();

module.exports = function (app) {
    app.use('/', router);
};

router.get('/tools/species-population', function (req, res, next) {
    try {
        res.render('pages/tools/speciesPopulation/speciesPopulation', {
            _meta: {
                title: 'Species Population',
                hideFooter: true
            }
        });
    } catch (err) {
        next(err);
    }
});

router.get('/embed/species-population', function (req, res, next) {
    try {
        res.render('pages/tools/speciesPopulation/speciesPopulationEmbed', {
            _meta: {
                title: 'Species Population',
                hideFooter: true,
                removeMenu: true
            }
        });
    } catch (err) {
        next(err);
    }
});