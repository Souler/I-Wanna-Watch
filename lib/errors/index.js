var path = require('path');
var glob = require('glob');

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
            var error = new r();
            global[error.name] = r;
        }

        cb();
    })
}

module.exports = {
	init: init
}