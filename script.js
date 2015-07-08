var fs = require('fs');
var util = require('util');
var path = require('path');
var readline = require('readline');
var zpad = require('zpad');
var touch = require('touch');
var async = require('async');
var request = require('request');
var _ = require('underscore');
var FileCookieStore = require('tough-cookie-filestore');

var errors = require(path.join(__dirname, './errors')); 
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
		errors.init,
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
		try {
			var handler = contentSites.getHandler(site);
			var fn = function(_cb) {
				handler.login(config.accounts[site], _cb);
			}
			asyncFns.push(fn);	
		} catch (e) {
			if (e instanceof NoSiteHandlerError)
				console.warn("Login info was defined for %s, but there is no such handler. Ignoring...", site);
		}
	}

	async.parallel(asyncFns, cb);
}

var search_show = function(_cb) {

	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	var contentSite = require('./handlers/sites/hdfull');
	console.info("Insert your tv show search below")
	rl.question("> ", function(query) {
		async.waterfall([
			function (cb) {
				contentSite.search(query, cb);
			},
			function (search, cb) {
				if (search.length <= 0)
					return cb(new NoQueryResultFoundError(query));

				if (search.length == 1) {
					var show = search[0];
					console.info("Found only one result. Using %s", show.title);
					return contentSite.tvshow(show.id, cb);
				}

				// more than one result
				var askChoice = function() {
					console.info("Select one of the following. Type its number and press enter.")

					search.forEach(function(s, idx) {
						console.info("%d - %s", idx+1, s.title);
					});

					rl.question("> ", function(pick) {
						var n = Number(pick);
						if (isNaN(n) || n < 1 || n > search.length + 1) {
							console.info("Wrong choice. Please, write a valid number from the list");
							return askChoice();
						}

						var show = search[n-1];
						console.info("Selected %d - %s.", n, show.title);
						contentSite.tvshow(show.id, cb);
					})
				}

				askChoice();
			},
			function (seasons, cb) {
				var fns = [];

				console.info("Found %d seasons for this show.", seasons.length);
				seasons.forEach(function(season, n_season) {
					console.info("%s has %d episodes.", season.name, season.episodes.length);
					season.episodes.forEach(function(episode) {
						episode.links = [];
						var episodeHash = util.format("%sx%s_%s", zpad(n_season, 2), zpad(episode.number), episode.title.replace(/\s+/g, '_'));
						var fn = function(_cb) {
							contentSite.episode(episode.id, function(err, links) {
								if (err)
									return _cb(err);
								episode.links = links;
								console.info('Found %d links for episode %s', links.length, episodeHash);
								return _cb();
							})
						}
						fns.push(fn);
					})
				})

				async.series(fns, function(err) {
					if (err)
						return cb(err);
					else
						return cb(null, seasons);
				})
			},
			function (seasons, cb) {
				var links = [];
				seasons.forEach(function(season) {
					season.episodes.forEach(function(episode) {
						episode.links.forEach(function(link) {
							links.push(link);
						});
					});
				});
				var url = require('url');
				links.forEach(function(ln) {
					var up = url.parse(ln.href);
					ln.host = up.host;
				})
				var a = _.groupBy(links, 'host');
				var sites = Object.keys(a);
				sites = sites.map(function(site) {
					return {
						site: site,
						count: a[site].length
					}
				});
				sites = sites.sort(function(a, b) { return b.count - a.count});
				console.log(sites);
				fs.writeFileSync('out.json', JSON.stringify(a, null, 4));
				return;
				async.each(links, function(link, cb) {
					if (!videoSites.canHandle(link.href))
						return cb();
					videoSites.handle(link.href, function(err, videoUri) {
						link.video = videoUri;
						cb();
					})
				});
			}
		], function(err, result) {
			if (err) {
				console.log(err.stack);
				console.log(err);
			}
			console.log(result);
			fs.writeFileSync(query+'.json', JSON.stringify(result, null, 2));
			rl.close();
			_cb();
		});

	});	
}

async.series([
	init,
	search_show
])