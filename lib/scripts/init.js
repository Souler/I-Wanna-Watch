var path = require('path');
var touch = require('touch');
var yargs = require('yargs')
var async = require('async');
var request = require('request');
var FileCookieStore = require('tough-cookie-filestore');

var errors = require(path.join(__dirname, '../errors')); 
var videoSites = require(path.join(__dirname, '../handlers/video'));

/**
  Initialize all sites available in config
*/
var init = function(cb) {

	var cookieFilePath = path.join(yargv.dir, './.cookies-iww.json');
	touch.sync(cookieFilePath);
	var j = request.jar(new FileCookieStore(cookieFilePath));

	var defaultHeaders = {
		'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:37.0) Gecko/20100101 Firefox/37.0',
		'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
		'Accept-Language': 'en-US,en;q=0.5'
	};

	global.request = request.defaults({ 
		jar : j,
		gzip: true,
		headers: defaultHeaders
	});

	global.request.defaultHeaders = defaultHeaders;

	async.series([
		errors.init,
		videoSites.init,
	], function(err) {
		if (err)
			throw new Error(err);

		cb();
	});
}

var argumentsInit = function(cb) {
	/**
	Config: 
	-d, --dir : Working irectory. Here is where shows/films will be saved or updated from.
	-t, --test : Test if all links in working dir still working
	-u, --update: 
	-i, --interactive : Turns the script into an interactive console script for downloading shows
	-q, --query : Search query to use when adding content
	-l, --lang : Language to choose when adding content
	-s, --subtitles : Subtitles config to choose when adding content

	--tv : Search for TV Shows [ Default ]
	--film : Search for films
	*/
	global.yargv = yargs
		.option('d', {
			alias: 'dir',
			demand: true,
			type: 'string',
			describe: 'Working directory for shows/films.',
		})
		.option('u', {
			alias: 'update',
			demand: false,
			type: 'boolean',
			describe: 'Update shows/films in working directory'
		})
		.option('i', {
			alias: 'interactive',
			demand: false,
			type: 'boolean',
			describe: 'Interactive script for adding shows/films'
		})
		.option('q', {
			alias: 'query',
			demand: false,
			type: 'boolean',
			describe: 'Search query for interactive mode'
		})
		.argv;
}

argumentsInit();
module.exports = init;