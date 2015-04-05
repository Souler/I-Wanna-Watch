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
var cheerio = require('cheerio');
var async = require('async');

var handles = [
    'vidspot.net',
    'allmyvideos.net'
];

var handler = function(uri, _cb) {

    var options = {
        method: 'GET',
        uri: uri
    }

    async.series({
        get: function(cb) {
            request(options, function(err, response, body) {
                if (err)
                    return cb(err);

                var $ = cheerio.load(body);

                var formData = {};
                var formContents = $('form[name=F1]').serializeArray();
                formContents.forEach(function(e) {
                    formData[e.name] = e.value;
                });

                options.formData = formData;
                cb();
            });
        },
        post: function(cb) {
            options.method = 'POST';
            request(options, function(err, response, body) {
                if (err)
                    return cb(err);

                var $ = cheerio.load(body);
                var elems = $('script').filter(function() {
                    return $(this).html().indexOf('jwConfig') >= 0;
                });
                var elem = elems[0];

                /*
                    Now here we do a little magic. Instead of parsing the js code with regex
                    we create dummy functions and then eval the code, in order to get
                    the desired options.
                */
                // jwplayer('flvplayer').setup(jwConfig({/* theese are our options*/});
                var jwplayer = function(player) {
                    var dummy = {};
                    dummy.setup = function(config) {
                        return config;
                    }
                    return dummy;
                }

                var jwConfig = function(config) {
                    return config;
                }

                // Now here we have the config
                var conf = eval($(elem).html());

                // Select the highest quality source
                var source = conf.playlist[0].sources.reduce(function(v, c) {
                    if (v == undefined)
                        return c;
                    if (Number(c.label) > Number(v.label))
                        return c;
                    else
                        return v;
                });

                cb(null, source.file);
            });
        }
    }, function(err, result) {
        if (err)
            return _cb(err);
        else
            return _cb(err, result.post);
    });
}

module.exports = {
    handles: handles,
    handler: handler
};