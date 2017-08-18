"use strict";
var express = require('express'),
    router = express.Router(),
    apiConfig = rootRequire('app/models/gbifdata/apiConfig'),
    _ = require('lodash'),
    querystring = require('querystring'),
    request = require('requestretry'),
    acceptLanguageParser = require('accept-language-parser'),
    langs = require('langs');


module.exports = function (app) {
    app.use('/api', router);
};

router.get('/species/:key/vernacularName', function (req, res) {
    let namePromise = getVernacularName(req.params.key, req.headers['accept-language']);
    namePromise.then(function(name){
        if (name) {
            res.send(name);
        }
        res.status(204);
        res.send();
    }).catch(function(){
        res.status(500);
        res.send();
    });
});

router.get('/species/:key/vernacularNames', function (req, res) {
    let namePromise = getVernacularNamesProcessed(req.params.key);
    namePromise.then(function(name){
        if (name) {
            res.send(name);
        }
        res.status(204);
        res.send();
    }).catch(function(){
        res.status(500);
        res.send();
    });
});

async function getVernacularName(speciesKey, reqAcceptLanguage) {
    let names = await getVernacularNames(speciesKey);
    let uniqueNames = _.filter(_.uniqBy(names.results, 'language'), 'language');
    uniqueNames = _.keyBy(uniqueNames, 'language');
    let availableLanguages = Object.keys(uniqueNames);
    let availableLanguageCodes = _.map(availableLanguages, function(e){
        let match = langs.where("3", e);
        return _.get(match, '1');
    });
    availableLanguageCodes = _.compact(availableLanguageCodes);
    let requestedLanguages = _.map(acceptLanguageParser.parse(reqAcceptLanguage), 'code');
    let matched2Letter = acceptLanguageParser.pick(availableLanguageCodes, reqAcceptLanguage);
    if (matched2Letter && requestedLanguages.includes(matched2Letter)) {
        let matched3Letter = _.get(langs.where('1', matched2Letter), '3');
        return uniqueNames[matched3Letter];
    }
}

async function getVernacularNamesProcessed(speciesKey){
    let names = await getVernacularNames(speciesKey);
    let namesWithLanguage = {};
    let namesWithoutLanguage = [];
        for(var i = 0; i< names.results.length; i++){
            if(!names.results[i].language){
                namesWithoutLanguage.push(names.results[i]);
            } else {

                if(!namesWithLanguage[names.results[i].language]) {

                    namesWithLanguage[names.results[i].language] = {};
                };

               if(!namesWithLanguage[names.results[i].language][names.results[i].vernacularName.toLowerCase()]){
                   namesWithLanguage[names.results[i].language][names.results[i].vernacularName.toLowerCase()] = [names.results[i]]
                } else {
                   namesWithLanguage[names.results[i].language][names.results[i].vernacularName.toLowerCase()].push(names.results[i])
                }
            }
        }

        _.each(namesWithoutLanguage, function(n){
            _.find(namesWithLanguage, function(val, key){
                 return  _.find(val, function(v,k){
                            if(n.vernacularName.toLowerCase() === k){
                                v.push(n);
                                return true;
                            } else {
                                return false;
                            }
                    } )
            })
        });

     return namesWithLanguage

}

async function getVernacularNames(speciesKey) {
    let query = {
        limit:100
    };
    let baseRequest = {
        url: apiConfig.taxon.url + speciesKey + '/vernacularNames?' + querystring.stringify(query),
        timeout: 30000,
        method: 'GET',
        json: true,
        fullResponse: true
    };
    let response = await request(baseRequest);
    if (response.statusCode !== 200) {
        throw response;
    }
    return response.body;
}

