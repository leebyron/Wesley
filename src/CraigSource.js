//var http = require('http');
var libxmljs = require('libxmljs');
var CraigListing = require('./CraigListing.js');
var CraigRequest = require('./CraigRequest.js');

function CraigSource() {
  this.max = '';
  this.min = 1000;
  this.bedrooms = '';
  this.query = '';
}

module.exports = CraigSource;

CraigSource.prototype.fetchQuery = function () {
  var path = '/search/apa/sfc?query=' + this.query + '&srchType=A&minAsk=' +
    this.min + '&maxAsk=' + this.max + '&bedrooms=' + this.bedrooms + '&format=rss';

  CraigRequest.get(path, function (error, data) {
    if (!data) {
      console.error(error);
      return;
    }
    //console.log(data);
    var xmlDoc = libxmljs.parseXmlString(data);
    var items = xmlDoc.root().find('xmlns:item', 'http://purl.org/rss/1.0/');
    for (var ii in items) {
      try {
        var listing = CraigListing.fromRSS(items[ii]);
        console.log(listing);
      } catch (exception) {
        console.error(exception);
      }
    }
  });
};
