var fs = require('fs');
var util = require('util');
var path = require('path');
var readline = require('readline');
var zpad = require('zpad');
var async = require('async');
var _ = require('underscore');

var init = require('./init'); 
var contentSites = require('../handlers/sites'); 
var videoSites = require('../handlers/video');

var STRMFile = require('../files/strmfile');

/**
  Initialize all sites available in config
*/
var init = init;

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

	// TODO: Fix this, we should use the contentSites in some way
	var contentSite = require('../handlers/sites/hdfull');
	var tvshowName = null;

	if (yargv.query == undefined || yargv.query.length <= 0) {
		console.error('No query defined. Give me a query to search via --query argument.');
		return process.exit(1);
	}

	async.waterfall([
		function (cb) {
			contentSite.search(yargv.query, cb);
		},
		function (search, cb) {
			if (search.length <= 0)
				return cb(new NoQueryResultFoundError(yargv.query));

			if (yargv.strict) {
				search = search.filter(function (show) {
					return show.title == yargv.query;
				})
			}

			if (search.length == 1) {
				var show = search[0];
				console.info("Found only one result. Using %s", show.title);
				tvshowName = show.title;
				return contentSite.tvshow(show.id, cb);
			}

			console.info("Found more than one result for '%s'. Please call me again with a more acurate query from the list below:", yargv.query);
			console.info("If you can't be more explicit with the TV Show title, try using --strict.")
			search.forEach(function(s, idx) {
				console.info(s.title);
			});

			return process.exit(1);
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

			if (yargv.lang == undefined || yargv.lang.length <= 0 || Object.keys(langs).indexOf(yargv.lang) < 0) {
				console.info("These are the available languages for this show. Select one and tell me via --lang argument.");
				Object.keys(langs).forEach(function (lang) {
					console.log(lang);
				});
				return process.exit(1);
			}

			var lang = yargv.lang;
			console.info("Selected %s.", lang);

			seasons.forEach(function(season) {
				season.episodes.forEach(function(episode) {
					episode.links = episode.links.filter(function(link) {
						return link.lang == lang;
					})
				})
			});

			cb(null, seasons);
		},
		function (seasons, cb) { // Select subtitles choice
			var subs = {};
			seasons.forEach(function(season) {
				season.episodes.forEach(function(episode) {
					episode.links.forEach(function(link) {
						if (link.subtitles === false)
							return;

						if (subs[link.subtitles])
							subs[link.subtitles] += 1;
						else
							subs[link.subtitles] = 1;
					});
				});
			});

			// We had a --subtitles option but no lang specified for that (or incorrect one)
			if (yargv.subtitles !== undefined && (yargv.subtitles.length <= 0 || Object.keys(subs).indexOf(yargv.subtitles) < 0)) {
				console.info("These are the available subtitles languages for this show. Select one and tell me via --subtitles argument.");
				Object.keys(subs).forEach(function (sub) {
					console.info(sub);
				});
				return process.exit(1);
			}

			var sub = yargv.subtitles !== undefined ? yargv.subtitles : false;

			console.info("Selected %s for subtitles.", sub == false ? 'no subtitles' : sub);

			seasons.forEach(function(season) {
				season.episodes.forEach(function(episode) {
					episode.links = episode.links.filter(function(link) {
						return link.subtitles === sub;
					})
				})
			});

			cb(null, seasons);
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
					async.detect(
						episode.links,
						function (link, __cb) {
							videoSites.handle(link.href, function (err, video_uri) {
								var isOk = !!(!err && video_uri);
								if (isOk) {
									episode.video_uri = video_uri;
									episode.video_source = link.href;
								}
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
			var showDir = path.join(yargv.dir, tvshowName);
			if (!fs.existsSync(showDir))
				fs.mkdirSync(showDir);

			seasons.forEach(function(season) {
				var seasonDir = path.join(showDir, 'Season ' + season.number);
				if (!fs.existsSync(seasonDir))
					fs.mkdirSync(seasonDir);
				season.episodes.forEach(function(episode) {
					var episodeFile = path.join(seasonDir, episode.hash + '.strm');
					var strmOptions = {
						'TV-SHOW': tvshowName,
						'TITLE': episode.title,
						'HASH': episode.hash,
						'SITE': 'hdfull.tv', // TODO: Fix me
						'ID': episode.id,
						'SOURCE': episode.video_source

					};
					var strmFile = new STRMFile(episodeFile, episode.video_uri, strmOptions);
					strmFile.save();
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
}

async.series([
	init,
	search_show
])