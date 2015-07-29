var async = require('async');
var init = require('./init');
var checkScript = require('./check');
var videoSites = require('../handlers/video');

var updateScript = function(cb) {
	var asyncFns = [];

	// If the script is being run directly we need to initialize
	if (!module.parent)
		asyncFns.push(init);

	// After inited, exec the check script for getting the strm files that need to be reworked
	asyncFns.push(checkScript);

	var fixFiles = function(strmFiles, _cb) {
		console.info('Found %d files that need to be updated', strmFiles.length);

		var fixFile = function(strmFile, __cb) {
			var source = strmFile.options.source;

			if (!source) {
				console.log("No source for file %s", strmFile.filepath);
				return __cb();
			}

			videoSites.handle(source, function (err, videoUri) {
				if (err) {
					__cb();
					return console.error(err);
				}

				strmFile.videoUri = videoUri;
				strmFile.save();
				console.info('Updated file : %s', strmFile.filepath);
				__cb();
			});
		}

		async.each(strmFiles, fixFile, _cb);
	}

	asyncFns.push(fixFiles);

	var endProgram = function(_cb) {
		process.exit(0);
	}

	asyncFns.push(endProgram);

	async.waterfall(asyncFns);
}

module.exports = updateScript;

// The script is being run directly
if (!module.parent)
	updateScript();