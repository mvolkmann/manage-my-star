(function () {
  'use strict';

  let app = angular.module('Music', ['ui.router']);

  app.config(($stateProvider, $urlRouterProvider) => {
    $urlRouterProvider.otherwise('/music');
    $stateProvider.
      state('music', {
        url: '/music',
        templateUrl: 'src/manage.html',
        controller: 'ManageCtrl',
        resolve: {
          music: ['musicSvc', svc => svc.getMusic()]
        }
      });
  });

  app.factory('musicSvc', ['$http', $http => {
    return {
      deleteAlbum(id) {
        return $http.delete('/album/' + id);
      },
      getMusic() {
        return $http.get('/album');
      }
    };
  }]);

  app.controller('ManageCtrl', ['$scope', 'music', 'musicSvc',
    ($scope, music, musicSvc) => {

    music = music.data;
    $scope.music = music;

    $scope.deleteAlbum = id => {
      const msg = 'Are you sure you want to delete the album "' +
        music[id].title + '"?';
      if (confirm(msg)) musicSvc.deleteAlbum(id);
    };
  }]);
})();
