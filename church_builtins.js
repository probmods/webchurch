/* global global, require, module, exports */

// Contains the built-in Church functions written in Javascript.
// TODO: document annotations format

// style guide: in parameters to builtin functions, name them like 'lst'  rather than 'list'
// to call the list making function, i.e., the (list ...) function in church, use javascript
// function called List (or, to create a pair in javascript, use Pair)

// represents pairs as arrays
// represents lists as arrays with null as the last element 

// TODO: underscore is too heavy weight
// replace with mustache. or maybe something even dumber
var _ = require('underscore');
_.templateSettings = {
  interpolate: /\{\{(.+?)\}\}/g
};

var util = require('./util.js');
var fs = require('fs');

var typeUtils = require('./type-utils.js');
var listToArray = typeUtils.listToArray;
var arrayToList = typeUtils.arrayToList;

// determine whether we're running inside a browser
var inBrowser = false;
if (typeof document !== 'undefined') {
  inBrowser = true;
}

// var seed = require('seed-random');
// var set_seed =  function(str) {
//   seed(str, {global: true});//over-ride global Math.random
// };

module.exports.__annotations__ = {};

var addBuiltin = function(dict) {
  var fWrapped = wrapAsserts(dict);
  
  module.exports[dict.name] = fWrapped;
  module.exports.__annotations__[dict.name] = dict;
  return fWrapped;
};
var $b = addBuiltin;

var the_empty_list = [];

function sizeof(obj) { return Object.keys(obj).length; }

// needs to live in global scope
// but users shouldn't need to directly call this function
// so don't add it to annotations
var args_to_array = module.exports.args_to_list = function(args) {
  return Array.prototype.slice.call(args, 0 );
};

// needs to live in global scope
// but users shouldn't need to directly call this function
// so don't add it to annotations
var args_to_list = module.exports.args_to_list = function (args) {
  return arrayToList(args_to_array(args));
};

var plus = $b({
  name: 'plus',
  alias: '+',
  desc: "Add numbers",
  params: [{name: '[x ...]', type: 'real', desc: 'Numbers to add'}],
  fn: function f() {
    var sum = 0;
	  for (var i = 0, ii = arguments.length; i < ii; i++) {
		  sum = sum + arguments[i];
	  }
	  return sum;
  }
});

var minus = $b({
  name: 'minus',
  alias: '-',
  desc: "Subtract numbers",
  params: [{name: '[x ...]', type: 'real', desc: 'Numbers to subtract'}],
  fn: function() {
    var numArgs = arguments.length;
    if (numArgs == 0) {
      return 0;
    } else if (numArgs == 1) {
      return arguments[0];
    } else {
      var r = arguments[0];
      for (var i = 1; i < numArgs; i++) {
        r -= arguments[i];
      }
      return r;
    }
  } 
});

var mult = $b({
  name: 'mult',
  alias: '*',
  desc: "Multiply numbers",
  params: [{name: '[x ...]', type: 'real', desc: 'Numbers to multiply'}],
  fn: function() {
    var numArgs = arguments.length;
    var prod = 1;
    for (var i = 0; i < numArgs; i++) {
		  prod = prod * arguments[i];
	  }
    return prod;
  }
});

var div = $b({
  name: 'div',
  alias: '/',
  desc: "Divide numbers. Returns x / (y1 * y2 * ... )",
  params: [{name: '[x]', type: 'real', desc: 'Numerator'},
           {name: '[y ...]', type: 'real', desc: 'Denominator values'}
          ],
  fn: function() {
    var numerator = arguments[0];

    var numArgs = arguments.length;
    if (numArgs == 0) {
      return 1;
    } 
    
    if (numArgs == 1) {
      return arguments[0];
    }
    var denominator = 1;

    for (var i = 1; i < numArgs; i++) {
		  denominator *= arguments[i];
	  }
    return numerator / denominator;
  }
});

var round = $b({
  name: 'round',
  desc: 'Round a number',
  params: [{name: 'x', type: 'real'}],
  fn: function(x) {
    return Math.round(x);
  }
});

var abs = $b({
  name: 'abs',
  desc: 'Absolute value',
  params: [{name: 'x', type: 'real'}],
  fn: function(x) {
    return Math.abs(x);
  }
});

var log = $b({
  name: 'log',
  desc: 'Natural logarithm',
  params: [{name: 'x', type: 'real'}],
  fn: function(x) {
    return Math.log(x);
  }
});

var exp = $b({
  name: 'exp',
  desc: 'Exponential',
  params: [{name: 'x', type: 'real'}],
  fn: function(x) {
    return Math.exp(x);
  }
});

var expt = $b({
  name: 'expt',
  alias: ['pow','expt'],
  desc: 'Compute x raised to the power y',
  params: [{name: 'x', type: 'real'},
           {name: 'y', type: 'real'}
          ],
  fn: function(x, y) {
    return Math.pow(x, y);
  }
});

var sum = $b({
  name: 'sum',
  desc: 'Sum a list of numbers',
  params: [{name: 'lst', type: 'list<real>', desc: 'List of numbers to sum'}],
  fn: function(lst) {
    var arr = listToArray(lst);
    var r = 0;
    for(var i = 0, ii = arr.length; i < ii; i++) {
      r += arr[i];
    }

	  return r;
  } 
});

var prod = $b({
  name: 'prod',
  desc: 'Multiply a list of numbers',
  params: [{name: 'lst', type: 'list<real>', desc: 'List of numbers to multiply'}],
  fn: function(lst) {
    var arr = listToArray(lst);
    var r = 1;
    for(var i = 0, ii = arr.length; i < ii; i++) {
      r *= arr[i];
    }

	  return r;
  } 
});

