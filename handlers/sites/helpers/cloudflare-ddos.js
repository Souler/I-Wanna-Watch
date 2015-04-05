var url = require('url');
var util = require('util');
var querystring = require('querystring');
var request = require('request');
var cheerio = require('cheerio');
var async = require('async');

/**
  Once `cb` is called, `jar` will contain the cookies necesary for accessing 
  the given `uri` without passing by the cloudflare ddos protection
*/
var resolve = function(uri, jar, cb) {

    var opts = {
        method: 'GET',
        uri: uri,
        jar: jar,
        headers: {
            'User-Agent': "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:34.0) Gecko/20100101 Firefox/34.0",
            'Referer': uri,
        },
        followRedirect: false
    };

    var performChallengeResponse = function(uri_challenge) {
        opts.uri = uri_challenge;
        request(opts, function(err, response, body) {
            if (response.statusCode !== 302)
                throw new Error('Couldn\'t resolve CloudFlare challenge...');

            cb();
        });
    };

    request(opts, function (err, response, body) {
        if (err)
            throw new Error(err);

        var $ = cheerio.load(body);
        var form = $('form#challenge-form');
        var formContents = form.serializeArray();
        formContents.push({ name: 'jschl-answer' });

        var jsToEval = $('script').html();

        // Preapare enviroment
        var document = {};
        document.attachEvent = function(evt, fn) {
          fn();
        };

        document.getElementById = function(id) {
            if (id == 'jschl-answer')
                return formContents[formContents.length-1];

            var dom = {};
            dom.style = {};
            dom.submit = function() {
                var location = url.resolve(uri, form.attr('action'));
                var formData = {};
                formContents.forEach(function(e) {
                    formData[e.name] = e.value;
                });

                location += '?' + querystring.stringify(formData);
                performChallengeResponse(location);
            };

            return dom;
        };

        document.createElement = function(type) {
          var result = {};
          result.firstChild = {};
          result.firstChild.href = uri;
          return result;
        };

        eval(jsToEval);
    });
}

module.exports = resolve;
