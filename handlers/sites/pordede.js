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
    EPISODE: '/links/viewepisode/id/%d'
}

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

var login = function(cb) {
    var options = {
        method: 'POST',
        uri: URLs.LOGIN,
        jar: jar,
        headers: headers
    };

    options.form = {
        'LoginForm[username]': 'username',
        'LoginForm[password]': 'password',
        'popup': '1',
    };

    request(options, function (err, response, body) {
        if (err)
            return cb(err);

        body = JSON.parse(body);
        if (body.html.indexOf('flash-success') < 0)
            return cb(Errors.WRONG_LOGIN);
        else
            cb();
    });
}

var search = function(query, cb) {
    var q = querystring.escape(query);
    var searchUri = util.format(URLs.SEARCH, q);

    var options = {
        method: 'GET',
        uri: searchUri,
        jar: jar,
        headers: headers,
        followRedirect: false
    };

    request(options, function (err, response, body) {
        if (err)
            return cb(err);

        if (response.statusCode == 302) // We are not logged in
            return cb(Errors.NOT_LOGGED_IN);

        var parsed = JSON.parse(body);
        var $ = cheerio.load(parsed.html);
        var shows = $('div[data-model="serie"]').map(function() {
            var $this = $(this);
            var title = $this.find('span.title').html();
            var link = $this.find('a.defaultLink').attr('href');
            var thumbnail = $this.find('div.coverMini img.centeredPic').attr('src');

            var id = title.split('/').pop();
            return {
                id: id,
                title: title,
                thumbnail: thumbnail
            };
        }).get();

        cb(null, shows);
    });

}

var show = function(id, cb) {
    // WIP
    var uri = util.format(URLs.TV_SHOW, id);

    var options = {
        method: 'GET',
        uri: uri,
        jar: jar,
        headers: headers,
        followRedirect: false
    };

    request(options, function (err, response, body) {
    });

}

module.exports = {
    login: login,
    search: search
}