// check whether y \in (x - tol, x + tol)
var soft_equal = $b({
  name: 'soft_equal',
  desc: 'Check whether y is in the interval [x - tol, x + tol]',
  params: [{name: 'y', type: 'real'},
           {name: 'x', type: 'real'},
           {name: 'tol', type: 'real'}
          ],
  fn: function(y, x, tol) {
    // FIXME: assert upper > lower
    return (y > x - tol && x < x + tol);
  }
});

var and = $b({
  name: 'and',
  desc: 'Logical conjunction',
  params: [{name: '[b ...]', type: 'boolean', desc: 'Boolean values'}],
  fn: function() {
	  var numArgs = arguments.length;
	  for (var i = 0; i < numArgs; i++) {
		  if (!arguments[i]) {
        return false;
      }
	  }
	  return true;
  }
});

var or = $b({
  name: 'or',
  desc: 'Logical disjunction',
  params: [{name: '[b ...]', type: 'boolean', desc: 'Boolean values'}],
  fn: function() {
	  var numArgs = arguments.length;
	  for (var i = 0; i < numArgs; i++) {
		  if (arguments[i]) {
        return true;
      }
	  }
	  return false;
  }
});

var not = $b({
  name: 'not',
  desc: 'Logical negation',
  params: [{name: 'b', type: 'boolean', desc: 'Boolean value'}],
  fn: function(b) {
    return !b;
  }
});

var all = $b({
  name: 'all',
  desc: 'Test whether all of the values in a list are true',
  params: [{name: 'lst', type: 'list<boolean>', desc: 'List of boolean values'}],
  fn: function(lst) {
    return and.apply(null, listToArray(lst));
  }
});

var none = $b({
  name: 'none',
  desc: 'Test whether none of the values in a list are true',
  params: [{name: 'lst', type: 'list<boolean>', desc: 'List of boolean values'}],
  fn: function(lst) {
    return !or.apply(null, listToArray(lst));
  }
});

var some = $b({
  name: 'some',
  alias: 'any',
  desc: 'Test whether some of the values in a list are true',
  params: [{name: 'lst', type: 'list<boolean>', desc: 'List of boolean values'}],
  fn: function(lst) {
    return or.apply(null, listToArray(lst));
  }
});

var greater = $b({
  name: 'greater',
  alias: '>',
  desc: 'Test whether x is greater than all y\'s',
  params: [{name: 'x', type: 'real'},
           {name: '[y ...]', type: 'real'}
          ], 
  fn: function() {
    var numArgs = arguments.length;
    var x = arguments[0];
    for (var i = 1; i < numArgs ; i++) {
      if (!(x > arguments[i])) {
        return false;
      }
    }
    return true;
  }
});

var less = $b({
  name: 'less',
  alias: '<',
  desc: 'Test whether x is less than all y\'s',
  params: [{name: 'x', type: 'real'},
           {name: '[y ...]', type: 'real'}
          ], 
  fn: function() {
    var numArgs = arguments.length;
    var x = arguments[0];
    for (var i = 1; i < numArgs ; i++) {
      if (!(x < arguments[i])) {
        return false;
      }
    }
    return true;
  }
});

var geq = $b({
  name: 'geq',
  alias: '>=',
  desc: 'Test whether x is greater than or equal to all y\'s',
  params: [{name: 'x', type: 'real'},
           {name: '[y ...]', type: 'real'}
          ], 
  fn: function() {
    var numArgs = arguments.length;
    var x = arguments[0];
    for (var i = 1; i < numArgs ; i++) {
      if (x < arguments[i]) {
        return false;
      }
    }
    return true;
  }
});

var leq = $b({
  name: 'leq',
  alias: '<=',
  desc: 'Test whether x is less than or equal to all y\'s',
  params: [{name: 'x', type: 'real'},
           {name: '[y ...]', type: 'real'}
          ], 
  fn: function() {
    var numArgs = arguments.length;
    var x = arguments[0];
    for (var i = 1; i < numArgs ; i++) {
      if (x > arguments[i]) {
        return false;
      }
    }
    return true;
  }
});

var eq = $b({
  name: 'eq',
  alias: '=',
  desc: 'Test whether all arguments are equal',
  params: [{name: '[x ...]', type: 'real'}], 
  fn: function() {
    var numArgs = arguments.length;
    var x = arguments[0];
    for (var i = 1; i < numArgs ; i++) {
      if (x != arguments[i]) {
        return false;
      }
    }
    return true;
  }
});

var is_null = $b({
  name: 'is_null',
  desc: 'Test whether x is null',
  params: [{name: 'x'}],
  fn: function(x) {
    return Array.isArray(x) && x.length == 1 && x[0] == null;
  }
});

// use uppercase to indicate that it's a constructor
var List = $b({
  name: 'list',
  desc: 'List constructor',
  params: [{name: '[...]'}],
  fn: function() {
    var args = args_to_array(arguments);
    return arrayToList(args, true);
  }
});

var is_list = $b({
  name: 'is_list',
  desc: 'Test whether x is a list',
  params: [{name: 'x'}],
  fn: function(x) {
    return Array.isArray(x) && x[x.length-1] == null;
  }
}); 

var Pair = $b({
  name: 'pair',
  alias: 'cons',
  desc: 'Pair constructor',
  params: [{name: 'head'},
           {name: 'tail'}
          ],
  fn: function(head, tail) {
    return [head].concat(tail);
  }
});

var is_pair = $b({
  name: 'is_pair',
  desc: 'Test whether x is a pair',
  params: [{name: 'x'}],
  fn: function(x) {
    return Array.isArray(x) && x.length >= 2;
  }
});

