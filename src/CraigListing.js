var ID_RX         = /\d{8,14}/;
var INLINE_TAG_RX = /<\/?(i|b|u|strong|td|span)[^>]*?>/ig;
var TAG_RX        = /<[^>]+?>/g;
var SPACE_RX      = /[\s]{2,}/g;
var NO_RX         = /\b(n|no|non)\b/i;
var ALL_CAPS_RX   = /[^a-z\n\.]{6,}/g;
var CAP_RX        = /^[A-Z]/;

var PRICE_RX      = /\$([0-9]{3,6})/;
var SQFT_RX       = /(\d{3,4})\+?\s?(ft2|ft²|sqft|sq\.? foot)/;
var SQFT2_RX      = /sq\.? footage:?\s*(\d{3,4})/i;
var BEDROOMS_RX   = /([\d\.]+|no|one|two|three|four|five|six|seven|eight|nine)\s?(br|bd|bed|bedroom)s?\b/i;
var BEDROOMS2_RX  = /bedrooms:?\s*(\d+)/i;
var BATHROOMS_RX  = /([\d\.]+|no|one|two|three|four|five|six|seven|eight|nine)\s?(ba|bath|bathroom)s?\b/i;
var BATHROOMS2_RX = /bathrooms:?\s*(\d+)/i;
var DOGS_RX       = /[^\n\.]*\b(dog|pet)s?(\spolicy)?\b(:\s+)?[^\n\.]*/i;
var PARKING_RX    = /(^|\.|\*|\n)([^\.\*\n]*?\b(parking|garage)\b[^\.\*\n]*?)($|\.|\*|\n)/i;


function CraigListing() {
  this.id = undefined;
  this.price = 'unknown';
  this.sqft = 'unknown';
  this.bedrooms = 'unknown';
  this.bathrooms = 'unknown';
  this.dogs = 'unknown';
  this.parking = 'unknown';
}
module.exports = CraigListing;

CraigListing.fromRSS = function (item) {
  var htmlDescription = item.get('xmlns:description', 'http://purl.org/rss/1.0/').text()

  var listing = new CraigListing();
  listing.link = item.get('xmlns:link', 'http://purl.org/rss/1.0/').text();
  listing.id = ID_RX.exec(listing.link)[0];
  listing.title = sanitizeText(item.get('xmlns:title', 'http://purl.org/rss/1.0/').text());
  listing.listed = new Date(item.get('dc:date', {'dc':'http://purl.org/dc/elements/1.1/'}).text());
  listing.description = tokenizeHTML(htmlDescription);

  derivePrice(listing);
  deriveSqft(listing);
  deriveDogs(listing);
  deriveBedrooms(listing);
  deriveBathrooms(listing);
  deriveParking(listing);

  listing.description = sanitizeText(listing.description);

  return listing;
};

CraigListing.prototype.loadAdditionalInformation = function () {
  // load the actual cl post
};

function tokenizeHTML(html) {
  html = html.replace(INLINE_TAG_RX, ' ');
  return html.replace(TAG_RX, '\n');
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
  if (num != null) {
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
    listing.bedrooms = sanitizeNumber(BEDROOMS2_RX.exec(listing.description)[1]);
  }
}

function deriveBathrooms(listing) {
  if (BATHROOMS_RX.test(listing.title)) {
    listing.bathrooms = sanitizeNumber(BATHROOMS_RX.exec(listing.title)[1]);
  } else if (BATHROOMS_RX.test(listing.description)) {
    listing.bathrooms = sanitizeNumber(BATHROOMS_RX.exec(listing.description)[1]);
  } else if (BATHROOMS2_RX.test(listing.description)) {
    listing.bathrooms = sanitizeNumber(BATHROOMS2_RX.exec(listing.description)[1]);
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
