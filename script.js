var fs = require('fs');
var util = require('util');
var path = require('path');
var readline = require('readline');
var zpad = require('zpad');
var async = require('async');
var _ = require('underscore');

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
	var tvshowName = null;
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
					tvshowName = show.title;
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
						tvshowName = show.title;
						contentSite.tvshow(show.id, cb);
					})
				}

				askChoice();
			},
			function (seasons, cb) {
				var fns = [];

				console.info("Found %d seasons for this show.", seasons.length);
				seasons.forEach(function(season) {
					console.info("Season %d has %d episodes.", season.number, season.episodes.length);
					season.episodes.forEach(function(episode) {
						episode.links = [];
						episode.hash = util.format("%s_s%se%s",  episode.title.replace(/\s+/g, '_'), zpad(season.number, 2), zpad(episode.number));
						var fn = function(_cb) {
							contentSite.episode(episode.id, function(err, links) {
								if (err)
									return _cb(err);
								episode.links = links;
								console.info('Found %d links for episode %s', links.length, episode.hash);
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
			function (seasons, cb) { // Select prefered language
				var langs = {};
				seasons.forEach(function(season) {
					season.episodes.forEach(function(episode) {
						episode.links.forEach(function(link) {
							if (langs[link.lang])
								langs[link.lang] += 1;
							else
								langs[link.lang] = 1;
						});
					});
				});

				var askChoice = function() {
					console.info('Select the prefered language for the show:')
					Object.keys(langs).forEach(function(lang, idx) {
						console.info('%d. %s (%d links)', idx+1, lang, langs[lang]);
					})

					rl.question("> ", function(pick) {
						var n = Number(pick);
						if (isNaN(n) || n < 1 || n > Object.keys(langs).length + 1) {
							console.info("Wrong choice. Please, write a valid number from the list");
							return askChoice();
						}

						var lang = Object.keys(langs)[n-1];
						console.info("Selected %s.", lang);

						seasons.forEach(function(season) {
							season.episodes.forEach(function(episode) {
								episode.links = episode.links.filter(function(link) {
									return link.lang == lang;
								})
							})
						});

						cb(null, seasons);
					})
				}

				askChoice();
			},
			function (seasons, cb) { // Select subtitles choice
				var subs = {};
				seasons.forEach(function(season) {
					season.episodes.forEach(function(episode) {
						episode.links.forEach(function(link) {
							var s = link.subtitles === false ? 'No subtitles' : link.subtitles;
							if (subs[s])
								subs[s] += 1;
							else
								subs[s] = 1;
						});
					});
				});

				var askChoice = function() {
					console.info('Select the subtitles for the show:')
					Object.keys(subs).forEach(function(sub, idx) {
						console.info('%d. %s (%d links)', idx+1, sub, subs[sub]);
					})

					rl.question("> ", function(pick) {
						var n = Number(pick);
						if (isNaN(n) || n < 1 || n > Object.keys(subs).length + 1) {
							console.info("Wrong choice. Please, write a valid number from the list");
							return askChoice();
						}

						var sub = Object.keys(subs)[n-1];
						console.info("Selected %s.", sub);

						seasons.forEach(function(season) {
							season.episodes.forEach(function(episode) {
								episode.links = episode.links.filter(function(link) {
									return link.subtitles == sub;
								})
							})
						});

						cb(null, seasons);
					})
				}

				askChoice();
			},
			function (seasons, cb) {
				var episodes = [];
				seasons.forEach(function(season) {
					season.episodes.forEach(function(episode) {
						episode.links = episode.links.filter(function(link) {
							return videoSites.canHandle(link.href);
						});
						if (episode.links.length > 0)
							episodes.push(episode);
						else
							console.error('%s has no links that I can handle!', episode.hash);
					});
				});

				async.each(
					episodes,
					function (episode, _cb) {
						async.detectSeries(
							episode.links,
							function (link, __cb) {
								videoSites.handle(link.href, function (err, video_uri) {
									var isOk = !!(!err && video_uri);
									if (isOk)
										episode.video_uri = video_uri;
									return __cb(isOk);
								})
							},
							function (err) {
								_cb(null);
							}
						)
					},
					function (err) {
						if (err)
							return cb(err);
						else
							return cb(null, seasons);
					}
				)
			},
			function (seasons, cb) {
				console.info('Generating show directory structure');
				var showDir = path.join(__dirname, tvshowName);
				if (!fs.existsSync(showDir))
					fs.mkdirSync(showDir);

				seasons.forEach(function(season) {
					var seasonDir = path.join(showDir, 'Season ' + season.number);
					if (!fs.existsSync(seasonDir))
						fs.mkdirSync(seasonDir);
					season.episodes.forEach(function(episode) {
						var episodeFile = path.join(seasonDir, episode.hash + '.strm');
						fs.writeFileSync(episodeFile, episode.video_uri);
					});
				});
				
				cb();
			}
		], function(err, result) {
			if (err) {
				console.log(err.stack);
				console.log(err);
				return process.exit(1);
			}
			process.exit(0);
		});

	});	
}

async.series([
	init,
	search_show
])