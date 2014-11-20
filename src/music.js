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
      getMusic() {
        return $http.get('/album');
      }
    };
  }]);

  app.controller('ManageCtrl', ['$scope', 'music', ($scope, music) => {
    $scope.music = music.data;
  }]);
})();
