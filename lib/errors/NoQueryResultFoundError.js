var util = require('util');

var message = 'No result found for %s';

var NoQueryResultFoundError = function(query) {
	Error.call(this);
	Error.captureStackTrace(this, arguments.callee);
	this.name = 'NoQueryResultFoundError';
	this.message = util.format(message, query);
}

NoQueryResultFoundError.prototype.__proto__ = Error.prototype;

module.exports = NoQueryResultFoundError;