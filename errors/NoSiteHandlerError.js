var util = require('util');

var message = 'there is no handler for site %s';

var NoSiteHandlerError = function(site) {
	Error.call(this);
	Error.captureStackTrace(this, arguments.callee);
	this.name = 'NoSiteHandlerError';
	this.message = util.format(message, site);
}

NoSiteHandlerError.prototype.__proto__ = Error.prototype;

module.exports = NoSiteHandlerError;