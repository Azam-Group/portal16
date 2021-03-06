'use strict';

const express = require('express'),
    router = express.Router(),
    helper = rootRequire('app/models/util/util'),
    resource = rootRequire('app/controllers/resource/key/resourceKey'),
    directory = require('../api/directory/directory.model'),
    _ = require('lodash'),
    json2md = require("json2md"),
    log = rootRequire('config/log');

module.exports = app => {
    app.use('/', router);
};

router.get('/contact-us', function(req, res, next){
    let isPreview = !_.isUndefined(req.query._isPreview);
    let cmsContent = resource.getByAlias('/contact-us', 2, isPreview, res.locals.gb.locales.current);
    cmsContent.then(function(content){
        helper.renderPage(req, res, next, content, 'pages/custom/contactUs/seo');
    }).catch(function(err){
        log.info(err.message);
        next(err);
    });
});

router.get('/api/template/contactUs/contactUs.html', function(req, res, next){
    let isPreview = !_.isUndefined(req.query._isPreview);
    let cmsContent = resource.getByAlias('/contact-us', 2, isPreview, res.locals.gb.locales.current);
    cmsContent.then(function(content){
        helper.renderPage(req, res, next, content, 'pages/custom/contactUs/contactUs.template.nunjucks');
    }).catch(function(err){
        log.info(err.message);
        res.status = err.statusCode || 500;
        res.send('failed to load template data');
    });
});

router.get('/contact-us/directory', function(req, res, next){
    if (req.query.personId) {
        //render person
        directory.person(req.query.personId)
            .then(function(person) {
                let personMd = json2md([
                    {h2: person.name},
                    {ul: [
                        person.institutionName,
                        person.address
                    ]}
                ]);
                let context = {
                    person: personMd,
                    _meta: {
                        title: person.name
                    }
                };
                helper.renderPage(req, res, next, context, 'pages/custom/contactUs/directory/seo');
            })
            .catch(function(err) {
                next(err);
            });
    } else {
        //render contact us page
        helper.renderPage(req, res, next, {_meta: {noIndex: true, title: 'Directory'}}, 'pages/custom/contactUs/seo');
    }
});