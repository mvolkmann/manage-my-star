(function () {
  'use strict';

  let app = angular.module('Music', ['ui.router']);

  function handleError(err) {
    alert(err);
  }

  app.config(($stateProvider, $urlRouterProvider) => {
    $urlRouterProvider.otherwise('/music');
    $stateProvider.
      state('music', {
        url: '/music',
        templateUrl: 'src/manage.html',
        controller: 'ManageCtrl',
        resolve: {
          fields: ['musicSvc', svc => svc.getFields()],
          albums: ['musicSvc', svc => svc.getAlbums()]
        }
      });
  });

  app.factory('musicSvc', ['$http', $http => {
    return {
      addAlbum(album) { return $http.post('/album', album); },
      deleteAlbum(id) { return $http.delete('/album/' + id); },
      getFields() { return $http.get('/field'); },
      getAlbums(sortProperty = 'artist', reverse = false) {
        var url = '/album?sort=' + sortProperty + '&reverse=' + reverse;
        return $http.get(url);
      }
    };
  }]);


  function setupTable() {
    var head = $('.manage-table-head');
    var body = $('.manage-table-body');
    var offset = parseInt(head.css('margin-top')) + head.height();

    var head0 = head[0], body0 = body[0];

    body.on('scroll', () => {
      head0.scrollTop = body0.scrollTop - offset;
      head0.scrollLeft = body0.scrollLeft;
    });
  }

  app.controller('ManageCtrl', ['$scope', 'albums', 'fields', 'musicSvc',
    ($scope, albums, fields, musicSvc) => {

    setupTable();

    fields = fields.data;
    $scope.fields = fields;
    $scope.sortField = fields[0];

    albums = albums.data;
    console.log('music.js ManageCtrl: albums =', albums);
    $scope.albums = albums;

    $scope.addAlbum = () => {
      var album = {};
      fields.forEach(field => {
        album[field.property] = field.value;
      });
      musicSvc.addAlbum(album).then(
        res => {
          res = res.data;
          let index = res.lastIndexOf('/');
          var id = res.substring(index + 1);
          album.id = Number(id);
          albums[id] = album;
        },
        handleError
      );
    };

    $scope.deleteAlbum = index => {
      const msg = 'Are you sure you want to delete the album "' +
        albums[index].title + '"?';
      if (confirm(msg)) {
        var id = albums[index].id;
        musicSvc.deleteAlbum(id).then(
          () => delete album[index],
          handleError
        );
      }
    };

    $scope.notImplemented = () => alert('Not implemented yet');

    $scope.sortOn = field => {
      $scope.reverse = field === $scope.sortField && !$scope.reverse;
      $scope.sortField = field;
      musicSvc.getAlbums(field.property, $scope.reverse).then(
        albums => $scope.albums = albums.data);
    };
  }]);
})();
