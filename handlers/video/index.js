var path = require('path');
var url = require('url');
var util = require('util');
var glob = require('glob');

var Errors = {
	HANDLES_NOT_DEFINED: 'handles array is not defined in %s',
	HANDLER_NOT_DEFINED: 'handler array is not defined in %s',
	HANDLES_NOT_ARRAY: 'handles is not an array in %s',
	HANDLER_NOT_FUNCTION: 'handler is not an function in %s',
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

			// Error handling. Should not happen if guidelines are followed...
			if (!r.handles)
				return cb(util.format(Errors.HANDLES_NOT_DEFINED, filename));
			if (!r.handler)
				return cb(util.format(Errors.HANDLER_NOT_DEFINED, filename));
			if (!(r.handles instanceof Array))
				return cb(util.format(Errors.HANDLES_NOT_ARRAY, filename));
			if (!(r.handler instanceof Function))
				return cb(util.format(Errors.HANDLER_NOT_FUNCTION, filename));

			r.handles.forEach(function(e) {
				handlers[e] = r.handler;
			});
		}

		cb() // Everything is OK
	})
};

var handle = function(uri, cb) {
	var parsedUri = url.parse(uri);
	var hostname = parsedUri.host;
	var handler = handlers[parsedUri.host];

	if (handler)
		return handler(uri, cb);
	else
		return cb(util.format(Errors.NOT_HANDLER_FOR, hostname));
}

module.exports = {
	init: init,
	handle: handle
}