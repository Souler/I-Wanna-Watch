var path = require('path');
var touch = require('touch');
var async = require('async');
var request = require('request');
var FileCookieStore = require('tough-cookie-filestore');

var errors = require(path.join(__dirname, './errors')); 
var videoSites = require(path.join(__dirname, './handlers/video'));

/**
  Initialize all sites available in config
*/
var init = function(cb) {
	var cookieFilePath = path.join(__dirname, './.cookies.json');
	touch.sync(cookieFilePath);
	var j = request.jar(new FileCookieStore(cookieFilePath));
	global.request = request.defaults({ 
		jar : j,
		headers: {
    		'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:34.0) Gecko/20100101 Firefox/34.0',
		}
	});

	async.series([
		errors.init,
		videoSites.init,
	], function(err) {
		if (err)
			throw new Error(err);

		cb();
	});
}

module.exports = init;