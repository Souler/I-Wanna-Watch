var url = require('url');
var util = require('util');
var querystring = require('querystring');
var request = require('request');
var cheerio = require('cheerio');
var async = require('async');

var handles = [
    'pordede.com'
];

var URLs = {
    HOME: 'http://www.pordede.com',
    LOGIN: 'http://www.pordede.com/site/login',
    SEARCH: 'http://www.pordede.com/series/search/query/%s/on/title/showlist/all',
    TV_SHOW: 'http://www.pordede.com/serie/%s',
    EPISODE: 'http://www.pordede.com/links/viewepisode/id/%d',
    LINK: 'http://www.pordede.com/aporte/%s',
    GOTO: 'http://www.pordede.com/links/goto/%s'
};

var Errors = {
    WRONG_LOGIN: 'Incorrect login',
    NOT_LOGGED_IN: 'Not logged in'
}

var headers = {
    'User-Agent': "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:34.0) Gecko/20100101 Firefox/34.0",
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
};

var jar = request.jar();

var getOptions = function(method, uri) {
    return {
        method: method.toUpperCase(),
        uri: uri,
        jar: jar,
        headers: headers,
        followRedirect: false
    };
}

var login = function(params, cb) {
    var options = getOptions('POST', URLs.LOGIN);

    options.form = {
        'LoginForm[username]': params.username,
        'LoginForm[password]': params.password,
        'popup': '1',
    };

    request(options, function (err, response, body) {
        if (err)
            return cb(err);

        try {
            body = JSON.parse(body);
        } catch(e) {}

        var $ = cheerio.load(body.html || body);
        if (body.html.indexOf('flash-success') < 0)
            return cb(Errors.WRONG_LOGIN);
        else
            cb();
    });
}

var search = function(query, cb) {
    var q = querystring.escape(query);
    var searchUri = util.format(URLs.SEARCH, q);
    var options = getOptions('GET', searchUri);

    request(options, function (err, response, body) {
        if (err)
            return cb(err);

        if (response.statusCode == 302) // We are not logged in
            return cb(Errors.NOT_LOGGED_IN);

            try {
                body = JSON.parse(body);
            } catch(e) {}

            var $ = cheerio.load(body.html || body);
        var shows = $('div[data-model="serie"]').map(function() {
            var $this = $(this);
            var title = $this.find('span.title').html();
            var link = $this.find('a.defaultLink').attr('href');
            var thumbnail = $this.find('div.coverMini img.centeredPic').attr('src');

            var id = link.split('/').pop();
            return {
                id: id,
                title: title,
                thumbnail: thumbnail
            };
        }).get();

        cb(null, shows);
    });

}

var show = function(showId, cb) {
    var uri = util.format(URLs.TV_SHOW, showId);
    var options = getOptions('GET', uri);

    request(options, function (err, response, body) {
        if (err)
            return cb(err);

        if (response.statusCode == 302) // We are not logged in
            return cb(Errors.NOT_LOGGED_IN);

        try {
            body = JSON.parse(body);
        } catch(e) {}

        var $ = cheerio.load(body.html || body);
        var seasons = $('div.episodes').map(function() {
            var $this = $(this);
            var season = $this.find('div.checkSeason').children().first()[0].prev.data; // BLACK MAGIC!
            var episodes = $this.find('div[data-model="episode"]');

            episodes = episodes.map(function() {
                var $episode = $(this);
                var episodeId = $episode.attr('data-id');
                var numberDOM = $episode.find('div.info span.title span.number');
                var number = Number(numberDOM.html());
                var title = numberDOM[0].next.data;

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

    var uri = util.format(URLs.EPISODE, episodeId);
    var options = getOptions('GET', uri);

    async.waterfall([
        function getEpisodeLinksIds(_cb) {
            request(options, function (err, response, body) {
                if (err)
                    return _cb(err);

                if (response.statusCode == 302) // We are not logged in
                    return _cb(Errors.NOT_LOGGED_IN);

                try {
                    body = JSON.parse(body);
                } catch(e) {}

                var $ = cheerio.load(body.html || body);
                var links = $('div.linksContainer.online a.aporteLink').map(function(){
                    var epId = $(this).attr('href').split('/').pop();
                    var subtitles = false;
                    var lang = 'spanish'; // This site is spanish, so probably it is...

                    var flags = $(this).find('.flag').each(function() {
                        var l = $(this).attr('class').split(' ').pop();
                        var content = $(this).html().replace(/\s+|&#xA0;/gi, '').toLowerCase();
                        if (content.indexOf('sub') >= 0)
                            subtitles = l;
                        else if (content.length > 0)
                            lang = l + '-' + content;
                        else
                            lang = l;
                    });

                    return {
                        id: epId,
                        subtitles: subtitles,
                        language: lang
                    };
                }).get();

                _cb(err, links)
            });
        },
        function getRedirectedLinks(links, _cb) {
            async.map(links,
            function(link, __cb) {
                var linkUri = util.format(URLs.LINK, link.id);
                var opts = getOptions('GET', linkUri);
                request(opts, function (err, response, body) {
                    if (err)
                        return __cb(err);

                    if (response.statusCode == 302) // We are not logged in
                        return __cb(Errors.NOT_LOGGED_IN);

                    try {
                        body = JSON.parse(body);
                    } catch(e) {}

                    var $ = cheerio.load(body.html || body);
                    var lns =  $('a.episodeText').map(function(){
                        return {
                            id: $(this).attr('href').split('/').pop(),
                            subtitles: link.subtitles,
                            language: link.language
                        };
                    }).get();

                    lns = lns.reduce(function(v, c) { return v.concat(c) }, []);
                    __cb(null, lns);
                });
            },
            _cb);
        },
        function getExternalLinks(links, _cb) {
            links = links.reduce(function(v, c) { return v.concat(c) }, []);
            async.map(links,
            function(link, __cb) {
                var linkUri = util.format(URLs.GOTO, link.id);
                var opts = getOptions('GET', linkUri);
                for (key in opts.headers)
                    if (key !== 'User-Agent')
                        delete opts.headers[key];

                request(opts, function (err, response, body) {
                    if (err)
                        return __cb(err);

                    var result = {
                        href: response.headers.location,
                        subtitles: link.subtitles,
                        language: link.language
                    };

                    __cb(null, result);
                });
            },
            _cb);
        }
    ], cb)
}

module.exports = {
    login: login,
    search: search,
    tvshow: show,
    episode: episode
}