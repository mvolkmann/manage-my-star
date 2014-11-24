(() => {
  'use strict';

  var module = angular.module('Music', ['mtz-share', 'mtz-directives']);

  module.controller('MusicCtrl', ['$scope', $scope => {
    $scope.albumToString = album =>
      'the album "' + album.title + '" by "' + album.artist + '"';
  }]);
})();
