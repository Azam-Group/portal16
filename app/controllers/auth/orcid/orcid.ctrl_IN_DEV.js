"use strict";
let express = require('express'),
    router = express.Router(),
    domain = rootRequire('config/config').domain,
    credentials = rootRequire('config/credentials').auth.orcid,
    passport = require('passport'),
    _ = require('lodash'),
    btoa = require('btoa'),
    atob = require('atob'),
    authProviderUtils = require('../authProviderUtils'),
    querystring = require('querystring'),
    User = require('../../api/user/user.model'),
    auth = require('../auth.service'),
    OrcidStrategy = require('passport-orcid').Strategy,
    clientId = credentials.clientId,
    clientSecret = credentials.clientSecret,
    callbackURL = domain + '/auth/orcid/callback';

let scope = '/authenticate';

module.exports = function (app) {
    app.use('/auth', router);
};

router.get('/orcid/connect', passport.authenticate('orcid'));

//router.get('/orcid/callback', function (req, res, next) {
//    passport.authenticate('orcid', {scope: scope}, function (err, user, info) {
//        //TODO to implement - only to see that it all works and we can get info from orcID
//        //TODO send to page with option to select username and email and optional password. How to store the userid? encode it as a temporary token?
//        res.json({err, user, info});
//    })(req, res, next);
//});


router.get('/orcid/connect', auth.isAuthenticated(), function (req, res, next) {
    let state = {action: 'CONNECT', target: req.headers.referer || '/'};
    let stateB64 = btoa(JSON.stringify(state));
    passport.authenticate('orcid', {scope: scope, state: stateB64})(req, res, next);
});

router.get('/orcid/disconnect', auth.isAuthenticated(), function (req, res, next) {
    _.set(req.user, 'systemSettings["auth.orcid.id"]', undefined);
    User.update(req.user.userName, req.user)
        .then(function(){
            res.redirect(302, req.headers.referer || '/');
        })
        .catch(function(err){
            next(err);
        });
});

router.get('/orcid/login', function (req, res, next) {
    let state = {action: 'LOGIN', target: req.headers.referer || '/'};
    let stateB64 = btoa(JSON.stringify(state));
    passport.authenticate('orcid', {scope: scope, state: stateB64})(req, res, next);
});

router.get('/orcid/callback', auth.appendUser(), function (req, res, next) {
    passport.authenticate('orcid', {scope: scope}, function (err, profile, info) {
        console.log(err, profile, info);
        res.json({err, profile, info});
        //authProviderUtils.authCallback(req, res, next, err, profile, info, setProviderValues, 'ORCID', 'auth.orcid.id');
    })(req, res, next);
});

function setProviderValues(user, profile) {
    _.set(user, 'systemSettings["auth.orcid.id"]', profile.id);
}

passport.use(new OrcidStrategy({
        clientID: clientId,
        clientSecret: clientSecret,
        callbackURL: callbackURL,
        scope: scope
    },

    // orcid will send back the token and params
    function (accessToken, refreshToken, params, profile, done) {
        // NOTE: `profile` is empty, use `params` instead
        done(null, {params, accessToken, refreshToken, profile});
    })
);
