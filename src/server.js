'use strict';
/*global __dirname: true */

require('../lib/traceur-runtime');
let bodyParser = require('body-parser');
let express = require('express');
let fs = require('fs');
const SUCCESS = 200;

let app = express();
app.use(bodyParser.json());
const rootDir = __dirname + '/..';
app.use(express.static(rootDir));

const filePath = rootDir + '/music.json';

function applyFilter(arr, filter) {
  return arr.filter(obj =>
    Object.keys(filter).every(prop => {
      let filterValue = filter[prop];
      if (filterValue === null) return true;

      let propValue = obj[prop];
      let type = typeof filterValue;
      if (propValue === undefined && type === 'boolean') propValue = false;

      return type === 'string' ? propValue.contains(filterValue) :
        type === 'number' ? propValue >= filterValue :
        type === 'boolean' ? propValue === filterValue :
        true; //TODO: don't know how to handle other types yet
    }));
}

function convertType(value) {
  let num = Number(value);
  return value === 'true' ? true :
    value === 'false' ? false :
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

function saveMusic(music, cb) {
  let json = JSON.stringify(music, null, 2);
  fs.writeFile(filePath, json, cb);
}

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

app.get('/album', (req, res) => {
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
    //console.log('server.js GET /album: albums =', albums);

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

    // Return the array of albums.
    res.set('Content-Type', 'application/json');
    res.end(JSON.stringify(albums));
  });
});

app.get('/album/:id', (req, res) => {
  getMusic((err, music) => {
    if (err) return res.status(500).end(err);

    res.set('Content-Type', 'application/json');
    const id = req.params.id;
    res.end(JSON.stringify(music[id]));
  });
});

// Adds a new album.
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

// Updates an existing album.
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

app.get('/album-field', (req, res) => {
  const fields = [
    {label: 'Artist', property: 'artist', type: 'string', readOnly: true},
    {label: 'Title', property: 'title', type: 'string'},
    {label: 'Rating', property: 'rating', type: 'number'},
    {label: 'Own?', property: 'own', type: 'boolean'}
  ];

  res.set('Content-Type', 'application/json');
  res.end(JSON.stringify(fields));
});

const PORT = 3000;
app.listen(PORT);
console.log('server running at http://localhost:' + PORT);
