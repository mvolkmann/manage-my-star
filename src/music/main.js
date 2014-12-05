'use strict';
/*global angular: false */

let music = angular.module('Music', ['mtz-share', 'mtz-directives']);

music.controller('MusicCtrl', ['$scope', $scope => {
  $scope.manageActions = [
    {
      name: 'Foo',
      action() {
        console.log('You clicked Foo.');
      }
    },
    {
      name: 'Bar',
      action() {
        console.log('You clicked Bar.');
      }
    },
    {
      glyph: 'tree-conifer',
      title: 'Christmas Tree',
      action(album) {
        alert('Merry Christmas ' + album.artist + '!');
      }
    }
  ];

  $scope.searchActions = [
    {
      glyph: 'tower',
      title: 'Your Move!',
      action() {
        alert('Consider castling.');
      }
    }
  ];
}]);
