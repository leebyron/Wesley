// TODO: better tokenizing of "phrases"

var CraigRequest = require('./CraigRequest.js');
var Geo = require('./Geo.js');

var ID_RX         = /\d{8,14}/;
var INLINE_TAG_RX = /<\/?(i|b|u|strong|td|span)[^>]*?>/ig;
var TAG_RX        = /<[^>]+?>/g;
var SPACE_RX      = /[\s]{2,}/g;
var NO_RX         = /\b(n|no|non)\b/i;
var ALL_CAPS_RX   = /[^a-z\n\.]{6,}/g;
var CAP_RX        = /^[A-Z]/;
var NUM_RX        = /\d+|one|two|three|four|five|six|seven|eight|nine/;
var CLTAG_RX      = /<!-- CLTAG ([a-z0-9]+)=(.+?) -->/g;

var PHONE_RX      = /1?[\.\-\(\s]?\d{3}?[\.\-\)\s]?\d{3}[\.\-\s]?\d{4}/;
var PHONE_JUNK_RX = /[^\d]/g;
var EMAIL_RX      = /Reply to: <a href="mailto:([A-Za-z0-9\-\.@]+)/;
var IMAGE_RX      = /<img.+?src="([^"]+)"/g;

var PRICE_RX      = /\$([0-9]{3,6})/;
var SQFT_RX       = /(\d{3,4})\+?\s?(ft2|ft²|sqft|sq\.? foot)/;
var SQFT2_RX      = /sq\.? footage:?\s*(\d{3,4})/i;
var BEDROOMS_RX   = /([\d\.]+|no|one|two|three|four|five|six|seven|eight|nine)\s?(br|bd|bed|bedroom)s?\b/i;
var BEDROOMS2_RX  = /bed(room)?s?:?\s*(\d+)/i;
var BATHROOMS_RX  = /([\d\.]+|no|one|two|three|four|five|six|seven|eight|nine)\s?(ba|bath|bathroom)s?\b/i;
var BATHROOMS2_RX = /bath(room)?s?:?\s*(\d+)/i;
var DOGS_RX       = /[^\n\.]*\b(dog|pet)s?(\spolicy)?\b(:\s+)?[^\n\.]*/i;
var PARKING_RX    = /(^|\.|\*|\n)([^\.\*\n]*?\b(parking|garage)\b[^\.\*\n]*?)($|\.|\*|\n)/i;

var BLACKLIST_RX  = /\b(scam|fraud|fake|sanfranciscobayrentals)\b/i;

function CraigListing() {
  this.title = undefined;
  this.id = undefined;
  this.url = undefined;
  this.listed = undefined;
  this.email = undefined;
  this.phone = undefined;
  this.address = undefined;
  this.addressDetail = {};
  this.price = undefined;
  this.sqft = undefined;
  this.bedrooms = undefined;
  this.bathrooms = undefined;
  this.dogs = undefined;
  this.parking = undefined;
  this.images = [];
  this.description = undefined;
}

module.exports = CraigListing;

CraigListing.fromRSS = function (item) {
  var link = item.get('xmlns:link', 'http://purl.org/rss/1.0/').text();
  var title = item.get('xmlns:title', 'http://purl.org/rss/1.0/').text();
  var date = item.get('dc:date', {'dc':'http://purl.org/dc/elements/1.1/'}).text();
  var htmlDescription = item.get('xmlns:description', 'http://purl.org/rss/1.0/').text();

  if (BLACKLIST_RX.test(title) || BLACKLIST_RX.test(htmlDescription)) {
    return null;
  }

  var listing = new CraigListing();
  listing.url = link;
  listing.id = ID_RX.exec(link)[0];
  listing.title = sanitizeText(title);
  listing.listed = new Date(date);
  listing.description = tokenizeHTML(htmlDescription);

  derivePhone(listing);
  derivePrice(listing);
  deriveSqft(listing);
  deriveDogs(listing);
  deriveBedrooms(listing);
  deriveBathrooms(listing);
  deriveParking(listing);
  deriveAddress(listing, htmlDescription);

  var clTagStart = htmlDescription.indexOf('<!-- START CLTAGS -->');
  if (clTagStart !== -1) {
    listing.description = sanitizeText(tokenizeHTML(htmlDescription.substr(0,clTagStart)));
  } else {
    listing.description = sanitizeText(listing.description);
  }

  return listing;
};

CraigListing.prototype.loadAdditionalInformation = function (callback) {
  var listing = this;
  CraigRequest.get(listing.url, function (error, data) {
    if (!data) {
      callback(error);
      return;
    }

    deriveEmail(listing, data);
    deriveImages(listing, data);

    if (listing.address) {
      // geocode
      Geo.geocode(listing.address, function (error, place) {
        if (!error) {
          listing.addressDetail.address = place.address;
          listing.addressDetail.accuracy = place.AddressDetails.Accuracy;
          listing.addressDetail.coordinate = place.Point.coordinates;
          listing.addressDetail.region = place.ExtendedData.LatLonBox;
        }
        callback(error);
      });
    } else {
      callback(null);
    }

    // WALKSCORE, IMAGES, TRANSIT

  });
};


function tokenizeHTML(html) {
  html = html.replace(INLINE_TAG_RX, ' ');
  return html.replace(TAG_RX, '\n');
}

