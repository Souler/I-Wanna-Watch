/**
    POWVIDEO Handler

    Given an url to a video: VIDEO_URL.
    We perform a get to VIDEO_URL  wich return an HTML body. Inside
    that body there is a form with hidden fields (basically the "Continue to Video" button
    we see when opening the web on a client).
    After exctracting that hidden fields from the form we perform a POST to the same VIDEO_URL
    with the before mentioned form data.
    On the HTML response to that POST there will be a script tag containing something like this:
        eval(function(...) { ... } ('...', Number, Number, '...'.split('...')))
    The first function inside the eval generates an evaluable js code for the browser using 
    replaces and displacements based on the args given.
*/
var cheerio = require('cheerio');
var async = require('async');

var handles = [
    'powvideo.net',
];

var handler = function(uri, _cb) {

    if (!_cb || !(_cb instanceof Function))
        throw new Error('No callback specified');

    var options = {
        method: 'GET',
        uri: uri
    }

    var body1 = null;
    async.series({
        get: function(cb) {
            request(options, function(err, response, body) {
                if (err)
                    return cb(err);

                var cntRegex = /var countdownNum = ([0-9]+);/;
                if (!cntRegex.test(body))
                    return cb(new NotExpectedStructureError(options.uri));

                var $ = cheerio.load(body);
                var form = $('form[method="POST"]');
                if (form.length <= 0)
                    return cb(new NotExpectedStructureError(options.uri));

                var timeoutRepeat = Number(cntRegex.exec(body)[1]) + 1;
                var timeoutTime = 1000; // Maybe extract this from the code?
                var randomTimeOffset = Math.floor(Math.random() * (1000 - 10 + 1)) + 10;
                var waitTime = randomTimeOffset + (timeoutTime * timeoutRepeat);

                options.formData = {};
                var formContents = form.serializeArray();
                formContents.forEach(function(e) {
                    options.formData[e.name] = e.value;
                });
                options.formData['imhuman'] = 'Continue+to+Video';

                setTimeout(function() { cb() }, waitTime);
            });
        },
        post: function(cb) {
            options.method = 'POST';
            request(options, function(err, response, body) {
                if (err)
                    return cb(err);

                var $ = cheerio.load(body);

                var err = $('b.err');
                if (err.length > 0)
                    return cb(new VideoSiteFileError(options.uri, err.text()));

                var scriptDOMs = $('script');
                if (scriptDOMs.length <= 0)
                    return cb(new NotExpectedStructureError(options.uri));

                var elems = scriptDOMs.filter(function() {
                    return $(this).html().indexOf('eval') >= 0;
                });

                if (elems.length <= 0)
                    return cb(new NotExpectedStructureError(options.uri));

                var script = $(elems[0]).html(); // Extract the code from the script tag
                script = script.slice('eval('.length, -2).replace(/"/g, '\\"'); // remove the eval( ... ) part of the code

                var rgxFn = /(function\(.*\) ?{.*}) ?\((.*)\)/; // Regex for extracting the interpreter function
                var rgxArgs = /(.*),([0-9]+),([0-9]+),(.*)/; // Regex for extracting the interpreter function args

                var rgxFnMatch = rgxFn.exec(script);
                var evalFn = eval('(' + rgxFnMatch[1] + ')'); // Now evalFn is the given interpreter function

                var rgxArgsMatch = rgxArgs.exec(rgxFnMatch[2]);
                var args = [
                    rgxArgsMatch[1],
                    Number(rgxArgsMatch[2]),
                    Number(rgxArgsMatch[3]),
                    eval(rgxArgsMatch[4])
                ];

                var code = evalFn.apply(null, args);
                code = code.replace(/\\"/g, '"').replace(/\\\'/g, '\''); //  remove the scaped " and '
                
                var rgxSources = /sources=(\[.*\]);/g; // Extract the source list
                var rgxSourcesMatch = rgxSources.exec(code);
                // Variables for preventing eval from failing
                var image = '';
                var tracks = [];
                var sources = eval(rgxSourcesMatch[1]);

                return cb(null, sources.pop().file);
            });
        }
    }, function(err, result) {
        if (err && err.reason && err.reason == 'Skipped countdown') {
            console.info("Got %s while getting %s. Retrying...", err.reason, uri);
            return handler(uri, _cb);
        }

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