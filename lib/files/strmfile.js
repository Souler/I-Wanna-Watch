/*
STRM File structure:

# TV-Show : Orange Is the New Black
# Title : Fool me once
# Hash : oitnb_s01e05
# Site : hdfull.tv
# Id : orange-is-the-new-black/temporada-1/episodio-1
# Source : http://powvideo.net/-12319flsaflkasf
*/
var fs = require('fs');
var util = require('util');
var path = require('path');

var validUrl = require('valid-url');
var capitalize = require('string-capitalize')

var STRMFile = function(filepath, videoUri, options) {
	this.filepath = filepath;
	this.videoUri = videoUri;
	this.options = options || {};
}

STRMFile.load = function(filepath) {
	var filecontents = fs.readFileSync(filepath, 'utf-8');
	var lines = filecontents.split(/\r\n/);
	var me = {};
	me.filepath = filepath;
	me.options = {};
	me.videoUri = null;

	lines.forEach(function (line) {
		var match = /^# ([A-Za-z\-_\s]+) : (.*)$/.exec(line);
		if (match !== null) // is an option line
			me.options[match[1].toLowerCase()] = match[2];
		else if (validUrl.isUri(line) !== null && me.videoUri == null)
			me.videoUri = validUrl.isUri(line);
		else
			throw Error('File at "' + filepath + '" is not a valid IWW STRM file');
	});

	return new STRMFile(me.filepath, me.videoUri, me.options);
}

STRMFile.prototype.save = function() {
	var opts = this.options;
	var result = '';
	opts['last check date'] = Date.now();

	Object.keys(this.options).forEach(function(key) {
		result += util.format('# %s : %s\r\n', capitalize(key), opts[key]);
	})
	result += this.videoUri;
	fs.writeFileSync(this.filepath, result);
}

module.exports = STRMFile;