var first = $b({
  name: 'first',
  alias: 'car',
  desc: 'Get the first item of a list (or pair)',
  params: [{name: 'lst', type: 'pair'}],
  fn: function(lst) {
    var arr = listToArray(lst); 
    if (arr.length < 1) {
      throw new Error('Tried to get the first element of an empty list');
    }
    return lst[0];
  }
});

var second = $b({
  name: 'second',
  desc: 'Get the second item of a list',
  params: [{name: 'lst', type: 'list'}],
  fn: function(lst) {
    var arr = listToArray(lst); 
    if (arr.length < 2) {
      throw new Error('Tried to get the 2nd element of a list with only ' + arr.length + ' item');
    }
    return lst[1];
  }
});

var third = $b({
  name: 'third',
  desc: 'Get the third item of a list',
  params: [{name: 'lst', type: 'list'}],
  fn: function(lst) {
    var arr = listToArray(lst); 
    if (arr.length < 3) {
      throw new Error('Tried to get the 3rd element of list with only ' + arr.length + ' elements');
    }
    return lst[2];
  }
});

var fourth = $b({
  name: 'fourth',
  desc: 'Get the fourth item of a list',
  params: [{name: 'lst', type: 'list'}],
  fn: function(lst) {
    var arr = listToArray(lst); 
    if (arr.length < 4) {
      throw new Error('Tried to get the 4th element of list with only ' + arr.length + ' elements');
    }
    return lst[3];
  }
});

var fifth = $b({
  name: 'fifth',
  desc: 'Get the fifth item of a list',
  params: [{name: 'lst', type: 'list'}],
  fn: function(lst) {
    var arr = listToArray(lst); 
    if (arr.length < 5) {
      throw new Error('Tried to get the 5th element of list with only ' + arr.length + ' elements');
    }
    return lst[4];
  }
});

var sixth = $b({
  name: 'sixth',
  desc: 'Get the sixth item of a list',
  params: [{name: 'lst', type: 'list'}],
  fn: function(lst) {
    var arr = listToArray(lst); 
    if (arr.length < 6) {
      throw new Error('Tried to get the 6th element of list with only ' + arr.length + ' elements');
    }
    return lst[5];
  }
});

var seventh = $b({
  name: 'seventh',
  desc: 'Get the seventh item of a list',
  params: [{name: 'lst', type: 'list'}],
  fn: function(lst) {
    var arr = listToArray(lst); 
    if (arr.length < 7) {
      throw new Error('Tried to get the 7th element of list with only ' + arr.length + ' elements');
    }
    return lst[6];
  }
});

// pulled out into its own function because we use it elsewhere
var _rest = function(x) {
  if (x.length == 2 && x[1] != null) {
		return x[1];
	} else {
		return x.slice(1);
	}    
};

var rest = $b({
  name: 'rest',
  alias: 'cdr',
  desc: 'Get everything after the first item in a pair or list',
  params: [{name: 'x', type: 'pair'}],
  fn: _rest
});

var list_ref = $b({
  name: 'list_ref',
  desc: 'Get the nth item of a list (0-indexed)',
  params: [{name: 'lst', type: 'list'},
           {name: 'n', type: 'nat'}],
  fn: function(lst, n) {
    var array = listToArray(lst);
	  if (n >= array.length) {
	    throw new Error("Tried to the " + (n+1) + "th item in a list that only contains " + array.length + ' items');
	  } else {
		  return array[n];
	  }
  }
});

var list_elt = $b({
  name: 'list_elt',
  desc: 'Get the nth item of a list (1-indexed)',
  params: [{name: 'lst', type: 'list'},
           {name: 'n', type: 'nat'}],
  fn: function(lst, n) {
    if (n < 1) {
      throw new Error('The n argument to list-elt should be an integer >= 1');
    }
    return list_ref(lst, n-1);
  }
});

var take = $b({
  name: 'take',
  desc: 'Get the first n items in a list. If there are fewer than n items in the list, returns just the list.',
  params: [{name: 'lst', type: 'list'},
           {name: 'n', type: 'nat'}
          ],
  fn: function(lst,n) {
    return arrayToList(listToArray(lst).slice(0,n));
  }
});

var drop = $b({
  name: 'drop',
  desc: 'Drop the first n items from a list. If there are fewer than n items in the list, return the empty list.',
  params: [{name: 'lst', type: 'list'},
           {name: 'n', type: 'nat'}],
  fn: function(lst,n) {
    return arrayToList(listToArray(lst).slice(n)); 
  }
});

var sort = $b({
  name: 'sort',
  desc: 'Sort a list according to a comparator function cmp',
  params: [{name: "lst", type: "list"},
           {name: "[cmp]", type: "function", default: ">"}],
  fn: function(lst, cmp) {
    if (cmp === undefined) {
      cmp = greater;
    }
    var arr = listToArray(lst);
    var sortedArr = arr.sort( cmp );
    return arrayToList( sortedArr );

  }
});

var unique = $b({
  name: 'unique',
  desc: 'Get the unique items in a list',
  params: [{name: "lst", type: "list"},
           {name: "[eq]", type: "function", desc: "Optional equality comparison function", default: "equal?"}
          ],
  fn: function(lst, eq) {
    eq = eq || is_equal;
    
    var arr = listToArray(lst);
    var uniques = [];
    for(var i = 0, ii = arr.length ; i < ii; i++) {
      var v = arr[i];
      var alreadySeen = false;
      for(var j = 0, jj = uniques.length; j < jj; j++) {
        if (eq(v, uniques[j])) {
          alreadySeen = true;
          break;
        }
      }
      if (!alreadySeen) {
        uniques.push(v);
      }
    }

    return arrayToList(uniques, true);
    
  }
});

var list_index = $b({
  name: 'list_index',
  desc: '',
  params: [{name: "lst", type: "list"},
           {name: "x"}],
  fn: function(lst, x) {
    var arr = listToArray(lst);
    return arr.indexOf(x);

  }
});

