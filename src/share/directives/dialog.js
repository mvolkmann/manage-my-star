(() => {
  'use strict';
  /*global angular: false, $: false */

  var module = angular.module('mtz-directives');

  module.factory('dialogSvc', ['$q', '$rootScope', ($q, $rootScope) => {
    var svc = {};

    svc.confirm = question => {
      var dfr = $q.defer();

      $rootScope.confirm = {
        question: question,
        yesFn: () => dfr.resolve(),
        noFn: () => dfr.reject()
      };

      $('#mtz-confirm-dialog').modal('show');

      return dfr.promise;
    };

    svc.hide = id => $('#' + id).modal('hide');

    svc.hideMessage = () => svc.hide('global-error');

    /**
     * @param id the id of the HTML element that defines the content
     * @param classes an optional array of CSS class names
     *   to add to that element;
     *   Examples include modal-sm and modal-lg
     *   that are defined by Twitter Bootstrap.
     * @param onDismiss an optional function to be called
     *   when the user dismisses the dialog
     */
    svc.show = (id, classes, onDismiss) => {
      var dialog = $('#' + id);
      if (Array.isArray(classes)) {
        classes.forEach(dialog.addClass.bind(dialog));
      }

      // Setting backdrop to static prevents the dialog from closing
      // when the user clicks outside of it.
      dialog.modal({backdrop: 'static', show: true});

      if (onDismiss) dialog.on('hidden.bs.modal', onDismiss);
    };

    /**
     * @param title displayed in the dialog header
     * @param message displayed in the dialog body
     * @param classes see show method
     * @param onDismiss see show method
     */
    svc.showError = (title, message, classes, onDismiss) =>
      svc.showMessage(title, message, classes, onDismiss);

    /**
     * This assumes that HTML for a Twitter Bootstrap modal
     * with the id "global-error" exists in the app.
     * For eP3, this is in main/index-in.html.
     * @param title displayed in the dialog header
     * @param message displayed in the dialog body
     * @param classes see show method
     * @param onDismiss see show method
     */
    svc.showMessage = (title, message, classes, onDismiss) => {
      $rootScope.title = title;
      $rootScope.message = message;
      svc.show('global-error', classes, onDismiss);
    };

    return svc;
  }]);

  /**
   * Example usage:
   * <div id="my-dialog" mtz-dialog
   *   heading="Make a Move"
   *   btn-map="btnMap"
   *   data="data">
   * </div>
   *
   * btnMap is an object on the scope
   * whose keys are the text for buttons in the footer and
   * whose values are functions to invoke when the buttons are pressed.
   * Omit btn-map if no buttons are needed at the bottom of the dialog.
   * In that case there will be no footer area.
   *
   * data is an object on the scope that can be used to
   * make data available to the trancluded HTML
   * and make result data available to the code
   * that causes the dialog to be displayed.
   * It can also hold functions to be invoked
   * when specific buttons are pressed.
   *
   * When width is used, an id MUST be given on the element
   * where mtz-dialog is applied.
   *
   * To display the dialog,
   * dialogSvc.show('my-dialog');
   */
  module.directive('mtzDialog', () => {
    return {
      restrict: 'AE',
      scope: {
        btnMap: '=',
        busyRef: '=',
        heading: '@',
        data: '=',
        width: '='
      },
      replace: true,
      link: (scope, element, attrs) => {
        scope.$watch('width', () => {
          if (attrs.id && scope.width) {
            var jq = $('#' + attrs.id + ' .modal-dialog');
            jq.css('width', scope.width + 'px');
          }
        });
      },
      templateUrl: 'src/share/directives/dialog.html',
      transclude: true
    };
  });
})();
