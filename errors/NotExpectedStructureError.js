var util = require('util');

var message = 'Got response from %s, but its structure is not as spected and can\'t be parsed';

var NotExpectedStructureError = function(uri) {
	Error.call(this);
	Error.captureStackTrace(this, arguments.callee);
	this.name = 'NotExpectedStructureError';
	this.message = util.format(message, uri);
}

NotExpectedStructureError.prototype.__proto__ = Error.prototype;

module.exports = NotExpectedStructureError;