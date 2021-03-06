var express = require('express'),
    baseConfig = require('../../../config/config'),
    router = express.Router();

module.exports = function (app) {
    app.use('/', router);
};

router.get('/search', function (req, res, next) {
    try {
        var searchTerm = req.query.q,
        description =  req.__("meta.searchDescription") ;

        if(searchTerm){
        description += " "+ req.__("meta.searchDescriptionDetail", {searchTerm: searchTerm}) ;
        }
            context = {
                query: searchTerm,
                _meta: {
                    bodyClass: 'omnisearch',
                    tileApi: baseConfig.tileApi,
                    title: req.__('stdTerms.search'),
                    description: description
                }
            };

        res.render('pages/search/search', context);
    } catch (err) {
        next(err);
    }
});