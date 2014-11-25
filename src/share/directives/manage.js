(() => {
  'use strict';

  let module = angular.module('mtz-directives');

  var dropDownDisplayed, resourceName, tableBody;

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

  // Temporary polyfill until Traceur adds this.
  if (!Array.prototype.includes) {
    Array.prototype.includes = function (value) {
      return this.indexOf(value) !== -1;
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
          let value = filter[prop];
          if (value === null) value = '';
          url += '&filter-' + prop + '=' + value;
        });
        return $http.get(url);
      },
      updateObject(obj) {
        return $http.put('/' + resourceName + '/' + obj.id, obj);
      }
    };
  }]);

  /**
   * Repeated tries to find a DOM element that matches a given selector
   * until it succeeds.  This is useful when the element is being
   * added asynchronously and doesn't exist yet.
   */
  function getJq(selector) {
    function find(cb) {
      var jq = $(selector);
      if (jq.length) { // found
        cb(jq);
      } else { // not found
        setTimeout(() => find(cb), 50);
      }
    }

    return new Promise(resolve => find(resolve));
  }

  function setupTable() {
    var promises = [
      getJq('.manage-table-head'),
      getJq('.manage-table-body')
    ];
    Promise.all(promises).then(jqs => {
      let [head, body] = jqs;
      tableBody = body;

      // Find the bottom y coordinate of the table head.
      let headBottomY = parseInt(head.css('margin-top')) + head.height();

      // Get references to DOM elements from the jQuery objects.
      let head0 = head[0], body0 = body[0];

      body.on('scroll', event => {
        if (dropDownDisplayed) {
          // Preventing scroll table body.
          body.css('overflow', 'hidden');
          return;
        }

        head0.scrollTop = body0.scrollTop - headBottomY;
        head0.scrollLeft = body0.scrollLeft;
      });
    });
  }

  module.controller('ManageCtrl', [
    '$modal', '$scope', 'dialogSvc', 'manageSvc',
    ($modal, $scope, dialogSvc, manageSvc) => {

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
          $scope.clearForm();
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

    $scope.clearForm = () => {
      $scope.editObj = null;
      $scope.fields.forEach(field => field.value = null);
    };

    $scope.deleteObject = (event, index) => {
      let obj = $scope.objects[index];
      const msg = 'Are you sure you want to delete ' +
        $scope.objToStr(obj) + '?';
      dialogSvc.confirm(msg).then(() =>
        manageSvc.deleteObject(obj.id).then(
          () => {
            $scope.clearForm();
            $scope.objects.splice(index, 1);
          },
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
      if (!$scope.canUpdate) return;
      $scope.editObj = obj;
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

    $scope.getInputType = field => {
      var type = field.type;
      return type === 'number' ? 'number' : 'text';
    };

    $scope.isHidden = field => $scope.hiddenProps.includes(field.property);

    $scope.isReadOnly = (field, obj) => {
      if (!obj) return false;
      if (field.readOnly) return true;
      let rop = obj.readOnlyProps;
      return rop && rop.includes(field.property);
    };

    $scope.notImplemented = () => handleError('Not implemented yet');

    $scope.sortOn = field => {
      $scope.reverse = field === $scope.sortField && !$scope.reverse;
      $scope.sortField = field;
      updateTable();
    };

    $scope.tableHeadToggle = (open) => {
      dropDownDisplayed = open;
      if (!open) {
        // Resume scroll table body.
        tableBody.css('overflow', 'scroll');

        return;
      }

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
      album.id = $scope.editObj.id;
      manageSvc.updateObject(album).then(
        () => {
          $scope.clearForm();
          updateTable(); // so new album is in sorted order
        },
        handleError);
    };
  }]);

  module.directive('manageMyStar', () => {
    return {
      restrict: 'AE',
      scope: {
        canAdd: '=', // must use = instead of @ for booleans
        canDelete: '=',
        canFilter: '=',
        canUpdate: '=',
        hideProps: '@', // comma-separated list of property names
        resource: '@',
        sortProperty: '@',
        objToStr: '='
      },
      controller: 'ManageCtrl',
      templateUrl: 'src/share/directives/manage.html',
      link: scope => {
        scope.hiddenProps = scope.hideProps ?
          scope.hideProps.split(',').map(s => s.trim()) :
          [];
        scope.showForm = scope.canAdd || scope.canUpdate;
        scope.actionCount = scope.canDelete ? 1 : 0;
      }
    };
  });
})();
