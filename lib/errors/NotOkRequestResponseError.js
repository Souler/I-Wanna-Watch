var util = require('util');

var message = 'Got response code %d on url %s';

var NotOkRequestResponseError = function(code, uri) {
	Error.call(this);
	Error.captureStackTrace(this, arguments.callee);
	this.name = 'NotOkRequestResponseError';
	this.message = util.format(message, code, uri);
}

NotOkRequestResponseError.prototype.__proto__ = Error.prototype;

module.exports = NotOkRequestResponseError;