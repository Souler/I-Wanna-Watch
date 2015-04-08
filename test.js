var fs = require('fs');
var util = require('util');
var path = require('path');
var touch = require('touch');
var async = require('async');
var request = require('request');
var FileCookieStore = require('tough-cookie-filestore');
var config = require('./config.js');

var VideoHandler = require('./handlers/video');

// //var SiteHandler = require('./handlers/sites');
// var pordede = require('./handlers/sites/pordede');

var cookieFilePath = path.join(__dirname, './.cookies.json');
touch.sync(cookieFilePath);
var j = request.jar(new FileCookieStore(cookieFilePath));
global.request = request.defaults({ 
    jar : j,
    headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:34.0) Gecko/20100101 Firefox/34.0',
    }
});

// var canonize = function(showname, episodename, season, chapter) {
//     var s = [showname, episodename].map(function(e) {
//         return e.toLowerCase()
//                 .replace(/\s*/, ' ')
//                 .replace(/^\s/, '')
//                 .replace(/\s$/, '')
//                 .replace(/[^a-z0-9_]/gi, '_');
//     });
    
//     var n = [season, chapter].map(function(e) {
//                 if (isNaN(e))
//                     return "00";
//                 e = Number(e);
//                 if (e<10)
//                     return "0" + e;
//                 else
//                     return e;
//             });

//     var pattern = "%s-%s-s%se%s";
//     return util.format(pattern, s[0], s[1], n[0], n[1]);
// }

// var show = {};
// async.waterfall([
//     function(cb) {
//         pordede.login(config.accounts['pordede.com'], cb);
//     },
//     function(dummy, cb) {
//         pordede.search('better call saul', cb);
//     },
//     function(shows, cb) {
//         show = shows[0];
//         pordede.tvshow(shows[0].id, cb);
//     },
//     function(seasons, cb) {
//         show.episodes = [];
//         seasons.forEach(function(s, sn) {
//             s.episodes.forEach(function(c) {
//                 c.name = canonize(show.title, c.title, sn, c.number);
//                 c.season = sn;
//                 show.episodes.push(c)
//             });
//         });

//         async.map(show.episodes, function(ep, _cb) {
//             pordede.episode(ep.id, _cb);
//         }, function(err, result) {
//             if (err)
//                 return cb(err);

//             show.episodes.forEach(function(ep, idx) {
//                 ep.links = result[idx];
//             });

//             cb(null, show);
//         });
//     }
// ], function(err, result) {
//     if (err)
//         console.log(err);
//     else {
//         console.log(JSON.stringify(result, null, 2));
//         fs.writeFileSync(result.id+'.json', JSON.stringify(result, null, 2));
//     }
// });


// return;
VideoHandler.init(function(err) {
    console.log(err);
    VideoHandler.handle('http://www.nowvideo.sx/video/a331047a8bab1', function(err, uri) {
        console.log(err);
        console.log(uri);
        // download(uri)
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