/*
	This script tests a set of STRM files video sources for down links.
	It ONLY CHECKS, DOES NOT FIX THEM. If you want to fix them use the update took
*/
var url = require('url');
var path = require('path');
var http = require('http');
var async = require('async');
var glob = require('glob');
var express = require('express');

var init = require('./init');
var STRMFile = require('../files/strmfile');

var app = express();

var initApiResponses = function (req, res, next) {
	res.api = {};
	res.api.ok = function(data) {
		res.json({ code: 0, data: data });
	}
	res.api.error = function(error, error_code) {
		res.json({ code: error_code || 1, error: error });
	}
	next();
}

var listTvShows = function (req, res, next) {
	var showsGlob = path.join(yargv.dir, './*/');

	var globHandler = function (err, shows) {
		if (err)
			return res.api.error(err);

		// Get only the show name and not the full path
		shows = shows.map(function (show) {
			var splitted = show.split('/');
			return { name: splitted[splitted.length - 2] }
		});

		return res.api.ok(shows);
	};

	glob(showsGlob, globHandler);
}

var listTvShowLinks = function (req, res, next) {
	req.params.tvshow = req.params.tvshow.replace(/\+/g, ' ');
	var showGlob = path.join(yargv.dir, req.params.tvshow, './**/*.strm');

	var globHandler = function (err, chapters) {
		if (err)
			return res.api.error(err);

		var strmFiles = chapters.map(function (chapter) {
			return STRMFile.load(chapter);
		})

		return res.api.ok(strmFiles);
	};

	glob(showGlob, globHandler);
}


var morgan = require('morgan')
app.use(morgan('dev'));	

app.use(initApiResponses);
app.get('/api/tvshow/list', listTvShows);
app.get('/api/tvshow/:tvshow', listTvShowLinks);


app.listen(4000);


return;
/*
	Async function. Determines if the strmFile needs to be refreshed because
	its videoUri is down or not because its video source still up.
*/
var checkSTRMFile = function(strmFile, cb) {

	// Helper function
	var err = function(err) {
		return cb(true);
	}

	// We have no video uri at all, so we need it
	if (strmFile.videoUri == null)
		return err();

	var allowedContentTypes = [ // List of Content-Type that we accept as valid video sources
		'application/octet-stream',
		'video/mp4'
	];

	/*
		NOTE: We dont use request here because it adds a content-lengt: 0 header
		that mess with some cdn services. If anyone finds a way arround for using
		request instead of node built-in http, feel free to change this
	*/
	var parsedUri = url.parse(strmFile.videoUri);
	var opts = {
		method: 'HEAD',
		hostname: parsedUri.hostname,
		port: parsedUri.port,
		path: parsedUri.path,
		headers: request.defaultHeaders
	};

	var req = http.request(opts, function (res) {

		// If an error occurs checking the video source, we need to refresh the video source link
		res.on('error', err);
		var contentType = res.headers['content-type'];

		if (allowedContentTypes.indexOf(contentType) < 0)
			return err();

		strmFile.save();
		// Everything is ok at this point, this strm file doesn't need to be refreshed
		cb(false);
	});

	// If an error occurs checking the video source, we need to refresh the video source link
	req.on('error', err);
	req.end();
}

var testScript = function(cb) {

	if (!(cb instanceof Function)) {
		cb = function(err, result) {
			if (err)
				return console.error(err);

			console.log(JSON.stringify(result, null, 2));
			console.log('Found %d files that need to be fixed', result.length);

			process.exit(0);
		}
	}

	var files = glob.sync(path.join(yargv.dir, '**/*.strm'));
	var strmFiles = files.map(function(f) {
		return STRMFile.load(f);
	});

	var asyncFns = [];

	// If the script is being run directly we need to initialize
	if (!module.parent)
		asyncFns.push(init);

	var filesFilter = function (_cb) {
		async.filterSeries(strmFiles, checkSTRMFile, function (results) {
			_cb(null, results);
		});
	};

	asyncFns.push(filesFilter);

	return async.waterfall(asyncFns, cb);
}

// The script is being run directly
if (!module.parent)
	testScript();

module.exports = testScript;
