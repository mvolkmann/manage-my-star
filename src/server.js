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

function getCds(cb) {
  fs.readFile(filePath, {encoding: 'utf8'}, (err, data) => {
    if (err) return cb(err);

    cb(null, JSON.parse(data));
  });
}

function getHighestId(music) {
  return Object.keys(music).reduce(
    (highest, id) => Math.max(highest, Number(id)),
    0);
}

function saveCds(music, cb) {
  fs.writeFile(filePath, JSON.stringify(music), cb);
}

app['delete']('/album/:id', (req, res) => {
  getCds((err, music) => {
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
  res.set('Content-Type', 'application/json');
  let rs = fs.createReadStream(filePath);
  rs.pipe(res);
});

app.get('/album/:id', (req, res) => {
  getCds(function (err, music) {
    if (err) return res.status(500).end(err);

    res.set('Content-Type', 'application/json');
    const id = req.params.id;
    res.end(JSON.stringify(music[id]));
  });
});

app.post('/album', (req, res) => {
  getCds((err, music) => {
    if (err) return res.status(500).end(err);

    const album = req.body;
    album.id = Number(getHighestId(music)) + 1;
    console.log('server.js post: album =', album);
    res.end('/album/' + album.id);
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
