'use strict';
/*global __dirname: true */

require('../lib/traceur-runtime');
String.prototype.includes = String.prototype.contains;

let bodyParser = require('body-parser');
let express = require('express');
let fs = require('fs');
const SUCCESS = 200;

let app = express();
app.use(bodyParser.json());
const rootDir = __dirname + '/..';
app.use(express.static(rootDir));

const filePath = rootDir + '/music.json';

let fieldMap = getFieldMap();

function applyFilter(arr, filter) {
  return arr.filter(obj =>
    Object.keys(filter).every(prop => {
      let filterValue = filter[prop];
      if (filterValue === null) return true;

      let propValue = obj[prop];
      let type = typeof filterValue;
      if (propValue === undefined && type === 'boolean') propValue = false;

      let keep =
        type === 'string' ? propValue.includes(filterValue) :
        type === 'number' ? propValue >= filterValue :
        type === 'boolean' ? propValue === filterValue :
        true; //TODO: don't know how to handle other types yet
      return keep;
    }));
}

function convertType(value) {
  let num = Number(value);
  return value === 'true' ? true :
    value === 'false' ? false :
    typeof value === 'boolean' ? value :
    !Number.isNaN(num) ? num :
    value;
}

/**
 * Creates an object from all the query parameters
 * that start with a given prefix.
 */
function extractObject(req, prefix) {
  let obj = {};

  Object.keys(req.query).forEach(key => {
    if (key.startsWith(prefix)) {
      let prop = key.substring(prefix.length);
      let value = req.query[key];
      obj[prop] = convertType(value);
    }
  });

  return obj;
}

function getFieldMap() {
  var map = {};

  function addField({property, type, label, readOnly, options}) {
    if (!label) label = propertyToLabel(property);
    if (!readOnly) readOnly = false;

    map[property] = {property, type, label, readOnly, options};

    if (type === 'boolean') map[property].value = false;
  }

  addField({
    property: 'artist',
    type: 'string',
    readOnly: true
  });

  addField({
    property: 'title',
    type: 'string'
  });

  addField({
    property: 'genre',
    type: 'select',
    options: ['Alternative', 'Classical', 'Folk', 'Rock', 'Other']
  });

  addField({
    property: 'rating',
    type: 'number'
  });

  addField({
    property: 'own',
    type: 'boolean',
    label: 'Own?'
  });

  return map;
}

function getHighestId(music) {
  return Object.keys(music).reduce(
    (highest, id) => Math.max(highest, Number(id)),
    0);
}

function getMusic(cb) {
  fs.readFile(filePath, {encoding: 'utf8'}, (err, data) => {
    if (err) return cb(err);

    cb(null, JSON.parse(data));
  });
}

function getNumericQueryParam(req, name) {
  let value = req.query[name];
  if (value) value = Number(value);
  return value;
}

function propertyToLabel(property) {
  var s = property.charAt(0).toUpperCase() + property.substring(1);
  return s.replace(/([A-Z])/g, ' $1');
}

function saveMusic(music, cb) {
  let json = JSON.stringify(music, null, 2);
  fs.writeFile(filePath, json, cb);
}

/**
 * Deletes a specific album.
 */
app['delete']('/album/:id', (req, res) => {
  getMusic((err, music) => {
    if (err) return res.status(500).end(err);

    const id = req.params.id;
    delete music[id];

    saveMusic(music, err => {
      if (err) return res.status(500).end(err);
      res.end();
    });
  });
});

/**
 * Gets an array of all albums that match
 * the supplied, optional filters and
 * are in the bounds of the optional page range.
 */
