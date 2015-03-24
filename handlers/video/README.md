# Video Site handlers
Each file in this directory (apart from `index.js`) should be a module in charge of handling at least one video site.
Every video site handler should have at least this properties among their exports:
* handles : array of `Strings` contaning all hostnames this module can handle. i.e.: __vidspot.net__.
* handler : function that recives an `uri` (wich belongs to one of the above defined hostnames) and a `cb`. The `cb` is a function with signature `cb(err, uri)`. In case of no error happening, the usual call of cb will be `cb(null, uri)`; where uri points to the video source related to the originally given uri to the handler function.

## Basic template
Use this as a quick bootstrap when creating new video sites scripts
```javascript
/**
	SOME SITE handler

	TODO: Description of the process on a web browser.
*/
var handles = [
    /* Hostnames handled by this module */
];

var handler = function(uri, cb) {
    // do some cool stuff here...

    // ...
    // An error ocurred
    if (cond)
        return cb("Error!" + err);

    // ...
    // No errors
    cb(null, "http://some.video.site.com/video.mp4");

}

module.exports = {
	handles: handles,
	handler: handler
};
```