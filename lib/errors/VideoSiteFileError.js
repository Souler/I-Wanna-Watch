var util = require('util');

var message = 'Cannont get file from: %s. Reason: %s';

var VideoSiteFileError = function(uri, reason) {
	Error.call(this);
	Error.captureStackTrace(this, arguments.callee);
	this.name = 'VideoSiteFileError';
	this.reason = reason;
	this.message = util.format(message, uri, reason);
}

VideoSiteFileError.prototype.__proto__ = Error.prototype;

module.exports = VideoSiteFileError;