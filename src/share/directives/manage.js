(() => {
  'use strict';

  let module = angular.module('mtz-directives');

  var resourceName;

  // Temporary polyfill until Traceur adds this.
  if (!Array.prototype.find) {
    Array.prototype.find = function (fn) {
      for (var i = 0; i < this.length; i++) {
        var value = this[i];
        if (fn(value)) return value;
      }
      return undefined;
    };
  }

  module.factory('manageSvc', ['$http', $http => {
    return {
      addObject(obj) {
        return $http.post('/' + resourceName, obj);
      },
      deleteObject(id) {
        return $http.delete('/' + resourceName + '/' + id);
      },
      getFields() {
        return $http.get('/' + resourceName + '-field');
      },
      getObjects(sortProperty, reverse = false, filter = {}) {
        let url = '/' + resourceName +
          '?sort=' + sortProperty + '&reverse=' + reverse;
        Object.keys(filter).forEach(prop => {
          url += '&filter-' + prop + '=' + filter[prop];
        });
        return $http.get(url);
      },
      updateObject(obj) {
        return $http.put('/' + resourceName + '/' + obj.id, obj);
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

  module.controller('ManageCtrl', [
    '$modal', '$scope', 'dialogSvc', 'manageSvc',
    ($modal, $scope, dialogSvc, manageSvc) => {

    function clearForm() {
      $scope.fields.forEach(field => field.value = null);
    }

    function getObjectFromForm() {
      let obj = {};
      $scope.fields.forEach(field => {
        obj[field.property] = field.value;
      });
      return obj;
    }

    function handleError(err) {
      dialogSvc.showError('Manage My * Error', err);
    }

    function updateTable() {
      manageSvc.getObjects(
        $scope.sortField.property, $scope.reverse, $scope.filter).
        then(objects => $scope.objects = objects.data);
    }

    resourceName = $scope.resource;

    manageSvc.getFields().then(
      res => {
        $scope.fields = res.data;
        $scope.sortField = $scope.fields.find(
          field => field.property === $scope.sortProperty);
      },
      res => handleError(res.data));

    manageSvc.getObjects($scope.sortProperty).then(
      res => $scope.objects = res.data,
      res => handleError(res.data));

    let filterModal;
    $scope.filter = {};

    setupTable();

    $scope.addObject = () => {
      let album = getObjectFromForm();
      manageSvc.addObject(album).then(
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

    $scope.deleteObject = (event, index) => {
      let obj = $scope.objects[index];
      const msg = 'Are you sure you want to delete ' +
        $scope.objToStr(obj) + '?';
      dialogSvc.confirm(msg).then(() =>
        manageSvc.deleteObject(obj.id).then(
          () => $scope.objects.splice(index, 1),
          handleError
        ));

      // Don't allow a click on a "Delete" button
      // to be treated as a click on the table row
      // which starts an edit.
      event.preventDefault();
      event.stopPropagation();
      return false;
    };

    $scope.editObject = (index, obj) => {
      $scope.editId = obj.id;
      $scope.fields.forEach(field => field.value = obj[field.property]);
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

    $scope.notImplemented = () => handleError('Not implemented yet');

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

    $scope.updateObject = () => {
      let album = getObjectFromForm();
      album.id = $scope.editId;
      manageSvc.updateObject(album).then(
        updateTable, // so new album is in sorted order
        handleError);
    };
  }]);

  module.directive('manageMyStar', () => {
    return {
      restrict: 'AE',
      scope: {
        resource: '@',
        sortProperty: '@',
        objToStr: '='
      },
      controller: 'ManageCtrl',
      templateUrl: 'src/share/directives/manage.html',
    };
  });
})();
