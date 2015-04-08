var url = require('url');
var util = require('util');
var querystring = require('querystring');
var cheerio = require('cheerio');
var async = require('async');
var _ = require('underscore')

var handles = [
    'seriesflv.net'
];

var URLs = {
    HOME: 'http://www.seriesflv.net',
    SEARCH: 'http://www.seriesflv.net/api/search/?q=%s',
    TV_SHOW: 'http://www.seriesflv.net/serie/%s.html',
    EPISODE: 'http://www.seriesflv.net/ver/%s.html',
    LINK: 'http://www.pordede.com/aporte/%s',
    GOTO: 'http://www.pordede.com/links/goto/%s'
};

var getOptions = function(method, uri) {
    return {
        method: method.toUpperCase(),
        uri: uri,
    };
}

var login = function(params, cb) {
    cb();
}

var search = function(query, cb) {
    var q = querystring.escape(query);
    var searchUri = util.format(URLs.SEARCH, q);
    var options = getOptions('GET', searchUri);

    request(options, function (err, response, body) {
        if (err)
            return cb(err);
        var $ = cheerio.load(body);
        var shows = $('ul:root > li').map(function() {
            var $this = $(this);
            var title = $this.find('span.tit').html();
            var link = $this.find('a').attr('href');
            var thumbnail = $this.find('img').attr('src');
            var id = link.split('/').pop().slice(0, -('.html'.length));
            return {
                id: id,
                title: title,
                thumbnail: thumbnail
            };
        }).get();

        // Someties this site dupes the shows...
        var uniqueShows = _.uniq(shows, function(item) { 
            return item.id;
        });

        cb(null, uniqueShows);
    });

}

var show = function(showId, cb) {
    var uri = util.format(URLs.TV_SHOW, showId);
    var options = getOptions('GET', uri);

    request(options, function (err, response, body) {
        if (err)
            return cb(err);

        var $ = cheerio.load(body);
        var seasons = $('div#capitulos div#accordion > .panel').map(function(i) {
            var $this = $(this);
            var season = $this.find('h4.panel-title a').text().replace(/^\n\s+|\s+$/, '');
            var episodes = $this.find('td.sape');

            episodes = episodes.map(function() {
                var $episode = $(this);
                var episodeLink = $episode.find('a').attr('href');
                var episodeId = episodeLink.split('/').pop().slice(0, -('.html'.length));
                var title = $episode.find('a').html();
                var number = i+1;

                return {
                    id: episodeId,
                    number: number,
                    title: title
                }
            }).get();

            return {
                name: season,
                episodes: episodes
            }
        }).get();

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