function getCLTags(html) {
  var tags = {};
  var result;
  while ((result = CLTAG_RX.exec(html))) {
    tags[result[1]] = result[2];
  }
  return tags;
}

var NUMBER_MAP = {
  'no'    : 0,
  'one'   : 1,
  'two'   : 2,
  'three' : 3,
  'four'  : 4,
  'five'  : 5,
  'six'   : 6,
  'seven' : 7,
  'eight' : 8,
  'nine'  : 9
};

function sanitizeNumber(numberish) {
  var num;

  // replace 1+1 with 1.5
  numberish = numberish.replace('+1', '.5');

  num = parseFloat(numberish);
  if (!isNaN(num)) {
    return num;
  }

  num = NUMBER_MAP[numberish];
  if (num !== null) {
    return num;
  }

  return numberish;
}

function sanitizeText(text) {
  text = text.trim();

  if (ALL_CAPS_RX.test(text)) {
    text = text.replace(ALL_CAPS_RX, _fixAllCaps);
  }

  text = text.replace(SPACE_RX, ' ');

  return text;
}

function _fixAllCaps(text) {
  if (CAP_RX.test(text)) {
    return text.substr(0, 1) + text.substr(1).toLowerCase();
  } else {
    return text.toLowerCase();
  }
}

function derivePhone(listing) {
  if (PHONE_RX.test(listing.description)) {
    listing.phone = PHONE_RX.exec(listing.description)[0].replace(PHONE_JUNK_RX, '');
  }
}

function derivePrice(listing) {
  if (PRICE_RX.test(listing.title)) {
    listing.price = sanitizeNumber(PRICE_RX.exec(listing.title)[1]);
  } else if (PRICE_RX.test(listing.description)) {
    listing.price = sanitizeNumber(PRICE_RX.exec(listing.description)[1]);
  }
}

function deriveSqft(listing) {
  if (SQFT_RX.test(listing.title)) {
    listing.sqft = sanitizeNumber(SQFT_RX.exec(listing.title)[1]);
  } else if (SQFT_RX.test(listing.description)) {
    listing.sqft = sanitizeNumber(SQFT_RX.exec(listing.description)[1]);
  } else if (SQFT2_RX.test(listing.description)) {
    listing.sqft = sanitizeNumber(SQFT2_RX.exec(listing.description)[1]);
  }
}

function deriveBedrooms(listing) {
  if (BEDROOMS_RX.test(listing.title)) {
    listing.bedrooms = sanitizeNumber(BEDROOMS_RX.exec(listing.title)[1]);
  } else if (BEDROOMS_RX.test(listing.description)) {
    listing.bedrooms = sanitizeNumber(BEDROOMS_RX.exec(listing.description)[1]);
  } else if (BEDROOMS2_RX.test(listing.description)) {
    listing.bedrooms = sanitizeNumber(BEDROOMS2_RX.exec(listing.description)[2]);
  }
}

function deriveBathrooms(listing) {
  if (BATHROOMS_RX.test(listing.title)) {
    listing.bathrooms = sanitizeNumber(BATHROOMS_RX.exec(listing.title)[1]);
  } else if (BATHROOMS_RX.test(listing.description)) {
    listing.bathrooms = sanitizeNumber(BATHROOMS_RX.exec(listing.description)[1]);
  } else if (BATHROOMS2_RX.test(listing.description)) {
    listing.bathrooms = sanitizeNumber(BATHROOMS2_RX.exec(listing.description)[2]);
  }
}

function deriveDogs(listing) {
  if (listing.description.indexOf('dogs are OK') !== -1) {
    listing.dogs = true;
  } else if (DOGS_RX.test(listing.description)) {
    var dog_phrase = DOGS_RX.exec(listing.description)[0];
    if (NO_RX.test(dog_phrase)) {
      listing.dogs = false;
    } else {
      listing.dogs = sanitizeText(dog_phrase);
    }
  }
}

function deriveParking(listing) {
  var parking_phrase = null;
  if (PARKING_RX.test(listing.description)) {
    parking_phrase = PARKING_RX.exec(listing.description)[2];
  } else if (PARKING_RX.test(listing.title)) {
    parking_phrase = PARKING_RX.exec(listing.title)[2];
  }
  if (parking_phrase) {
    if (NO_RX.test(parking_phrase)) {
      listing.parking = false;
    } else {
      listing.parking = sanitizeText(parking_phrase);
    }
  }
}

function deriveEmail(listing, data) {
  if (EMAIL_RX.test(data)) {
    listing.email = EMAIL_RX.exec(data)[1];
  }
}

function deriveImages(listing, data) {
  var match, image;
  while ((match = IMAGE_RX.exec(data))) {
    image = match[1];
    if (image.indexOf('craigslistadtracker') === -1) {
      listing.images.push(image);
    }
  }
}

function deriveAddress(listing, data) {
  var tags = getCLTags(data);
  var city = tags.city || 'San Francisco';
  var region = tags.region || 'CA';
  if (tags.xstreet0) {
    if (tags.xstreet1 && !NUM_RX.test(tags.xstreet0)) {
      listing.address = tags.xstreet0 + ' and ' + tags.xstreet1 + ' ' + city + ' ' + region;
    } else {
      // TODO: find apt number
      listing.address = tags.xstreet0 + ' ' + city + ' ' + region;
      if (tags.xstreet1) {
        listing.addressDetail.cross = tags.xstreet1;
      }
    }
  }
}
