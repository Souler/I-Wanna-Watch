/**
    NOWVIDEO Handler

    Given an url to a video: VIDEO_URL. TODO
*/
var util = require('util');
var querystring = require('querystring');
var cheerio = require('cheerio');
var async = require('async');

var handles = [
    'nowvideo.sx',
    'www.nowvideo.sx',
];

var handler = function(uri, _cb) {

    if (!_cb || !(_cb instanceof Function))
        throw new Error('No callback specified');

    var options = {
        method: 'GET',
        uri: uri
    }

    var apiParams = {
        cid: "undefined",
        cid2: "undefined",
        cid3: "undefined",
        user: "undefined",
        pass: "undefined",
        file: "undefined",
        key: "undefined",
        numOfErrors: 0
    }

    async.series({
        get: function(cb) {
            request(options, function(err, response, body) {
                if (err)
                    return cb(err);
                
                for (key in apiParams) {
                    var regexStr = util.format('flashvars\.%s="(.*)"', key);
                    var rgx = new RegExp(regexStr);
                    var match = rgx.exec(body);

                    if (match && match[1])
                        apiParams[key] = match[1];
                }

                var regexKey = /var fkzd="(.*)"/;
                var matchFkzd = regexKey.exec(body);

                if (matchFkzd && matchFkzd[1])
                    apiParams.key = matchFkzd[1];

                cb();
            });
        },
        api: function(cb) {
            var paramsStr = querystring.stringify(apiParams);
            options.uri = util.format("http://www.nowvideo.sx/api/player.api.php?%s", paramsStr);
            request(options, function(err, response, body) {
                var params = querystring.parse(body);
                cb(null, params.url)
            });
        }
    }, function(err, result) {
        if (err)
            return _cb(err);
        else
            return _cb(err, result.api);
    });
}

module.exports = {
    handles: handles,
    handler: handler
};