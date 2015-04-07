/**
    VIDSPOT Handler

    Given an url to a video: VIDEO_URL.
    We perform a get to VIDEO_URL  wich return an HTML body. Inside
    that body there is a form with hidden fields (basically the "Continue to Video" button
    we see when opening the web on a client).
    After exctracting that hidden fields from the form we perform a POST to the same VIDEO_URL
    with the before mentioned form data.
    On the HTML response to that POST there will be a script tag containing a jwConfig with
    the real video soruce uri we are looking for.
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