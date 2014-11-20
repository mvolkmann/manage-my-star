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
          music: ['musicSvc', svc => svc.getMusic()]
        }
      });
  });

  app.factory('musicSvc', ['$http', $http => {
    return {
      addAlbum(album) { return $http.post('/album', album); },
      deleteAlbum(id) { return $http.delete('/album/' + id); },
      getFields() { return $http.get('/field'); },
      getMusic() { return $http.get('/album'); }
    };
  }]);

  app.controller('ManageCtrl', ['$scope', 'fields', 'music', 'musicSvc',
    ($scope, fields, music, musicSvc) => {

    fields = fields.data;
    $scope.fields = fields;

    music = music.data;
    $scope.music = music;

    $scope.addAlbum = () => {
      var album = {};
      fields.forEach(field => {
        album[field.property] = field.value;
      });
      console.log('music.js addAlbum: album =', album);
      musicSvc.addAlbum(album).then(
        res => {
          res = res.data;
          let index = res.lastIndexOf('/');
          var id = res.substring(index + 1);
          album.id = Number(id);
          music[id] = album;
        },
        handleError
      );
    };

    $scope.deleteAlbum = id => {
      const msg = 'Are you sure you want to delete the album "' +
        music[id].title + '"?';
      if (confirm(msg)) {
        musicSvc.deleteAlbum(id).then(
          () => delete music[album.id],
          handleError
        );
      }
    };

    $scope.notImplemented = () => alert('Not implemented yet');
  }]);
})();
