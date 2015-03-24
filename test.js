
var async = require('async');

var VideoHandler = require('./handlers/video');
//var SiteHandler = require('./handlers/sites');
var pordede = require('./handlers/sites/pordede');
async.series([
	pordede.login,
	function(cb) {
		pordede.search('better call saul', cb);
	}
], console.log);


return;
VideoHandler.init(function(err) {
	console.log(err);
	VideoHandler.handle('http://vidspot.net/m5kfi66hlpcn', function(err, uri) {
		console.log(err);
		console.log(uri);
		download(uri)
	});
});

var download = function(uri) {
	var fs = require('fs');
	var request = require('request');
	var progress = require('request-progress');
	 
	// Note that the options argument is optional 
	progress(request(uri), {
	    throttle: 2000,  // Throttle the progress event to 2000ms, defaults to 1000ms 
	    delay: 1000      // Only start to emit after 1000ms delay, defaults to 0ms 
	})
	.on('progress', function (state) {
	    console.log('received size in bytes', state.received);
	    // The properties bellow can be null if response does not contain 
	    // the content-length header 
	    console.log('total size in bytes', state.total);
	    console.log('percent', state.percent);
	})
	.on('error', function (err) {
	    // Do something with err 
	})
	.pipe(fs.createWriteStream('video.mp4'))
	.on('error', function (err) {
	    // Do something with err 
	})
	.on('close', function (err) {
	    // Saved to doogle.png! 
	})
}