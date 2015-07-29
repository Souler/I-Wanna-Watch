var path = require('path');
var url = require('url');
var util = require('util');
var glob = require('glob');
var async = require('async');

var Errors = {
    HANDLES_NOT_DEFINED: 'handles array is not defined in %s',
    HANDLES_NOT_ARRAY: 'handles is not an array in %s',
    HANDLER_NOT_DEFINED: '%s is not defined in %s',
    HANDLER_NOT_FUNCTION: '%s is not an function in %s',
    NOT_HANDLER_FOR: 'there is no handler for %s'
};

var handlers = {};

var init = function(cb) {
    var filesGlob = path.join(__dirname, '*.js');
    glob(filesGlob, function(err, files) {
        if (err)
            return cb(err);

        for (idx in files) {
            var filename = files[idx];

            if (/index\.js$/.test(filename))
                continue;

            var r = require(filename);

            if (r.disabled == true)
                continue;

            // Error handling. Should not happen if guidelines are followed...
            if (!r.handles)
                return cb(util.format(Errors.HANDLES_NOT_DEFINED, filename));
            if (!(r.handles instanceof Array))
                return cb(util.format(Errors.HANDLES_NOT_ARRAY, filename));

            var methods = [
                "login",
                "search",
                "tvshow",
                "episode"
            ];

            for (var idx in methods) {
                var method = methods[idx];
                if (!r[method])
                    return cb(util.format(Errors.HANDLER_NOT_DEFINED, method, filename));
                if (!(r[method] instanceof Function))
                    return cb(util.format(Errors.HANDLER_NOT_FUNCTION, method, filename));
            }

            r.handles.forEach(function(e) {
                handlers[e] = r;
            });
        }

        cb() // Everything is OK
    })
};

var getHandler = function(uri) {
    var handler = handlers[uri];

    if (handler)
        return handler;
    else
        throw new NoSiteHandlerError(uri);
}

var canHandle = function(uri) {
    var parsedUri = url.parse(uri);
    var hostname = parsedUri.host;
    var handler = handlers[parsedUri.host];
    return !!handler;
}

var search = function(query, cb) {
    var sites = {};

    Object.keys(handlers).forEach(function(sitename) {
        sites[sitename] = function (_cb) {
            var s = handlers[sitename];
            s.search(query, _cb);
        }
    });

    async.parallel(sites, cb);
}

module.exports = {
    init: init,
    getHandler: getHandler,
    canHandle: canHandle,
    search: search
}