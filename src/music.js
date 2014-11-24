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
        let url = '/album?sort=' + sortProperty + '&reverse=' + reverse;
        Object.keys(filter).forEach(prop => {
          url += '&filter-' + prop + '=' + filter[prop];
        });
        return $http.get(url);
      },
      updateAlbum(album) {
        return $http.put('/album/' + album.id, album);
      }
    };
  }]);


  function setupTable() {
    let head = $('.manage-table-head');
    let body = $('.manage-table-body');
    let offset = parseInt(head.css('margin-top')) + head.height();

    let head0 = head[0], body0 = body[0];

    body.on('scroll', () => {
      head0.scrollTop = body0.scrollTop - offset;
      head0.scrollLeft = body0.scrollLeft;
    });
  }

  app.controller('ManageCtrl', [
    '$modal', '$scope', 'albums', 'fields', 'musicSvc',
    ($modal, $scope, albums, fields, musicSvc) => {

    function clearForm() {
      fields.forEach(field => field.value = null);
    }

    function getAlbumFromForm() {
      let album = {};
      fields.forEach(field => {
        album[field.property] = field.value;
      });
      return album;
    }

    function updateTable() {
      musicSvc.getAlbums(
        $scope.sortField.property, $scope.reverse, $scope.filter).
        then(albums => $scope.albums = albums.data);
    }

    let filterModal;
    $scope.filter = {};

    setupTable();

    fields = fields.data;
    $scope.fields = fields;
    $scope.sortField = fields[0];

    albums = albums.data;
    $scope.albums = albums;

    $scope.addAlbum = () => {
      let album = getAlbumFromForm();
      musicSvc.addAlbum(album).then(
        () => {
          clearForm();
          updateTable(); // so new album is in sorted order
        },
        handleError);
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

    $scope.deleteAlbum = (event, index) => {
      let album = $scope.albums[index];
      const msg = 'Are you sure you want to delete the album "' +
        album.title + '" by "' + album.artist + '"?';
      if (confirm(msg)) {
        musicSvc.deleteAlbum(album.id).then(
          () => $scope.albums.splice(index, 1),
          handleError
        );
      }

      // Don't allow a click on a "Delete" button
      // to be treated as a click on the table row
      // which starts an edit.
      event.preventDefault();
      event.stopPropagation();
      return false;
    };

    $scope.edit = (index, album) => {
      $scope.editId = album.id;
      fields.forEach(field => field.value = album[field.property]);
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
      let dialog = $('.modal-dialog');

      // Position the modal below the caret that was clicked.
      let caret = $(event.target);
      let offset = caret.offset();
      let top = offset.top + caret.height();
      let right = offset.left + caret.width();
      let left = right - dialog.width();
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
      let dropdown = $('.dropdown-menu:visible');
      let caret = dropdown.prev();

      // Position the dropdown.
      // Setting the CSS position property to "fixed"
      // prevents it from being clipped by the bounds of the table header.
      let offset = dropdown.offset();
      let right = caret.offset().left + caret.width();
      const bodyPadding = 20;
      let left = right - dropdown.width() + bodyPadding;
      dropdown.css({position: 'fixed', top: offset.top, left: left});
    };

    $scope.update = () => {
      let album = getAlbumFromForm();
      album.id = $scope.editId;
      musicSvc.updateAlbum(album).then(
        updateTable, // so new album is in sorted order
        handleError);
    };
  }]);
})();
