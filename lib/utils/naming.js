module.exports = {
	/* This function takes a tv show name and returns a shorthand version of it*/
	tvshow : function(show) {
		var parts = show.replace(/[^a-z]/gi, '_').split('_');

		if (parts.length > 1) {
			parts = parts.map(function (part) {
				return part.charAt(0);
			})
		}

		return parts.join('').toLowerCase();
	}
}