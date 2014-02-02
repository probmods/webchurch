/* global require, module */

// Asserts for checking arguments to functions.
// informal testing with this model:
//
// (define samps
//  (mh-query
//   50000 2
//   (define theta (beta 1 1))
//   (define flips (repeat 5 (lambda () (if (flip theta) 1 0))))
//   (apply + flips)
//   (= (first flips) 1)))
// (mean samps)
//
// indicates that commenting out asserts in church_builtins.js
// shaves speed by 10% (~1.8 seconds -> ~1.55 seconds)
// strangely, replacing all the assert functions with no-op
// appears to INCREASE time

var format_result = require('./util.js').format_result;

var $x = {};

var is_pair = function(x) {
  return x.length == 2;
};

var is_list = function(x) {
  while (true) {
	  if (!Array.isArray(x)) {
      return false;
    }
	  if (x.length == 0) {
		  return true;
	  } else {
		  x = x[1];
	  }
  }
};

var NumArgs = $x.NumArgs = function(args, n, argTo) {
	if (args.length != n) {
		throw new Error("Wrong number of arguments to "+ argTo +", expected " + n + ", got " + args.length);
	}
};

var NumArgsMulti = $x.NumArgsMulti = function(args, choices, argTo) {
	if (choices.indexOf(args.length) < 0) {
		throw new Error("Wrong number of arguments to "+ argTo +", expected " + choices.join(" or ") + ", got " + args.length +": "+args);
	}
};

var AtLeastNumArgs = $x.AtLeastNumArgs = function(args, n) {
	if (args.length < n) {
		throw new Error("Too few arguments, expected at least " + n + ", got " + args.length);
	}
};

var ArgType = $x.ArgType = function(x, type, argTo) {
  argTo = (argTo == 'undefined')? '"' : '" to ' + argTo;
  switch(type) {
  case "function":
    if (typeof(x) != 'function') {
      //doesn't say "is not a function" to avoid special purpose code in evaluate.js
      throw new Error('argument "' + format_result(x) + argTo  + ' not a function');}
    break;
    
  case "integer":
    if (typeof(x) != "number" && parseInt(x) != x) {
      throw new Error('"' + format_result(x) + argTo + '" is not an integer');
    }
    break;
    
  case "number":
    if (typeof(x) != 'number') {
      throw new Error('argument "' + format_result(x) + argTo  + ' is not a number');}
    break;
    
  case "list":
    if (!is_list(x)) {
      throw new Error('argument "' + format_result(x) + argTo  + ' is not a list');}
    break;

  case "pair":
    if (x.length != 2) {
      throw new Error('argument "' + format_result(x) + argTo  + ' is not a pair');}
    break;
    
  default:
    if (typeof(x) != type) {
      throw new Error('argument "' + format_result(x) + argTo  + ' has incorrect type');}
  }
};

var AllType = $x.AllType = function(list, type, argTo) {
	if (list.length != 0) {
		ArgType(list[0], type, argTo);
		AllType(list[1], type, argTo);
	}
};

module.exports = $x;