app.get('/album', (req, res) => {
  // Get query parameters related to paging.
  let startIndex = getNumericQueryParam(req, 'start');
  let pageSize = getNumericQueryParam(req, 'size');

  // Get query parameters related to sorting.
  let sortProp = req.query.sort;
  let reverse = req.query.reverse === 'true';

  // Get query parameters related to filtering.
  let filter = extractObject(req, 'filter-');
  let autoFilter = extractObject(req, 'af-');

  getMusic((err, music) => {
    // Create an array of albums.
    let albums = Object.keys(music).map(id => {
      let album = music[id];
      album.id = Number(id);
      return album;
    });

    // For testing the ability to make certain properties of certain objects
    // readonly, make one property of the second object readonly.
    albums[1].readOnlyProps = ['rating'];

    // Filter out ones that aren't desired.
    albums = applyFilter(albums, autoFilter);
    albums = applyFilter(albums, filter);

    // This must be done AFTER filtering!
    let arraySize = albums.length;

    if (sortProp) {
      // Sort the array of albums.
      albums.sort((left, right) => {
        let leftValue = left[sortProp];
        let rightValue = right[sortProp];
        let leftType = typeof leftValue;
        let compare =
          leftType === 'string' ? leftValue.localeCompare(rightValue) :
          leftType === 'number' ? leftValue - rightValue :
          0; // don't know how to sort other types yet
        return reverse ? compare * -1 : compare;
      });
    }

    if (startIndex !== undefined) {
      // Filter out ones outside the requested "page".
      let endIndex = pageSize ? startIndex + pageSize : undefined;
      albums = albums.slice(startIndex, endIndex);
    }

    // Make the first album read-only to test that features.
    if (albums.length > 0) albums[0]._readOnly = true;

    // Return the array of albums.
    res.set('Content-Type', 'application/json');
    res.set('x-array-size', arraySize);
    res.end(JSON.stringify(albums));
  });
});

/**
 * Gets a specific album.
 * When the request header Accept contains application/json,
 * JSON is returned.
 * When the request header Accept contains text/plain,
 * a string description is returned.
 * No other content types are currently supported.
 */
app.get('/album/:id', (req, res) => {
  var accept = req.headers.accept;

  getMusic((err, music) => {
    if (err) return res.status(500).end(err);

    let contentType =
      accept.includes('application/json') ? 'application/json' :
      accept.includes('text/plain') ? 'text/plain' :
      null;

    if (contentType) {
      res.set('Content-Type', contentType);

      const id = req.params.id;
      let album = music[id];

      if (contentType === 'application/json') {
        res.end(JSON.stringify(album));
      } else if (contentType === 'text/plain') {
        var string = 'the album "' + album.title +
          '" by "' + album.artist + '"';
        res.end(string);
      } else {
        res.status(500).end('unhandled Accept header "' + accept + '"');
      }
    } else {
      res.status(400).end('unsupported Accept header "' + accept + '"');
    }
  });
});

/**
 * Adds a new album.
 */
app.post('/album', (req, res) => {
  getMusic((err, music) => {
    if (err) return res.status(500).end(err);

    const album = req.body;
    album.id = Number(getHighestId(music)) + 1;
    music[album.id] = album;
    saveMusic(music, err => {
      if (err) return res.status(500).end(err);
      res.end('/album/' + album.id);
    });
  });
});

/**
 * Updates an existing album.
 */
app.put('/album/:id', (req, res) => {
  getMusic((err, music) => {
    if (err) return res.status(500).end(err);

    const album = req.body;
    const id = req.params.id;
    music[id] = album;
    saveMusic(music, err => {
      if (err) return res.status(500).end(err);
      res.end('/album/' + id);
    });
  });
});

/**
 * Gets the UI "fields" for the "album" resource type.
 */
app.get('/album-field', (req, res) => {
  const fields = [
    fieldMap.artist, fieldMap.title, fieldMap.genre,
    fieldMap.rating, fieldMap.own
  ];

  res.set('Content-Type', 'application/json');
  res.end(JSON.stringify(fields));
});


/**
 * Gets the UI "searches" for the "album" resource type.
 */
app.get('/album-search', (req, res) => {
  const searches = [
    [fieldMap.artist, fieldMap.title],
    [fieldMap.genre],
    [fieldMap.rating],
    [fieldMap.own]
  ];

  res.set('Content-Type', 'application/json');
  res.end(JSON.stringify(searches));
});

const PORT = 3000;
app.listen(PORT);
console.log('server running at http://localhost:' + PORT);
