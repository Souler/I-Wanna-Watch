/**
    jwPlayer-Direct Handler

    Given an url to a video: VIDEO_URL.
    We perform a get to VIDEO_URL  wich return an HTML body. Inside
    that body there is a form with hidden fields (basically the "Continue to Video" button
    we see when opening the web on a web client).
    After exctracting that hidden fields from the form we perform a POST to the same VIDEO_URL
    with the before mentioned form data.
    On the HTML response to that POST there will be a script tag containing a jwConfig with
    the real video soruce uri we are looking for.
*/
var cheerio = require('cheerio');
var async = require('async');

var handles = [
    // 'vidspot.net',
    'streamcloud.eu',
    'streamin.to',
    'allmyvideos.net'
];

var handler = function(uri, _cb) {

    if (!_cb || !(_cb instanceof Function))
        throw new Error('No callback specified');

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

                var err = $('b.err');
                if (err.length > 0)
                    return cb(new VideoSiteFileError(options.uri, err.text()));
                    
                if (body.indexOf('File Deleted.') >= 0)
                    return cb(new VideoSiteFileError(options.uri, 'File Deleted.'));

                var form = $('form[method=POST]');
                if (form.length <= 0)
                    return cb(new NotExpectedStructureError(options.uri));

                options.formData = {};
                var formContents = form.serializeArray();
                formContents.forEach(function(e) {
                    options.formData[e.name] = e.value;
                });
                options.formData['imhuman'] = '+';

                var waitTimer = 0;
                var timer = $('#cxc');
                if (timer.length > 0)
                    waitTimer = Number(timer.text()) + 1;

                var rgxCount = /var count = ([0-9]+)/;
                if (rgxCount.test(body))
                    waitTimer = Number(rgxCount.exec(body)[1]);

                setTimeout(function() { cb() }, waitTimer * 1000);
            });
        },
        post: function(cb) {
            options.method = 'POST';
            request(options, function(err, response, body) {
                if (err)
                    return cb(err);

                var $ = cheerio.load(body);
                var elems = $('script').filter(function() {
                    return $(this).html().indexOf('jwplayer(') >= 0;
                });

                if (elems.length <= 0)
                    return cb(new NotExpectedStructureError(options.uri));

                var elem = elems[0];
                /*
                    Now here we do a little magic. Instead of parsing the js code with regex
                    we create dummy functions and then eval the code, in order to get
                    the desired options.
                */
                // jwplayer('flvplayer').setup(jwConfig({/* theese are our options*/});
                var jwplayer = function(player) {
                    var dummy = {};
                    dummy.setup = function(conf) { // This is where we get our config (and our video uris)
                        // Sometimes file is drectly passed in the config instead of in a playlist
                        if (conf.file)
                            return cb(null,conf.file);

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

                        return conf;
                    }

                    dummy.onBeforePlay = function() { return dummy }
                    dummy.onPlay = function() { return dummy }
                    dummy.onReady = function() { return dummy }
                    dummy.onTime = function() { return dummy }
                    dummy.onSeek = function() { return dummy }
                    dummy.onComplete = function() { return dummy }

                    return dummy;
                }

                var jQuery = function() {
                    return {};
                }

                var jwConfig = function(config) {
                    return config;
                }

                // Now here we have the config
                eval($(elem).html());

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