var map_at = $b({
  name: 'map_at',
  desc: '',
  params: [{name: "lst", type: "list"},
           {name: "i", type: "nat"},
           {name: "f", type: "function"}],
  fn: function(lst, i, f) {
    var arr = listToArray(lst);
    arr[i] = f(arr[i]);
    return arrayToList(arr, true);

  }
});

var max = $b({
  name: 'max',
  desc: 'Maximum of arguments',
  params: [{name: "[x ...]", type: "real", desc: ""}],
  fn: function(x) {
	  var args = args_to_array(arguments);
	  return Math.max.apply(Math, args);

  }
});

var min = $b({
  name: 'min',
  desc: 'Minimum of arguments',
  params: [{name: "[x ...]", type: "real", desc: ""}],
  fn: function() {
	  var args = args_to_array(arguments);
	  return Math.min.apply(Math, args);

  }
});

var mean = $b({
  name: 'mean',
  desc: 'Mean of a list',
  params: [{name: "lst", type: "list<real>", desc: ""}],
  fn: function(lst) {
	  var vals = listToArray(lst),
        sum = 0,
        n = vals.length;
    
	  for (var i=0; i < n; i++) {
      sum += vals[i];
    }
	  return sum / n;

  }
});

var append = $b({
  name: 'append',
  desc: 'Merge an arbitrary number of lists',
  params: [
    {name: '[lst ...]', type: 'list'}
  ],
  fn: function() {
    
    // not ideal because we're crossing the list abstraction barrier
    var r = [];
    for(var i = 0, ii = arguments.length; i < ii; i++) {
      r = r.concat(listToArray(arguments[i]));
    }
    return arrayToList(r, true); 
  }
});

var flatten = $b({
  name: 'flatten',
  desc: '',
  params: [{name: "lst", type: "list", desc: ""}],
  fn: function(lst) {
	  var flattened = [];
	  var arr = listToArray(lst);
	  for (var i=0, ii = arr.length; i < ii; i++) {
		  var elem = arr[i];
		  if (is_list(elem)) {
			  flattened = flattened.concat((listToArray(flatten(elem))));
		  } else {
			  flattened.push(elem);
		  }
	  }
	  return arrayToList(flattened);

  }
});

var fold = $b({
  name: 'fold',
  desc: 'Accumulate the result of applying a function to a list',
  mathy: "f(lst_0, f(lst_1, f(..., f(lst_n, init)))))",
  params: [
    {name: 'f', type: 'function', desc: 'Function to apply'},
    {name: 'init', desc: 'Seed value for function'},
    {name: '[lst ...]', type: 'list', desc: 'List to apply the fold over'}
  ],
  fn: function(fn, initialValue /*, ... */ ) {
	  var args = args_to_array(arguments);

	  var lists = args.slice(2);
	  var arrs = [];
	  for (var i=0; i<lists.length; i++) {
		  arrs.push(listToArray(lists[i]));
	  }
	  var max_length = Math.min.apply(this, arrs.map(function(el) {return el.length;}));
	  var cumulativeValue = initialValue; 
	  for (i=0; i<max_length; i++) {
		  var fn_args = arrs.map(function(el) {return el[i];});
		  fn_args.push(cumulativeValue);
		  cumulativeValue = fn.apply(this, fn_args);
	  }
	  return cumulativeValue;

  }
});

var repeat = $b({
  name: 'repeat',
  desc: "Repeat a function n times",
  params: [
    {name: 'n', type: 'nat', desc: 'Number of times to repeat'},
    {name: 'f', type: 'function', desc: 'Function to repeat'}
  ],
  fn: function(n, fn) {
	  var lst = [];
	  for(var i=0;i<n;i++) {
		  lst.push(fn());
	  }
	  lst.push(null);
	  return lst;

  }
}); 

var for_each = $b({
  name: 'for_each',
  desc: 'Apply a function to every member of a list, but don\'t return anything', 
  params: [
    {name: 'fn', type: 'function'},
    {name: 'lst', type: 'list'}],
  fn: function(fn,lst) {
    var arr = listToArray(lst);
    arr.forEach(function(x, i, lst) { fn(x) }); 
    return;

  }
}); 

var map = $b({
  name: 'map',
  desc: 'Apply a function to every element of a list',
  params:
  [
    {name: 'fn', type: 'function', desc: ''},
    {name: '[lst ...]', type: 'list'}
  ],
  fn: function() {
    var args = args_to_array(arguments),
        fn = args[0]; 
    
    var lists = args.slice(1),
        arr = [],
        numLists = lists.length;

    var arrays = lists.map(function(L) { return listToArray(L) });
    
    // ^ have to write it verbosely because otherwise, map will pass in extra arguments
    // namely the current index and the entire array. the index element will
    // get used as the recursive flag to the listToArray function
    // this causes nested maps to have the wrong behavior
    
    var n = Math.min.apply(null, arrays.map(function(a) { return a.length}));

    for(var i=0;i<n;i++) {
		  arr[i] = fn.apply(null, arrays.map(function(L) { return L[i]}));
	  }

	  return arrayToList(arr, true);

  }
});

var filter = $b({
  name: 'filter',
  desc: 'Select subset of elements of a list that satisfy a predicate pred',
  params: [{name: "pred", type: "function", desc: ""},
           {name: "lst", type: "list", desc: ""}],
  fn: function(pred, lst) {
    var arr = listToArray(lst).filter(pred);
    arr.push(null);
    return arr; 
  }
});

var reverse = $b({
  name: 'reverse',
  desc: 'Reverse a list',
  params: [{name: "lst", type: "list", desc: ""}],
  fn: function(lst) {
	  var arr = listToArray(lst).reverse();
	  arr.push(null);
	  return arr;

  }
});

