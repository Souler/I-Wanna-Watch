var fs = require('fs');
var path = require('path');
var readline = require('readline');
var touch = require('touch');
var async = require('async');
var request = require('request');
var FileCookieStore = require('tough-cookie-filestore');

var contentSites = require(path.join(__dirname, './handlers/sites')); 
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
		videoSites.init,
		contentSites.init,
		logins
	], function(err) {
		if (err)
			throw new Error(err);

		cb();
	});
}

var logins = function(cb) {
	console.info("Performing logins...");

	var config = require(path.join(__dirname, './config.js'));
	var asyncFns = [];

	if (!config.accounts)
		return cb("No accounts defined on config");

	for (site in config.accounts) {
		var handler = contentSites.getHandler(site);
		var fn = function(_cb) {
			handler.login(config.accounts[site], _cb);
		}
		asyncFns.push(fn);
	}

	async.parallel(asyncFns, cb);
}

var search_show = function() {

	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	console.info("Insert your tv show search below")
	rl.question("> ", function(query) {
		async.waterfall([
			init,
			function(cb) {
				contentSites.search(query, cb);
			},
			function(search, cb) {
				var fns = {};
				Object.keys(search).forEach(function(site) {
					var shows = search[site];
					fns[site] = function(_cb) {
						contentSites.getHandler(site).tvshow(shows[0].id, _cb);
					};
				});
				async.parallel(fns, cb);
			}
		], function(err, result) {
			console.log(err);
			console.log(result);
			fs.writeFileSync(query+'.json', JSON.stringify(result, null, 2));
			rl.close();
		});

	});	
}

search_show();