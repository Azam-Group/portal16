"use strict";

var apiConfig = rootRequire('app/models/gbifdata/apiConfig'),
    _ = require('lodash'),
    chai = require('chai'),
    expect = chai.expect,
    querystring = require('querystring'),
    request = require('requestretry');

async function expand(items){
    return items;
    //expect(node).to.be.an('object');
    //
    //let identifiers = node.identifiers || [],
    //    directoryParticipant = _.find(identifiers, {type: 'GBIF_PARTICIPANT'});
    //node.participantId = _.get(directoryParticipant, 'identifier');
    //return node;
}

async function query(query, options){
    options = options || {};
    let threshold = options.threshold || 80;
    query = query || {};

    let baseRequest = {
        url: apiConfig.taxonMatch.url + '?' + querystring.stringify(query),
        timeout: options.timeout || 30000,
        method: 'GET',
        json: true
    };

    let items = await request(baseRequest);
    if (items.statusCode > 299) {
        throw items;
    }
    return getSuggestions(items.body, threshold);
}

function getSuggestions(body, threshold){
    let results = [],
    alternatives = body.alternatives,
    firstResult = body;
    delete firstResult.alternatives;
    if (!_.isUndefined(firstResult.usageKey)) {
        results.push(firstResult);
    }
    if (_.isArray(alternatives)) {
        results = _.concat(results, alternatives);
    }
    results = _.filter(results, function(e){return e.confidence > threshold});
    results = _.orderBy(results, ['confidence'], ['desc']);
    return results;
}


module.exports = {
    query: query
};