var length = $b({
  name: 'length',
  desc: 'Get the length of a list',
  params: [{name: "lst", type: "list", desc: ""}],
  fn: function(lst) {
    return listToArray(lst).length;

  }
});

// predefine the length, decently quick and
// not so complicated as recursive merge
// http://jsperf.com/best-init-array/3
var make_list = $b({
  name: 'make_list',
  desc: 'Make a list of length n where all elements are x',
  params: [{name: "n", type: "nat", desc: ""},
           {name: "x"}],
  fn: function(n, x) {
	if (n == 0) return the_empty_list;
	var results = new Array(n);

	for (var i = 0; i < n; i += 1) {
		results[i] = x;
	}
	return arrayToList(results, true);

  }
});

var is_eq = $b({
  name: 'is_eq',
  desc: 'TODO',
  params: [{name: "x", type: "", desc: ""}, {name: "y", type: "", desc: ""}],
  fn: function(x, y) {
	return x === y;
  }
});

var is_equal = $b({
  name: 'is_equal',
  desc: 'TODO',
  params: [{name: "x", type: "", desc: ""}, {name: "y", type: "", desc: ""}],
  fn: function(x, y) {
    if (typeof(x) == typeof(y)) {
		  if (Array.isArray(x)) {
			  if (x.length == y.length) {
          for(var i = 0, ii = x.length; i < ii; i++) {
            if (!is_equal(x[i], y[i])) {
              return false;
            }
          };
          return true;
          
			  } else {
				  return false;
			  }
		  } else {
			  return x == y;
		  }
	  } else {
		  return false;
	  }
  }
});

var member = $b({
  name: 'member',
  desc: 'Test whether x is in a list according to some optional comparator function cmp)',
  params: [
    {name: "x"},
    {name: "list", type: "list"},
    {name: "[cmp]", type: "function"}
  ],
  fn: function(x, lst, cmp) {
    cmp = cmp || is_equal;
    
    var array = listToArray(lst);
    
	  for (var i = 0, ii = array.length; i < ii; i++) {
		  if (cmp(x, array[i])) {
			  return lst;
		  }
	  }
	  return false; 
  }
});

var apply = $b({
  name: 'apply',
  desc: 'TODO',
  params: [{name: "fn", type: "function", desc: ""},
           {name: "lst", type: "list", desc: ""}],
  fn: function(fn, lst) {
	  return fn.apply(null, listToArray(lst)); 
  }
});

var assoc = $b({
  name: 'assoc',
  desc: 'Lookup a value in an association list',
  params: [{name: "x", type: "", desc: ""},
           {name: "alist", type: "list<pair>", desc: ""}],
  fn: function(x, alist) {
	  alist = listToArray(alist);
	  for (var i=0; i<alist.length; i++) {
		  if (is_equal(alist[i][0], x)) {
			  return alist[i];
		  }
	  }
	  return false; 
  }
});

var regexp_split = $b({
  name: 'regexp_split',
  desc: 'Split a string into a list of substrings based on a separator',
  alias: ['regexp-split','string-split'],
  params: [{name: "s", type: "string", desc: ""},
           {name: "sep", type: "string", desc: ""}],
  fn: function(str, sep) {
	  return arrayToList(str.split(sep)); 
  }
});


var boolean_to_number = $b({
  name: 'boolean_to_number',
  desc: 'Convert a boolean to a number',
  params: [{name: "b", type: "boolean", desc: ""}],
  fn: function(b) {
    return b ? 1 : 0;
  }
});

var number_to_boolean = $b({
  name: 'number_to_boolean',
  desc: 'Convert a number to a boolean',
  params: [{name: "x", type: "real", desc: ""}],
  fn: function(x) {
    return x == 0 ? false : true;
  }
});

var bang_bang = $b({
  name: '!!',
  desc: 'Coerce an object to a boolean',
  params: [{name: 'x'}],
  fn: function(x) {
    return !!x;
  }
})

var string_to_number = $b({
  name: 'string_to_number',
  desc: 'Convert a string to a number',
  params: [{name: "s", type: "string", desc: ""}],
  fn: function(s) {
    var x = parseFloat(s);
    if (isNaN(x)) {
      return false;
    }
    return x;
  }
});


var number_to_string = $b({
  name: 'number_to_string',
  desc: 'Convert a number to a string',
  params: [{name: "x", type: "real", desc: ""}],
  fn: function(num) {
	  return num.toString(); 
  }
});

var wrapped_uniform_draw = $b({
  name: 'wrapped_uniform_draw',
  desc: 'Uniformly sample an element from a list',
  numArgs: [1,3],
  params: [{name: "items", type: "list", desc: ""}],
  fn: function(items, isStructural, conditionedValue) {
    var u = uniformDraw(listToArray(items, false), isStructural, conditionedValue);
	  return u; //uniformDraw(listToArray(items, false), isStructural, conditionedValue);

  }
});

var wrapped_multinomial = $b({
  name: 'wrapped_multinomial',
  desc: 'Sample an element from lst with the probability specified in probs',
  numArgs: [2,4],
  params: [{name: "lst", type: "list", desc: ""},
           {name: "probs", type: "list<real>", desc: ""}],
  fn: function(lst, probs, isStructural, conditionedValue) {
	  if (lst.length != probs.length) {
		  throw new Error("For multinomial, lists of items and probabilities must be of equal length");
	  }
	  return multinomialDraw(listToArray(lst), listToArray(probs), isStructural, conditionedValue);

  }
});

