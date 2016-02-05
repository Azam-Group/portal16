var express = require('express'),
    router = express.Router(),
    log = rootRequire('config/log');

module.exports = function (app) {
    app.use('/', router);
};

router.get('/occurrence/:key', function (req, res, next) {
    var occurrenceKey = req.params.key;
    var url = "http://api.gbif.org/v1/occurrence/" + occurrenceKey;
    
    require('request')(url, function(err, resp, body) {
		if (resp.statusCode != 200 || err) {
			res.status(404);
			next()
		} else {
			body = JSON.parse(body);
			var showMap = body.decimalLongitude && body.decimalLatitude;
			res.render('pages/occurrence/key/occurrenceKey', {
				body: body,
				showMap: showMap
			});
		}
	});
});