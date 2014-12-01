'use strict';
/*global $: false, angular: false */

let myModule = angular.module('mtz-directives');

let dropDownDisplayed, resourceName, tableBody;

// Temporary polyfill until Traceur adds this.
if (!Array.prototype.find) {
  Array.prototype.find = function (fn) {
    for (let i = 0; i < this.length; i++) {
      let value = this[i];
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

function convertType(value) {
  let num = Number(value);
  return value === 'true' ? true :
    value === 'false' ? false :
    typeof value === 'boolean' ? value :
    !Number.isNaN(num) ? num :
    value;
}

myModule.factory('manageSvc', ['$http', $http => {
  function getFilterQueryParams(filters, prefix) {
    let s = '';
    if (filters) {
      Object.keys(filters).forEach(prop => {
        let value = filters[prop];
        if (value || value === false) {
          s += '&' + prefix + '-' + prop + '=' + value;
        }
      });
    }
    return s;
  }

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
    getObjects({sortField, reverse, // using destructuring
      autoFilters, filters,
      startIndex, pageSize
    }) {
      let url = '/' + resourceName + '?sort=' + sortField.property;
      if (reverse) url += '&reverse=' + reverse;
      if (startIndex !== undefined) url += '&start=' + startIndex;
      if (pageSize) url += '&size=' + pageSize;
      url += getFilterQueryParams(autoFilters, 'af');
      url += getFilterQueryParams(filters, 'filter');
      //console.log('manage.js getObjects: url =', url);
      return $http.get(url);
    },
    getSearches() {
      return $http.get('/' + resourceName + '-search');
    },
    toString(id) {
      let config = {headers: {Accept: 'text/plain'}};
      return $http.get('/' + resourceName + '/' + id, config);
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
    let jq = $(selector);
    if (jq.length) { // found
      cb(jq);
    } else { // not found
      setTimeout(() => find(cb), 50);
    }
  }

  return new Promise(resolve => find(resolve));
}

function setupTable() {
  let promises = [
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

myModule.controller('ManageCtrl', [
  '$modal', '$scope', 'dialogSvc', 'manageSvc',
  ($modal, $scope, dialogSvc, manageSvc) => {

  let dropdownMenu, dropdownTop, filterModal, initialScrollY;

  function clearFilters() {
    let filters = $scope.filters;
    Object.keys(filters).forEach(prop => delete filters[prop]);
  }

  function getAutoFilters() {
    let filters = {};
    if ($scope.af) {
      $scope.af.split(',').forEach(s => {
        let [name, value] = s.split('=');
        name = name.trim();
        value = value.trim();
        filters[name] = convertType(value);
      });
    }
    return filters;
  }

  function getInputType(field) {
    let type = field.type;
    return type === 'boolean' ? 'checkbox' :
      type === 'number' ? 'number' :
      type === 'select' ? 'select' :
      'text';
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

  function processResponse(res) {
    $scope.objectCount = res.headers()['x-array-size'];
    $scope.endIndex = Math.min(
      $scope.startIndex + $scope.pageSize, $scope.objectCount);
    $scope.objects = res.data;
  }

  function setInputTypes(fields) {
    fields.forEach(field => field.inputType = getInputType(field));
  }

  function updateTable() {
    manageSvc.getObjects($scope).then(
      res => processResponse(res),
      res => handleError(res.data));
  }

  // This is for paging.
  $scope.startIndex = 0;

  resourceName = $scope.resource;
  $scope.autoFilters = getAutoFilters();
  $scope.filters = {};

  // Manage accordions.
  $scope.accordionStates = {managing: true, searching: false};
  let savedObjects;
  $scope.$watchCollection('accordionStates', states => {
    //console.log('manage.js: states =', states);
    if (!states.managing && $scope.objects && $scope.objects.length) {
      savedObjects = $scope.objects;
      $scope.objectCount = 0;
      $scope.objects = [];
    } else if (!states.searching && savedObjects) {
      $scope.objectCount = savedObjects.length;
      $scope.objects = savedObjects;
    }
  });

  manageSvc.getSearches().then(res => {
    let searches = res.data;
    searches.forEach(search => setInputTypes(search));
    $scope.searches = searches;
  });

  manageSvc.getFields().then(
    res => {
      $scope.fields = res.data;
      setInputTypes($scope.fields);
      $scope.sortField = $scope.fields.find(
        field => field.property === $scope.sortProperty);
      updateTable();
    },
    res => handleError(res.data));

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
    //filterModal.close();
    updateTable();
  };

  $scope.clearForm = () => {
    $scope.editObj = null;
    $scope.fields.forEach(field => field.value = null);
  };

  $scope.deleteObject = (event, index) => {
    let obj = $scope.objects[index];
    manageSvc.toString(obj.id).then(
      res => {
        let string = res.data;
        const msg = 'Are you sure you want to delete ' + string + '?';
        dialogSvc.confirm(msg).then(() =>
          manageSvc.deleteObject(obj.id).then(
            () => {
              $scope.clearForm();
              $scope.objects.splice(index, 1);
            },
            handleError
          ));
      },
      handleError);

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
    console.log('manage.js filter: entered');
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

  $scope.getFirstPage = () => {
    $scope.startIndex = 0;
    updateTable();
  };

  $scope.getLastPage = () => {
    var ps = $scope.pageSize;
    $scope.startIndex = Math.floor(($scope.objectCount - 1) / ps) * ps;
    updateTable();
  };

  $scope.getNextPage = () => {
    $scope.startIndex += $scope.pageSize;
    updateTable();
  };

  $scope.getPreviousPage = () => {
    $scope.startIndex -= $scope.pageSize;
    updateTable();
  };

  $scope.getPropValue = (obj, field) => {
    let value = obj[field.property];
    let type = field.type;
    if (type === 'boolean' && !value) value = false;
    return value;
  };

  $scope.hasNextPage = () =>
    $scope.startIndex + $scope.pageSize < $scope.objectCount;

  $scope.hasPreviousPage = () => $scope.startIndex > 0;

  $scope.isHidden = field => $scope.hiddenProps.includes(field.property);

  $scope.isReadOnly = (field, obj) => {
    if (!obj) return false;
    if (obj._readOnly) return true; // all fields are read-only
    if (field.readOnly) return true;
    let rop = obj.readOnlyProps;
    return rop && rop.includes(field.property);
  };

  $scope.notImplemented = () => handleError('Not implemented yet');

  $scope.search = (fields) => {
    // Copy search criteria into filters.
    clearFilters();
    let filters = $scope.filters;
    fields.forEach(field => {
      filters[field.property] = field.value;
    });

    // Copy relevant properties from scope, except autoFilters.
    let config = {
      sortField: $scope.sortField,
      reverse: $scope.reverse,
      filters: filters,
      startIndex: $scope.startIndex,
      pageSize: $scope.pageSize
    };

    manageSvc.getObjects(config).then(
      res => processResponse(res),
      res => handleError(res.data));
  };

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
    dropdownMenu = $('.dropdown-menu:visible');
    let caret = dropdownMenu.prev();
    let parent = dropdownMenu.parent();

    // Position the dropdown.
    // Setting the CSS position property to "fixed" prevents it
    // from being clipped by the bounds of the table header.
    let caretOffset = caret.offset();
    let caretWidth = parent.width();
    let caretHeight = parent.height();
    let right = caretOffset.left + caretWidth;
    initialScrollY = window.pageYOffset;
    dropdownTop = caretOffset.top + caretHeight - initialScrollY;
    let left = right - dropdownMenu.width();
    dropdownMenu.css({top: dropdownTop, left: left});
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

  window.onscroll = function (event) {
    if (dropdownMenu) {
      let top = dropdownTop + initialScrollY - window.pageYOffset;
      dropdownMenu.css('top', top);
    }
  };
}]);

myModule.directive('manageMyStar', () => {
  return {
    restrict: 'AE',
    scope: {
      af: '@autoFilters',
      canAdd: '=', // must use = instead of @ for booleans
      canDelete: '=',
      canFilter: '=',
      canUpdate: '=',
      hideProps: '@', // comma-separated list of property names
      resource: '@',
      sortProperty: '@',
      pageSize: '=', // must use = instead of @ for numbers
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
