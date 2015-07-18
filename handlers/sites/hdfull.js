var url = require('url');
var util = require('util');
var querystring = require('querystring');
var cheerio = require('cheerio');
var async = require('async');
var _ = require('underscore')

var handles = [
    'hdfulltv'
];

var URLs = {
    HOME: 'http://hdfull.tv',
    SEARCH: 'http://hdfull.tv/ajax/search.php',
    TV_SHOW: 'http://hdfull.tv/serie/%s',
    EPISODES: 'http://hdfull.tv/a/episodes',
    EPISODE: 'http://hdfull.tv/serie/%s'
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
    var options = getOptions('POST', URLs.SEARCH);
    options.formData = {
        q: query,
        limit: 5,
        timestamp: Date.now(),
        verifiedCheck: ""
    };

    request(options, function (err, res, body) {
        if (err)
            return cb(err);

        var status = res.statusCode
        if (status !== 200)
            return cb(new NotOkRequestResponseError(status, options.uri));

        var obj = null;
        try {
            obj = JSON.parse(body);
        } catch (e) {
            return cb(new NotExpectedStructureError(options.uri));
        }

        var result = obj.map(function(show) {
            var id = show.permalink.split('/').pop();
            return {
                id: id,
                title: show.title,
                thumbnail: show.image,
                year: null
            }
        })
        cb(null, result);
    });

}

var tvshow = function(showId, cb) {
    var url = util.format(URLs.TV_SHOW, showId);
    var options = getOptions('GET', url);

    request(options, function (err, res, body) {
        if (err)
            return cb(err);

        var status = res.statusCode
        if (status !== 200)
            return cb(new NotOkRequestResponseError(status, options.uri));

        var sidRegex = /var sid = '([0-9]+)';/;
        if (!sidRegex.test(body))
            return cb(new NotExpectedStructureError(options.uri));

        var showId = Number(sidRegex.exec(body)[1]);
        if (isNaN(showId))
            return cb(new NotExpectedStructureError(options.uri));

        var $ = cheerio.load(body);
        var seasons = $('#season-list li a');
        if (seasons.length <= 0)
            return cb(new NotExpectedStructureError(options.uri));

        var seasonIds = [];
        seasons.each(function (i, a) {
            if (i == 0)
                return;

            var seasonUri = $(a).attr('href');
            var seasonId = seasonUri.split('/').pop();
            var seasonN = Number(seasonId.split('-').pop());

            seasonIds.push(seasonN);
        });

        async.map(seasonIds, function(seasonId, _cb) {
            var seasonEpisodesOptions = getOptions('POST', URLs.EPISODES);
            seasonEpisodesOptions.formData = {
                action: 'season',
                start: 0,
                limit: 0,
                show: showId,
                season: seasonId
            };

            request(seasonEpisodesOptions, function (err, res, body) {
                if (err)
                    return _cb(err);

                var status = res.statusCode
                if (status !== 200)
                    return _cb(new NotOkRequestResponseError(status, options.uri));

                var obj = null;
                try {
                    obj = JSON.parse(body);
                } catch (e) {
                    return _cb(new NotExpectedStructureError(options.uri));
                }

                var episodes = obj.map(function(ep) {
                    return {
                        id: util.format('%s/temporada-%d/episodio-%d', ep.permalink, ep.season, ep.episode),
                        number: ep.episode,
                        title: ep.title.es || ep.title.en || ep.title,
                        season: ep.season
                    }
                });

                _cb(null, episodes);
            })
        }, function (err, sEps) {
            if (err)
                return cb(err);

            var episodes = sEps.reduce(function(v, c) { return v.concat(c) }, []);

            var seasonsEpisodes = _.groupBy(episodes, 'season');

            var result = Object.keys(seasonsEpisodes)
            .sort(function(a, b) { return a - b; })
            .map(function(seasonId) {
                var seasonEpisodes = seasonsEpisodes[seasonId].sort(function(a, b) { return a.number - b.number; });
                return {
                    number: seasonId,
                    episodes: seasonEpisodes
                }
            })

            cb(null, result)
        });
    })
}

var episode = function(episodeId, cb) {
    var url = util.format(URLs.EPISODE, episodeId);
    var options = getOptions('GET', url);

    request(options, function (err, res, body) {
        if (err)
            return cb(err);

        var status = res.statusCode
        if (status !== 200)
            return cb(new NotOkRequestResponseError(status, options.uri));

        var $ = cheerio.load(body);

        var links = $('.embed-selector');
        if (links.length <= 0)
            return cb(new NotExpectedStructureError(options.uri));

        var lns = [];
        links.each(function(idx, link) {
            var $$ = cheerio.load(link);

            var anchor = $$('.action-buttons a[target="_blank"]');
            if (anchor.length != 1)
                return cb(new NotExpectedStructureError(options.uri));

            var langTag = $$('h5 > span:nth-child(1)');
            if (langTag.length != 1)
                return cb(new NotExpectedStructureError(options.uri));
            var langMatch = /Idioma:  ([a-záéíóúñ ]+)/i.exec(langTag.text());;
            if (langMatch == null)
                return cb(new NotExpectedStructureError(options.uri));

            var result = {};
            result.href = $(anchor).attr('href');
            var lang = langMatch[1].toLowerCase();
            switch(lang) {
                case 'audio original':
                    result.subtitles = false;
                    result.lang = 'english';
                    break;
                case 'audio español':
                    result.subtitles = false;
                    result.lang = 'spanish';
                    break;
                case 'audio latino':
                    result.subtitles = false;
                    result.lang = 'spanish-latino';
                    break;
                case 'audio latino':
                    result.subtitles = false;
                    result.lang = 'spanish-latino';
                    break;
                case 'subtítulo español':
                    result.subtitles = 'spanish';
                    result.lang = 'english';
                    break;
                case 'subtítulo ingles':
                    result.subtitles = 'english';
                    result.lang = 'english';
                    break;   
            }
    
            lns.push(result);
        });


        cb(null, lns);
    });
}

module.exports = {
    handles: handles,
    login: login,
    search: search,
    tvshow: tvshow,
    episode: episode
}