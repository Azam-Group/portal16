"use strict";

var apiConfig = rootRequire('app/models/gbifdata/apiConfig'),
    querystring = require('querystring'),
    _ = require('lodash'),
    request = require('requestretry');

async function get(key, depth) {
    depth = depth || 0;
    let baseRequest = {
        url: apiConfig.dataset.url + key,
        timeout: 30000,
        method: 'GET',
        json: true
    };
    let node = await request(baseRequest);
    if (node.statusCode > 299) {
        throw node;
    }
    if (depth > 0) {
        depth--;
        return expandNode(node.body, depth);
    } else {
        return node.body;
    }
}

async function expandNode(node){
    //TODO stub. inteded to expand foreign keys, related etc. datasetKey, constituentDatasetKey, name, references etc
    return node;
}

async function query(query, options){
    options = options || {};
    query = query || {};

    let baseRequest = {
        url: apiConfig.datasetSearch.url + '?' + querystring.stringify(query),
        timeout: options.timeout || 30000,
        method: 'GET',
        json: true
    };

    let datasets = await request(baseRequest);
    if (datasets.statusCode > 299) {
        throw datasets;
    }
    extractHighlights(datasets.body, query)
    return datasets.body;
}

function extractHighlights(data, query) {
    "use strict";
    var re = /(([^\s>]+)\s){0,3}(\s*<em class="gbifHl">[^<]*<\/em>\s*)+([^\s<]+\s){0,2}([^\s<]*)/;

    _.each(data.results, function (item) {
        let highlights = {};
        if(item.description){


                let match = re.exec(item.description);
                if(match){
                    highlights.description = (match[0])
                }


        }

        if(item.keywords && query.q){
            let kwMatch = _.find(item.keywords, function(k){
                return k.toLowerCase() === query.q.toLowerCase();
            });
            if(kwMatch){


                var remainders = _.filter(item.keywords, function(k){
                    return k !== kwMatch;
                });

                highlights.keywords = '<em class="gbifHl">'+kwMatch+'</em>, '+ remainders.slice(0, 2).join(", ");
                if(remainders.length > 2){
                    highlights.keywords += "....."
                }

            }

        }


        item.highlights = highlights;

    });
    return data
}

module.exports = {
    get: get,
    query: query,
    extractHighlights : extractHighlights
};