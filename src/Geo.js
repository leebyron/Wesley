var http = require('http');

var API_KEY = 'ABQIAAAAYBdgz0O3BNjt05urf9GWshTLqBKuUfXmWnGsr0L2cAywggmdABS1r1GvhFcvMJF_rb6F7wVp-hpTqA';

exports.geocode = function (address, callback) {

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
      var info = JSON.parse(data);
      if (!info.Placemark) {
        callback(new Error('Bad geo call: ' + JSON.stringify(info)), null);
      } else {
        callback(null, info.Placemark[0]);
      }
    });
  });

};
