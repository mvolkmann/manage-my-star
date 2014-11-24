(() => {
  'use strict';

  // This defines a set of custom AngularJS filters.

  // The next line allows adding a method to the String class.
  /*eslint no-extend-native: 0 */
  /*global angular: false, _: false */

  var module = angular.module('mtz-share');

  var acronyms = ['GMC'];

  // Adds capitalize method to JavaScript String class.
  // Can't use arrow function here because it loses "this"!
  String.prototype.capitalize = function () {
    // Capitalize each word.
    var result = this.split(' ').
      map(part => {
        return _.contains(acronyms, part) ?
          part :
          part.charAt(0).toUpperCase() + part.substring(1).toLowerCase();
      }).
      join(' ');

    // Capitalize each letter following a slash.
    result = result.replace(/\/\w/, match =>
      '/' + match.charAt(1).toUpperCase());

    return result;
  };

  /**
   * This is an AngularJS filter that returns the absolute value of a number.
   */
  module.filter('abs', () => number => Math.abs(number));

  /**
   * This is an AngularJS filter that capitalizes all the words in a string.
   */
  module.filter('capitalize', () => str => str.capitalize());

  /**
   * This is an AngularJS filter that limits the length of a string.
   * If it is longer than the specified length,
   * it is truncated and an elipsis is added to the end.
   * Also see share/directives/limit.js
   * which is often better to use than this
   * because it adds the full text as a tooltip.
   */
  module.filter('limit', () =>
    (str, limit) =>
      str.length <= limit ? str : str.substring(0, limit - 3) + '...');

  /**
   * This is an AngularJS filter that replaces all colons in a string
   * with hypens.  It is useful for forming valid HTML ids
   * from sysUser user names (login ids).
   * This may be in use at the moment.
   */
  module.filter('makeId', () => str => str.replace(/:/g, '-'));

  /**
   * This is an AngularJS filter that replaces the special number values
   * POSITIVE_INFINITY, NEGATIVE_INFINITY, and NaN with zero.
   * TODO: After switching to Traceur,
   *       use Number.isNaN instead of isNaN.
   */
  module.filter('nfix', () => n => {
    var result =
      n === Number.POSITIVE_INFINITY ? 0 :
      n === Number.NEGATIVE_INFINITY ? 0 :
      typeof n === 'number' && isNaN(n) ? 0 :
      n;
    return result;
  });

  /**
   * The orderBy filter only works with arrays,
   * not object property values.
   * This is a custom filter that takes an object
   * and returns an array of its property values.
   * Use it before orderBy to sort object property values.
   */
  module.filter('objToArr', () =>
    obj => angular.isObject(obj) ?
      Object.keys(obj).map(key => obj[key]) :
      []);

  /**
   * This is an AngularJS filter that returns
   * a number formatted as a percentage.
   * ex. if someNumber = 0.1925,
   *     {{someNumber | percent:2}}
   *     results in "19.25%"
   */
  module.filter('percent', () =>
    (number, places = 0) => (number * 100).toFixed(places) + '%');

  /**
   * Prevents escaping of HTML.
   * Used in index-in.html to display HTML
   * from server-side errors in an error dialog.
   */
  module.filter('raw', ['$sce',
    $sce => text => $sce.trustAsHtml(text)
  ]);
})();