// TODO: make sure p is less than 1
var wrapped_flip = $b({
  name: 'wrapped_flip',
  desc: 'Flip a weighted coin. Returns true or false',
  numArgs: [0,1,3],
  params: [{name: "[p]", type: "real", desc: "", default: "0.5"},
           {name: "[isStructural]", type: "", desc: "", noexport: true},
           {name: "[conditionedValue]", type: "", desc: "", noexport: true}
          ],
  fn: function(p, isStructural, conditionedValue) {
	  return flip(p, isStructural, conditionedValue) == 1;

  }
});

var wrapped_uniform = $b({
  name: 'wrapped_uniform',
  desc: 'Sample a random real uniformly from the interval [a,b]',
  numArgs: [2,4],
  params: [{name: "a", type: "real", desc: ""},
           {name: "b", type: "real", desc: ""}],
  fn: function(a, b, isStructural, conditionedValue) {
	  return uniform(a, b, isStructural, conditionedValue);

  }
});

var wrapped_random_integer = $b({
  name: 'wrapped_random_integer',
  desc: '',
  alias: ['random-integer','sample-integer'],
  numArgs: [1,3],
  params: [{name: "n", type: "nat", desc: ""}],
  fn: function(n,isStructural, conditionedValue) {
    var probs = [], p = 1/n;
	  for (var i = 0; i < n; i++){
      probs[i] = p;
    };
    return multinomial(probs,isStructural, conditionedValue); 
  }
});

var wrapped_gaussian = $b({
  name: 'wrapped_gaussian',
  desc: 'Sample from the Gaussian distribution N(mu, sigma)',
  numArgs: [0,1,2,4],
  params: [{name: "[mu]", type: "real", desc: "", default: 0},
           {name: "[sigma]", type: "real", desc: "", default: 1},
           {name: "[isStructural]", type: "", desc: "", noexport: true},
           {name: "[conditionedValue]", type: "", desc: "", noexport: true}
          ],
  fn: function(mu, sigma, isStructural, conditionedValue) {
    mu = mu || 0;
    sigma = sigma || 1;
	  return gaussian(mu, sigma, isStructural, conditionedValue);
  }
});

var wrapped_gamma = $b({
  name: 'wrapped_gamma',
  desc: 'Sample from the gamma distribution G(a,b)',
  numArgs: [2,4],
  params: [{name: "a", type: "real", desc: ""},
           {name: "b", type: "real", desc: ""}],
  fn: function(a, b, isStructural, conditionedValue) {
	  return gamma(a, b, isStructural, conditionedValue);
  }
});

var wrapped_beta = $b({
  name: 'wrapped_beta',
  desc: 'Sample from the beta distribution B(a,b). Returns only the first element.',
  numArgs: [2,4],
  params: [{name: "a", type: "positive real", desc: ""},
           {name: "b", type: "positive real", desc: ""}],
  fn: function(a, b, isStructural, conditionedValue) {
    if (a <= 0) {
      throw new Error('The a argument to beta must be greater than 0');
    }
    if (b <= 0) {
      throw new Error('The b argument to beta must be greater than 0');
    }
	  return beta(a, b, isStructural, conditionedValue);

  }
});

var wrapped_dirichlet = $b({
  name: 'wrapped_dirichlet',
  desc: 'Sample from the Dirichlet distribution Dir(alpha).',
  numArgs: [1,3],
  params: [{name: "alpha", type: "list<positive real>", desc: ""}],
  fn: function(alpha, isStructural, conditionedValue) {
	  alpha = listToArray(alpha);
	  return arrayToList(dirichlet(alpha, isStructural, conditionedValue));

  }
});

var DPmem = $b({
  name: 'DPmem',
  desc: 'Stochastic memoization using the Dirichlet Process',
  params: [{name: 'alpha', type: 'real', desc: 'Concentration parameter of the DP'},
           {name: 'f', type: 'function', desc: 'Function to stochastically memoize'}
          ],
  fn: function(alpha, f) {
    var restaurants = {};
    return function() {
      var args = args_to_array(arguments);
      var restaurantId = JSON.stringify(args);

      var tables = restaurants[restaurantId];
      var numTables;

      if (tables === undefined) {
        numTables = 0;
        tables = restaurants[restaurantId] = [];
      } else {
        numTables = tables.length;
      }

      var value;

      // no tables yet or we sample a new one
      if (numTables == 0 || wrapped_flip(alpha / (numTables + alpha))) {
        value = f.apply(null, arguments);
        // store both the count and the un-serialized value
        // (so we don't have to run JSON.parse if we later reuse it)
        //tables[JSON.stringify(value)] = {count: 1, value: value};
        tables.push({value: value, count: 1});
      }
      //  reuse existing table
      else {

        // construct a multinomial over current tables
        var indices = [];
        for(var i = 0; i < numTables; i++ ) {
          indices.push(i);
        }
        
        var counts = tables.map(function(table) { return table.count });

        var sampledIndex = wrapped_multinomial(arrayToList(indices, true),
                                               arrayToList(counts, true));

        
        value = tables[sampledIndex].value;
        tables[sampledIndex].count++;
      } 
      return value; 
      
    }
  }
})

// TODO: try to provide better error handling if
// numsamps / lag is not provided. might have to fix this
// inside js_astify
var wrapped_mh_query = $b({
  name: 'wrapped_mh_query',
  desc: '',
  params: [{name: 'comp'},
           {name: 'samples', type: 'nat'},
           {name: 'lag', type: 'nat'}
          ],
  fn: function(comp, samples, lag) {
	  var inn = traceMH(comp, samples, lag, false, "lessdumb").map(function(x) {return x.sample});
	  var res = arrayToList(inn);
	  return res;

  }
});

var wrapped_rejection_query = $b({
  name: 'wrapped_rejection_query',
  desc: '',
  params: [{name: 'comp'}],
  fn: function(comp) {
    return rejectionSample(comp);
  }
});

