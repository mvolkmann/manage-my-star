'use strict';
/*global __dirname: true */

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

function saveCds(music, cb) {
  let json = JSON.stringify(music, null, 2);
  fs.writeFile(filePath, json, cb);
}

app['delete']('/album/:id', (req, res) => {
  getMusic((err, music) => {
    if (err) return res.status(500).end(err);

    const id = req.params.id;
    delete music[id];

    saveCds(music, err => {
      if (err) return res.status(500).end(err);
      res.end();
    });
  });
});

app.get('/album', (req, res) => {
  var property = req.query.sort;
  var reverse = req.query.reverse === 'true';

  getMusic(function (err, music) {
    // Create an array of albums.
    var albums = Object.keys(music).map(key => music[key]);

    // Sort the array of albums.
    albums.sort((left, right) => {
      var leftValue = left[property];
      var rightValue = right[property];
      var leftType = typeof leftValue;
      var compare =
        leftType === 'string' ? leftValue.localeCompare(rightValue) :
        leftType === 'number' ? leftValue - rightValue :
        0; // don't know how to sort other types yet
      return reverse ? compare * -1 : compare;
    });

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

app.post('/album', (req, res) => {
  getMusic((err, music) => {
    if (err) return res.status(500).end(err);

    const album = req.body;
    album.id = Number(getHighestId(music)) + 1;
    music[album.id] = album;
    saveCds(music, err => {
      if (err) return res.status(500).end(err);
      res.end('/album/' + album.id);
    });
  });
});

app.get('/field', (req, res) => {
  const fields = [
    {label: 'Artist', property: 'artist'},
    {label: 'Title', property: 'title'},
    {label: 'Rating', property: 'rating'}
  ];

  res.set('Content-Type', 'application/json');
  res.end(JSON.stringify(fields));
});

const PORT = 3000;
app.listen(PORT);
console.log('server running at http://localhost:' + PORT);
