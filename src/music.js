(function () {
  'use strict';

  let app = angular.module('Music', ['ui.bootstrap', 'ui.router']);

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
      getAlbums(sortProperty = 'artist', reverse = false, filter = {}) {
        var url = '/album?sort=' + sortProperty + '&reverse=' + reverse;
        Object.keys(filter).forEach(prop => {
          url += '&filter-' + prop + '=' + filter[prop];
        });
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

  app.controller('ManageCtrl', [
    '$modal', '$scope', 'albums', 'fields', 'musicSvc',
    ($modal, $scope, albums, fields, musicSvc) => {

    function updateTable() {
      musicSvc.getAlbums(
        $scope.sortField.property, $scope.reverse, $scope.filter).
        then(albums => $scope.albums = albums.data);
    }

    var filterModal;
    $scope.filter = {};

    setupTable();

    fields = fields.data;
    $scope.fields = fields;
    $scope.sortField = fields[0];

    albums = albums.data;
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

    $scope.applyFilter = () => {
      /*
      console.log('music.js applyFilter: $scope.filter.text =',
        $scope.filter.text);
      $scope.filter.text = '';
      filterModal.close();
      */
      updateTable();
    };

    $scope.deleteAlbum = index => {
      var album = albums[index];
      const msg = 'Are you sure you want to delete the album "' +
        album.title + '" by "' + album.artist + '"?';
      if (confirm(msg)) {
        musicSvc.deleteAlbum(album.id).then(
          () => albums.splice(index, 1),
          handleError
        );
      }
    };

    $scope.filter = (event, field) => {
      //TODO: Why does this get called initially with no event?
      if (!event) return;

      $scope.field = field;

      filterModal = $modal.open({
        scope: $scope,
        size: 'sm',
        templateUrl: 'src/filter-dialog.html'
      });
      var dialog = $('.modal-dialog');

      // Position the modal below the caret that was clicked.
      var caret = $(event.target);
      var offset = caret.offset();
      var top = offset.top + caret.height();
      var right = offset.left + caret.width();
      var left = right - dialog.width();
      dialog.css({position: 'fixed', top: top, left: left});

    };

    $scope.notImplemented = () => alert('Not implemented yet');

    $scope.sortOn = field => {
      $scope.reverse = field === $scope.sortField && !$scope.reverse;
      $scope.sortField = field;
      updateTable();
    };

    $scope.tableHeadToggle = (open) => {
      if (!open) return;

      // Find the dropdown that is visible.
      var dropdown = $('.dropdown-menu:visible');
      var caret = dropdown.prev();

      // Position the dropdown so it isn't clipped inside the table header.
      var offset = dropdown.offset();
      var right = caret.offset().left + caret.width();
      var left = right - dropdown.width();
      dropdown.css({position: 'fixed', top: offset.top, left: left});
    };
  }]);
})();
