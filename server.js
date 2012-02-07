/* TODO:

  * queue and throttle GEO calls.
  * "Studio" = 1 br?
  * "Bathroom" with no number and no negative = 1 ba?
  * Load walkscore into memory on run.
  * Get some crime data
  * Get some elevation/slope data
  * Distance to park?
  * Store in some DB (Redis?)
  * Dupe detection
    * On the market for X days
  * Map view
  * Cleanup expired

*/

var CraigSource = require('./src/CraigSource.js');

var cs = new CraigSource();
cs.fetchQuery();
/*
var Geo = require('./src/Geo.js');
Geo.geocode("Mission San Francisco CA", function (error, geo_data) {
  process.stdout.write(JSON.stringify(geo_data, null, 2));
});
*/