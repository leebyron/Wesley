var http = require('http');

var API_KEY = 'ABQIAAAAYBdgz0O3BNjt05urf9GWshTLqBKuUfXmWnGsr0L2cAywggmdABS1r1GvhFcvMJF_rb6F7wVp-hpTqA';

exports.geoCode = function (address, callback) {

  var path = '/maps/geo?key=' + API_KEY + '&q=' + encodeURIComponent(address) +
    '&output=json&sensor=false';

  var options = {
    host : 'maps.google.com',
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
      callback(null, JSON.parse(data));
    });
  });

};
