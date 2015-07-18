var async = require('async');

var init = require('./init.js');
var videoSites = require('./handlers/video');

var testCases = {
	'powvideo.net': {
		ok: 'http://powvideo.net/gbk70ija0f3e',
		// VideoSiteFileError: 'http://powvideo.net/gbk70ija0f3e'
	},
	'allmyvideos.net': {
		ok: 'http://allmyvideos.net/vnqwk02o28vf',
		VideoSiteFileError: 'http://allmyvideos.net/efbmow52nrvj'
	},
	'streamin.to': {
		ok: 'http://streamin.to/oa3bq8q4g6vp',
		VideoSiteFileError: 'http://streamin.to/fl5t9o5xhf2i',
	},
	'streamcloud.eu': {
		ok: 'http://streamcloud.eu/o1dy3yl01mrq/orange.1x01.MP4.html',
	},
	'nowvideo.sx': {
		ok: 'http://www.nowvideo.sx/video/26c62911b575d',
	}
};

init(function() {
	var asyncFns = [];
	var sites = Object.keys(testCases);
	sites.forEach(function(site) {
		var tests = Object.keys(testCases[site]);
		tests.forEach(function(test) {
			var expectError = !/^ok$/.test(test);
			var fn = function(cb) {
				var url = testCases[site][test]
				console.log('Test case %s for site %s. Is error expected? %s', test, site, expectError);
				console.log(url);
				videoSites.handle(url, function(err, videoUri) {
					if (expectError && err && err.name == test)
						console.log('ok. Got %s', err.message);
					if (expectError && !err)
						console.error('Error: Got no error when expecting one');
					if (expectError && err && err.name != test)
						console.error('Error: Got error %s when expecting %s', err.name, test);
					if (!expectError && err)
						console.error('Error: Got error %s when expecting none', err.name);
					if (!expectError && !err && !videoUri)
						console.error('Error: Got no error and no video uri');
					if (!expectError && !err && videoUri)
						console.log('ok. Got %s', videoUri);
					return cb();
				});
			}
			asyncFns.push(fn);
		})
	})

	async.series(asyncFns);
})