var wrapped_enumeration_query = $b({
  name: 'wrapped_enumeration_query',
  desc: '',
  params: [{name: 'comp'}],
  fn: function(comp) {
	  var d = enumerateDist(comp);
	  var p=[],v=[];
	  var norm = 0;
	  for (var x in d) {
		  p.push(d[x].prob);
		  v.push(d[x].val);
		  norm += d[x].prob;
	  }
	  var res = List(arrayToList(v, true),
                   arrayToList(p.map(function(x){return x/norm}), true));
	  return res;

  }
});

var evaluate;

var wrapped_eval = $b({
  name: 'wrapped_eval',
  desc: '', 
  params: [{name: "code", type: "", desc: ""}],
  fn: function(code) {
    // it used to be the case that evaluate was just a global
    // but this changed some time after 51a6cd6a82
    if (evaluate === undefined) {
      evaluate = require('./evaluate').evaluate;
    }
    
    // turn the code list back into a string before calling the webchurch evaluate
    code = util.format_result(code);
    return evaluate(code);
  }
});

var read_file = $b({
  name: 'read_file',
  desc: '',
  params: [{name: "fileName", type: "string", desc: ""}],
  fn: function(fileName) {
	  return fs.readFileSync(fileName, "utf8");

  }
});

var read_csv = $b({
  name: 'read_csv',
  desc: '',
  params: [{name: "fileName", type: "string", desc: ""},
           {name: "[sep]", type: "string", desc: ""}],
  fn: function(fileName, sep) {
	  // TODO: rewrite as FSM instead of simple splits
    // (or just use external library?)
	  sep = sep || ",";
	  var data = fs.readFileSync(fileName, "utf8")
          .split("\n")
          .map(function(x) {x=x.split(sep);return arrayToList(x,true);});
	  return arrayToList(data, true);

  }
});

var display = $b({
  name: 'display',
  alias: 'pn',
  desc: '',
  params: [{name: "[s ...]", type: "", desc: ""}],
  fn: function() {
    var args = args_to_array(arguments);
    var strs = args.map(util.format_result); 
    if (inBrowser) {
      sideEffects.push({
        type: 'string',
        data: strs.join(" ")
      }); 
    } else {
      console.log(strs.join(" "));
    }

  }
});

var bootstrap = $b({
  name: 'bootstrap',
  desc: '',
  params: [{name: "fn", type: "function", desc: ""},
           {name: "fileName", type: "string", desc: ""},
           {name: "n", type: "nat", desc: ""}],
  fn: function(fn, fileName, n) {
	  var data = read_csv(fileName);
	  var results = [null];
	  for (var i=0;i<n;i++) {
		  var sampled_data = [null];
		  for (var j=0;j<data.length-1;j++) {
			  sampled_data.unshift(data[Math.floor(Math.random()*(data.length-1))]);
		  }
		  results.unshift(fn(sampled_data));
	  }
	  return results;

  }
});

var string_append = $b({
  name: 'string_append',
  desc: 'Append an arbitrary number of strings',
  params: [
    {name: '[s ...]', type: 'string'}
  ], 
  fn: function() {
    var args = args_to_array(arguments);
    return args.join(""); 

  }
});

// TODO: document the fact that there is no symbol type
var symbol_to_string = $b({
  name: 'symbol_to_string',
  desc: '',
  params: [{name: "sym", type: "string", desc: ""}],
  fn: function(sym) {
    return sym; 
  }
});

var iota = $b({
  name: 'iota',
  desc: 'Create list based on arithmetic progressions',
  params: [
    {name: 'count', type: 'nat', desc: 'Number of items'},
    {name: '[start]', type: 'real', desc: 'First item in list', default: 0},
    {name: '[step]', type: 'real', desc: 'Difference between successive items in the list', default: 1}
  ], 
  fn: function(count, start, step) {
    if (start === undefined) { start = 0; }
    if (step === undefined) { step = 1; } 
    
    var r = [];
    for(var k = start, i = 0;
        i < count;
        i++, k += step) {
      r.push(k);
    }
    return arrayToList(r);

  }
});

var update_list = $b({
  name: 'update_list',
  desc: '',
  params: [{name: "lst", type: "list", desc: ""},
           {name: "n", type: "nat", desc: ""},
           {name: "value", type: "", desc: ""}],
  fn: function(lst, n, value) {

    var array = listToArray(lst);     
    if (array.length < n) {
	    throw new Error("list index too big: asked for item #" + (n+1) + " but list only contains " + n + " items");
	  }

    array[n] = value;

    return arrayToList(array);
  }
});

var get_time = $b({
  name: 'get_time',
  desc: '', 
  params: [],
  fn: function() {
    return Date.now();
  }
});

var make_gensym = $b({
  name: 'make_gensym',
  params: [{name: '[prefix]', default: 'n/a', type: 'string'}],
  fn: function(prefix) {
    prefix = prefix || "g";
    var closure = (function() {
      var counter = 0;
      return function() {
        return prefix + (counter++);
      };
    })();
    return closure;
  } 
});

// gensymCount is set in evaluate() inside evaluate.js
var gensym = $b({
  name: 'gensym',
  desc: 'Generate a fresh symbol guaranteed not to be equal to anything else',
  params: [],
  fn: function() {
    return "g" + (gensymCount++);
  }
})

// var dict = $x.dict = function() {
//   return {};
// }

// var update_dict = $x.update_dict = function(d, key, val) {
//   // copy version
//   var dict = _(d).clone();
//   dict[key] = val;
//   return dict;
// }

