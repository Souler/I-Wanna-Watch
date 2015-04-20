var url = require('url');
var util = require('util');
var querystring = require('querystring');
var cheerio = require('cheerio');
var async = require('async');
var _ = require('underscore')

var handles = [
    'hdfull.tv'
];

var URLs = {
    HOME: 'http://hdfull.tv',
    SEARCH: 'http://hdfull.tv/ajax/search.php',
    TV_SHOW: 'http://hdfull.tv/serie/%s',
    EPISODE: 'http://www.seriesflv.net/ver/%s.html',
    LINK: 'http://www.pordede.com/aporte/%s',
    GOTO: 'http://www.pordede.com/links/goto/%s'
};

var headers = {
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
};

var getOptions = function(method, uri) {
    return {
        method: method.toUpperCase(),
        headers: headers,
        referer: URLs.HOME,
        uri: uri,
    };
}

var login = function(params, cb) {
    cb();
}

var search = function(query, cb) {
    var q = querystring.escape(query);
    var options = getOptions('POST', URLs.SEARCH);
    options.form = {
    	q: q,
    	timestamp: Date.now(),
    	limit: 5,
    	verifiedCheck: ""
    };

    request(options, function (err, response, body) {
        var shows = [];

        if (err)
            return cb(err, shows);

        // Catch possible JSON parse error
        try {
        	shows = JSON.parse(body);
        } catch (e) {
        	cb(e, shows);
        }

        // Check if only one item returned (and not inside array)
        if (!(shows instanceof Array))
        	shows = [shows];


        shows = shows.filter(function(s) { // Check if items has the required properties and filter the TV shows only
        	var ok =  _.has(s, "permalink") && _.has(s, "image") && _.has(s, "title");
        	var isTvShow = s.meta == "TV show";
        	if (!ok)
        		console.error("%j does not have the expected properties");

        	var id = s.permalink.split('/').pop();
        	if (!id || !id.length) {
        		ok = false;
        		console.error("cant extract id from %j");
        	}

        	return ok && isTvShow;
        })
        .map(function(s) {
        	return {
        		id: s.permalink.split('/').pop(),
        		title: s.title,
        		thumbnail: s.image,
        		year: null
        	}
        });

        return cb(err, shows);
    });

}

var show = function(showId, cb) {
    var uri = util.format(URLs.TV_SHOW, showId);
    var options = getOptions('GET', uri);

    request(options, function (err, response, body) {
    	var result = {};

        if (err)
            return cb(err, result);

        var $ = cheerio.load(body);
        var seasons = $('ul#season-list > li:not(.current) > a').map(function(idx) { return $(this).attr('href'); }).get();
        async.map(seasons, function(season, cb) {
        	var options = getOptions('GET', season);
        	request(options, function (err, response, body) {
        		var $ = cheerio.load(body);
        		var title = $('h3.section-title').text().replace(/\s+/g, ' ').replace(/^\s|\s$/, '');
        		var episodes = $('li[itemprop="episode"]');
        		episodes = episodes.map(function() {
        			var $this = $(this);
        			var h5a = $this.find('h5 a');
        			var title = $(h5a).text().replace(/\s+/g, ' ').replace(/^\s|\s$/, '');
        			var href = $(h5a).attr('href');
        			var id = href.split('/').splice(5).join('/');
        			var number = Number(href.split('-').pop());

        			return {
        				id: id,
        				title: title,
        				number: number
        			}
        		}).get();

        		console.log(episodes);
        	})
        })

        cb(null, seasons);
    });

}

var episode = function(episodeId, cb) {
    // WIP
}

module.exports = {
    handles: handles,
    login: login,
    search: search,
    tvshow: show,
    episode: episode
}