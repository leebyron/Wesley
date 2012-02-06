var http = require('http');

var SF_HOST = 'sfbay.craigslist.org';
var HEADERS = {
  'Referer' : 'http://sfbay.craigslist.org/sfc/apa/',
  'User-Agent' : 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1'
};

exports.get = function(path, callback) {
  var options = {
    headers : HEADERS,
    host : SF_HOST,
    path : path,
    port : 80
  };

  var request = http.get(options, function(response) {
    request.on('error', function(error) {
      callback(error, null);
    });

    var data = '';
    response.on('data', function (chunk) {
      data += chunk;
    });

    response.on('end', function () {
      callback(null, data);
    });
  });
};