// var dict_to_list = $x.dict_to_list = function(d) {
//   var keys = Object.keys(d);
//   var arr = keys.map(function(k) {
//     return arrayToList( [k, d[k]] );
//   });
//   return arrayToList(arr);
// };

// var dict_lookup = $x.dict_lookup = function(d,k) {
//   var keys = Object.keys(d);
//   k = k + "";
  
//   if ( keys.indexOf(k) > -1) {
//     var entry = [k, d[k]];
//     return arrayToList(entry);
//   } else {
//     return false;
//   }
// };

// TODO: move the asserts stuff into its own library
// it depends on two utility functions, though:
// _rest and listToArray
// maybe basic types stuff should live in a module
// separate from builtins and separate from asserts
var typeCheckers = {
  nat: function(x) {
    return typeof x == 'number' && Math.floor(x) == x && x >= 0;
  },
  'positive real': function(x) {
    return typeof x == 'number' && x > 0;
  },
  real: function(x) {
    return typeof x == 'number';
  },
  function: function(x) {
    return typeof x == 'function';
  },
  pair: function(x) {
    return Array.isArray(x) && x.length >= 2;
  },
  list: function(x) {
    return Array.isArray(x) && x[x.length - 1] == null;
  },
  'boolean': function(x) {
    return typeof x == 'boolean';
  },
  'string': function(x) {
    return typeof x == 'string';
  }
};

// handle simple parameterized types like
// List real, Pair real
// TODO: test this
function parseTypeString(s) {
  if (/list|pair/.test(s)) {
    var baseType = /list/.test(s) ? 'list' : 'pair';
    
    var uStart = s.indexOf("<");
    var uEnd = s.lastIndexOf(">");

    var baseChecker = typeCheckers[baseType];
    
    if (uStart == -1 || uEnd == -1) {
      return baseChecker; 
    }
    
    var u = s.slice(uStart + 1, uEnd);
    var uChecker = parseTypeString(u);

    if (baseType == 'pair') {
      return function(x) {
        if (!baseChecker(x)) {
          return false;
        } 

        return uChecker(x[0]) && uChecker(_rest(x));
      };

    }
    
    // otherwise, return checker for list<...>
    return function(x) {
      if (!baseChecker(x)) {
        return false;
      }
      var x_array = listToArray(x);
      for(var i = 0, ii = x_array.length; i < ii; i++) {
        if (!uChecker(x_array[i])) {
          return false;
        };
      }
      return true; 
    };
    
    
  } else {
    return typeCheckers[s];
  }
}

var sample = $b({
  name: 'sample',
  desc: 'apply a thunk',
  params: [{name: 'thunk', type: 'function'}],
  fn: function(thunk) {
    return thunk();
  }
})

// var c = parseTypeString('pair<pair<real>>');
// console.log(c(Pair(Pair(0.1, 'a'),
//                    Pair(0.3, 0.4)
//                   )));

// console.log( c( List(1,2,'a') ) )

// probability distribution is list<pair<_,positive real>>

// TODO: add a flag somewhere for turning on/off wrapping
function wrapAsserts(annotation) {

  var fnName = annotation.name;
  var fn = annotation.fn;
  var paramProps = annotation.params || [];

  var validArgumentLengths = annotation.numArgs;
  
  var numParams = paramProps.length;
  
  // compute number of mandatory arguments
  var numMandatoryParams = paramProps.filter(function(prop) {
    return !prop.name.match(/\[/);
  }).length;

  var wrapped = function() {    
    // var userArgs = Array.prototype.slice.call(arguments, 0);
    var userArgs = arguments;
    
    var userNumArgs = userArgs.length;
    // console.log( 'inside wrapped ' + functionName);
    
    if (userNumArgs < numMandatoryParams) {
      var err = _.template('<<functionName>> takes {{numArgs}} argument{{plural}}, but {{userNumArgs}} were given',
                           {userNumArgs: userNumArgs == 0 ? 'none' : 'only ' + userNumArgs,
                            numArgs: ((numParams == numMandatoryParams) ? '' : '(at least) ') + numMandatoryParams,
                            plural: numMandatoryParams == 1 ? '' : 's'
                           }
                          );
      throw new Error(err);
    }

    // make sure that the number of arguments that the
    // user supplied is a valid number of arguments
    // to this function 
    if (validArgumentLengths) {
      if (validArgumentLengths.indexOf(userNumArgs) == -1) {
        throw new Error('Invalid number of arguments to <<functionName>>');
      }
    }

    // for each supplied argument, check type
    for(var i = 0, a, props, variadic = false, specType, argName; i < userNumArgs; i++) {
      
      a = userArgs[i];
      if (!variadic) {
        props = paramProps[i];
        specType = props.type;
      }      
      argName = props.name;
      if (argName.match(/\.\.\./)) {
        variadic = true;
      } 
      
      if (specType) {
        // run the appropriate type checker on the argument
        var checker = parseTypeString(specType); // typeCheckers[specType];

        if (checker === undefined) {
          var errorString = _.template(
            'Bug in Church builtins - annotation for (<<functionName>> ...) tries to declare the type of the "{{argName}}" argument as "{{specType}}", which is not a recognized type',
            { specType: specType,
              argName: argName
            } 
          );
          throw new Error(errorString);
        }
        
        var typeChecks = checker(a);
        
        if (!typeChecks) {
          var errorString = _.template(
            // <<functionName>> will get filled in inside evaluate.js
            '{{argName}} to (<<functionName>> ...) should be a {{specType}}, not a {{userType}}',
            {
              userType: typeof a,
              specType: specType,
              argName: variadic ? 'Argument' : 'The ' + argName + ' argument'
            }
          );

          throw new Error(errorString);
        }
      } 
    }
    return fn.apply(null, userArgs);
  };

  return wrapped;
  // return fn;

}
