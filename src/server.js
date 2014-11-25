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
  var sortProp = req.query.sort;
  //console.log('server.js GET /album: sortProp =', sortProp);
  var reverse = req.query.reverse === 'true';
  //console.log('server.js GET /album: reverse =', reverse);

  // Get query parameters related to filtering.
  var filter = {};
  var prefix = 'filter-';
  Object.keys(req.query).forEach(key => {
    if (key.startsWith(prefix)) {
      var prop = key.substring(prefix.length);
      filter[prop] = req.query[key];
    }
  });
  //console.log('server.js GET /album: filter =', filter);

  getMusic(function (err, music) {
    // Create an array of albums.
    var albums = Object.keys(music).map(id => {
      var album = music[id];
      album.id = id;
      return album;
    });

    // Filter out ones that aren't desired.
    albums = albums.filter(album =>
      Object.keys(filter).every(prop => {
        var filterValue = filter[prop];
        var propValue = album[prop];
        var type = typeof propValue;
        return type === 'string' ? propValue.contains(filterValue) :
          type === 'number' ? propValue >= filterValue :
          true; //TODO: don't know how to handle other types yet
      }));
    //console.log('server.js GET /album: albums =', albums);

    if (sortProp) {
      // Sort the array of albums.
      albums.sort((left, right) => {
        var leftValue = left[sortProp];
        var rightValue = right[sortProp];
        var leftType = typeof leftValue;
        var compare =
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
  getMusic(function (err, music) {
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
    {label: 'Artist', property: 'artist', type: 'string', readonly: true},
    {label: 'Title', property: 'title', type: 'string'},
    {label: 'Rating', property: 'rating', type: 'number'}
  ];

  res.set('Content-Type', 'application/json');
  res.end(JSON.stringify(fields));
});

const PORT = 3000;
app.listen(PORT);
console.log('server running at http://localhost:' + PORT);
