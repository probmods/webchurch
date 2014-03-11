/* global global, require, module */

// This library contains the built-in Church functions written in Javascript.
// We declare builtins using the syntax
//    var [name] = $x.[name] = function(...) {
// here, $x is a pointer to module.exports
// The reason that we immediately add the function to the exports
// is to avoid having to maintain a big list of exports at the end of the file
// (e.g., module.exports = {a: a, b:b, ...})
// Declaring the function as both a global and a member of $x makes writing
// recursive builtins easier

// OPTIMIZE: args_to_array calls inside calls to assert functions

var util = require('./util.js');
var fs = require('fs');
var assert = require('./assert.js');

// at the end of this file module.exports = $x 
var $x = {};

var the_empty_list = [];
$x.the_empty_list = the_empty_list;

function sizeof(obj) { return Object.keys(obj).length; }

var args_to_array = $x.args_to_array = function(args) {
  return Array.prototype.slice.call(args, 0 );
};

var args_to_list = $x.args_to_list = function list(args) {
  return arrayToList(args_to_array(args));
};

var plus = $x.plus = function() {
	var args = args_to_array(arguments);
	var sum = 0;
	for (var i = 0; i < args.length; i++) {
		assert.ArgType(args[i], "number", "+");
		sum = sum + args[i];
	}
	return sum;
};

var minus = $x.minus = function() {
	var args = args_to_array(arguments);
	assert.AtLeastNumArgs(args, 1);
	assert.ArgType(args[0], "number", "-");
	if (args.length == (1)) {
		return -args[0];
	} else {
		return args[0] - plus.apply(null, args.slice(1));
	}
};

var mult = $x.mult = function() {
	var args = args_to_array(arguments);
	var prod = 1;
	for (var i = 0; i < args.length; i++) {
		assert.ArgType(args[i], "number", "*");
		prod = prod * args[i];
	}
	return prod;
};

var div = $x.div = function() {
	var args = args_to_array(arguments);
	assert.AtLeastNumArgs(args, 1);
	assert.ArgType(args[0], "number", "/");
	if (args.length == (1)) {
		return 1 / args[0];
	} else {
		return args[0] / mult.apply(null, args.slice(1)); //FIXME: going to give wrong argTo for divisors...
	}
};

var sum = $x.sum = function(list) {
	assert.NumArgs(args_to_array(arguments), 1, "sum");
  assert.ArgType(list, "list", "sum");
	return plus.apply(null, listToArray(list, true));
};

// check whether xhat \in (x - tol, x + tol)
var soft_equal = $x.soft_equal = function(xhat, x, tol) {
	//assert.NumArgs(args_to_array(arguments), 3, "soft-equal");
  // FIXME: //assert upper > lower
  return (xhat > x - tol && x < x + tol);
};

var and = $x.and = function() {
	var args = args_to_array(arguments);
	for (var i = 0; i < args.length; i++) {
    //FIXME: should check that types are boolean, or accept any truthy types?
		if (!args[i]) {
			return false;
		}
	}
	return true;
};

var or = $x.or = function() {
	var args = args_to_array(arguments);
	for (var i = 0; i < args.length; i++) {
		if (args[i]) {
			return args[i];
		}
	}
	return false;
};

var not = $x.not = function(x) {
	assert.NumArgs(args_to_array(arguments), 1, "not");
	return !x;
};

var all = $x.all = function(list) {
	assert.NumArgs(args_to_array(arguments), 1, "all");
  assert.ArgType(list, "list", "all");
	return and.apply(null, listToArray(list, true));
};

var none = $x.none = function(list) {
	assert.NumArgs(args_to_array(arguments), 1, "all");
  assert.ArgType(list, "list", "all");
	return !or.apply(null, listToArray(list, true));
}; 

function cmp_nums(cmp_fn, args) {
	assert.AtLeastNumArgs(args, 2);
	for (var i = 0; i < args.length - 1; i++) {
		assert.ArgType(args[i], "number", "comparison");
		if (!cmp_fn(args[i], args[i+1])) return false; 
	}
	return true;
};

var greater = $x.greater = function() {
	return cmp_nums(function(x, y) {return x > y;}, args_to_array(arguments));
};

var less = $x.less = function() {
	return cmp_nums(function(x, y) {return x < y;}, args_to_array(arguments));
};

var geq = $x.geq = function() {
	return cmp_nums(function(x, y) {return x >= y;}, args_to_array(arguments));
};

var leq = $x.leq = function() {
	return cmp_nums(function(x, y) {return x <= y;}, args_to_array(arguments));
};

var eq = $x.eq = function() {
	return cmp_nums(function(x, y) {return x == y;}, args_to_array(arguments));
};

var is_null = $x.is_null = function(x) {
	assert.NumArgs(args_to_array(arguments), 1, "null?");
	return Array.isArray(x) && x[0] == null;
};

var list = $x.list = function() {
	var args = args_to_array(arguments);
	return arrayToList(args);
};

var is_list = $x.is_list = function(x) {
	assert.NumArgs(args_to_array(arguments), 1, "list?");
	return x[x.length-1] == null;
};

var pair = $x.pair = function(a, b) {
	assert.NumArgs(args_to_array(arguments), 2, "pair");
	return [a].concat(b);
};
$x.cons = pair;

var is_pair = function(x) {
	assert.NumArgs(args_to_array(arguments), 1, "pair?");
	return Array.isArray(x);
};

var first = $x.first = function(x) {
	assert.NumArgs(args_to_array(arguments), 1, "first");
	if (!Array.isArray(x) || x.length < 2) {
		throw new Error(util.format_result(x) + " does not have required pair structure");
	} else {
		return x[0];
	}
};
$x.car = first;

var second = $x.second = function(x) {
	return first(rest.apply(null, arguments));
};

var third = $x.third = function(x) {
	assert.ArgType(x, "list", "third");
	return first(rest(rest(x)));
};

var fourth = $x.fourth = function(x) {
	assert.ArgType(x, "list", "fourth");
	return first(rest(rest(rest(x))));
};

var fifth = $x.fifth = function(x) {
	assert.ArgType(x, "list", "fifth");
	return first(rest(rest(rest(rest(x)))));
};

var sixth = $x.sixth = function(x) {
	assert.ArgType(x, "list", "sixth");
	return first(rest(rest(rest(rest(rest(x))))));
};

var seventh = $x.seventh = function(x) {
	assert.ArgType(x, "list", "seventh");
	return first(rest(rest(rest(rest(rest(rest(x)))))));
};

var list_ref = $x.list_ref = function(lst, n) {
	assert.ArgType(lst, "list", "list lookup");
	assert.ArgType(n, "number", "list lookup");
	if (n < 0) {
		throw new Error("Can't have negative list index");
	}
	var array = listToArray(lst);
	if (array.length < n) {
	    throw new Error("list index too big: asked for item #" + (n+1) + " but list only contains " + n + " items");
	} else {
		return array[n];
	}
};

var list_elt = $x.list_elt = function(lst, n) {
  return list_ref(lst, n - 1);  
};

var take = $x.take = function(lst,n) {
  return arrayToList(listToArray(lst).slice(0,n));
};

var drop = $x.drop = function(lst,n) {
  return arrayToList(listToArray(lst).slice(n));
}

var max = $x.max = function(x) {
	var args = args_to_array(arguments);
	return Math.max.apply(Math, args);
};

var min = $x.min = function(x) {
	var args = args_to_array(arguments);
	return Math.min.apply(Math, args);
};

var expt = $x.expt = function(a, b) {
	return Math.pow(a, b);
};

var mean = $x.mean = function(lst) {
  assert.ArgType(lst,"list","mean");
	var vals = listToArray(lst),
      sum = 0,
      n = vals.length;
  
	for (var i=0; i < n; i++) {
    sum += vals[i];
  }
	return sum / n;
};

var append = $x.append = function() {
	var args = args_to_array(arguments);
	return arrayToList([].concat.apply([], args.map(function(x) {
		assert.ArgType(x,"list","append");
		return listToArray(x);
	})));
};

var flatten = $x.flatten = function(x) {
	assert.ArgType(x,"list","flatten");
	var flattened = [];
	var arr = listToArray(x);
	for (var i=0; i<arr.length; i++) {
		var elem = arr[i];
		if (is_list(elem)) {
			flattened = flattened.concat((listToArray(flatten(elem))));
		} else {
			flattened.push(elem);
		}
	}
	return arrayToList(flattened);
};

var fold = $x.fold = function(fn, initialValue, list) {
	var args = args_to_array(arguments);
	fn = args[0];
	assert.ArgType(fn, "function", "fold");
	initialValue = args[1];
	var lists = args.slice(2);
	var arrs = [];
	for (var i=0; i<lists.length; i++) {
		assert.ArgType(lists[i], "list");
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
};

var repeat = $x.repeat = function(n,fn) {
	assert.ArgType(fn, "function", "repeat");
	assert.ArgType(n, "number", "repeat");
	var lst = [];
	for(var i=0;i<n;i++) {
		lst.push(fn());
	}
	lst.push(null);
	return lst;
};

var for_each = $x.for_each = function(fn,lst) {
  assert.ArgType(fn, "function", "for-each");
  assert.ArgType(lst, "list", "for-each");

  var arr = listToArray(lst);
  arr.forEach(function(x, i, lst) { fn(x) }); 
  return;
}; 

var map = $x.map = function() {
  var args = args_to_array(arguments),
      fn = args[0];
  
  assert.ArgType(fn, "function", "map");
  
  var lists = args.slice(1),
      arr = [],
      numLists = lists.length; 

  var arrays = lists.map(function(L) { return listToArray(L) });
  // ^ have to write it verbosely because otherwise, map will pass in extra arguments
  // namely the current index and the entire array. the index element will
  // get used as the recursive flag to the listToArray function
  // this causes nested maps to have the wrong behavior
  
  var n = Math.min.apply(this, arrays.map(function(a) { return a.length}));

  for(var i=0;i<n;i++) {
		arr[i] = fn.apply(this, arrays.map(function(L) { return L[i]}));
	}

	return arrayToList(arr);
};

var filter = $x.filter = function(pred, list) {
  assert.ArgType(pred, "function", "filter");
  assert.ArgType(list, "list", "filter");

  var arr = listToArray(list).filter(pred);
  arr.push(null);
  return arr;
}

var reverse = $x.reverse = function(list) {
	assert.ArgType(list, "list", "reverse");
	var arr = listToArray(list).reverse();
	arr.push(null);
	return arr;
}

var rest = $x.rest = function(x) {
	assert.NumArgs(args_to_array(arguments), 1, "rest");
	if (!Array.isArray(x) || x.length < 2) {
		throw new Error(util.format_result(x) + " does not have required pair structure");
	} else {
		if (x.length == 2 && x[1] != null) {
			return x[1];
		} else {
			return x.slice(1);
		}
	}
}; 
$x.cdr = rest;

var length = $x.length = function(lst) {
	assert.NumArgs(args_to_array(arguments), 1, "length");
	assert.ArgType(lst, "list", "length");
  return listToArray(lst).length;
};

// predefine the length, decently quick and
// not so complicated as recursive merge
// http://jsperf.com/best-init-array/3
var make_list = $x.make_list = function(n, x) {
	assert.NumArgs(args_to_array(arguments), 2, "make-list");
	assert.ArgType(n, "integer", "make-list");
	if (n == 0) return the_empty_list;
	var results = new Array(n);

	for (var i = 0; i < n; i += 1) {
		results[i] = x;
	}
	return arrayToList(results);
};

var is_eq = $x.is_eq = function(x, y) {
	assert.NumArgs(args_to_array(arguments), 2, "eq?");
	return x === y;
};

var is_equal = $x.is_equal = function(x, y) {
	assert.NumArgs(args_to_array(arguments), 2, "equal?");
	if (typeof(x) == typeof(y)) {
		if (Array.isArray(x)) {
			if (x.length == y.length) {
        for(var i = 0, ii = x.length; i < ii; i++) {
          if (!is_equal(x[i], y[i])) {
            return false;
          }
        };
        return true;
        
				// return is_equal(x[0], y[0]) && is_equal(x[1], y[1]);
			} else {
				return false;
			}
		} else {
			return x == y;
		}
	} else {
		return false;
	}
};

var member_base = $x.member_base = function(x, list, eq_fn) {
	assert.ArgType(list,"list","member");
  var array = listToArray(list);
  
	for (var i = 0, ii = array.length; i < ii; i++) {
		if (eq_fn(x, array[i])) {
			return list;
		}
	}
	return false;
};

var member = $x.member = function(x, list) {
	assert.NumArgs(args_to_array(arguments), 2, "member");
	return member_base(x, list, is_equal);
};

var apply = $x.apply = function(fn, list) {
	assert.ArgType(fn,"function","apply");
	assert.ArgType(list,"list","apply");
	return fn.apply(null, listToArray(list, false));
};

var assoc = $x.assoc = function(obj, alist) {
	assert.ArgType(alist, "list", assoc);
	alist = listToArray(alist);
	for (var i=0; i<alist.length; i++) {
		assert.ArgType(alist[i], "pair", assoc);
		if (is_equal(alist[i][0], obj)) {
			return alist[i];
		}
	}
	return false;
};

var regexp_split = $x.regexp_split = function(str, regex) {
	assert.ArgType(str,"string","regexp_split");
	assert.ArgType(regex,"string","regexp_split");
	return arrayToList(str.split(regex));
};

var string_to_number = $x.string_to_number = function(str) {
	assert.ArgType(str,"string","string_to_number");
	return parseFloat(str) || false;
};

var number_to_string = $x.number_to_string = function(num) {
	assert.ArgType(num,"number","number_to_string");
	return num.toString();
};

var wrapped_uniform_draw = $x.wrapped_uniform_draw = function(items, isStructural, conditionedValue) {
	assert.ArgType(items,"list","uniform-draw");
  var u = uniformDraw(listToArray(items, false), isStructural, conditionedValue);
	return u; //uniformDraw(listToArray(items, false), isStructural, conditionedValue);
};

var wrapped_multinomial = $x.wrapped_multinomial = function(items, probs, isStructural, conditionedValue) {
	assert.ArgType(items,"list","multinomial");
	assert.ArgType(probs,"list","multinomial");
	if (items.length != probs.length) {
		throw new Error("Lists of items and probabilities must be of equal length");
	}
	return multinomialDraw(listToArray(items, false), listToArray(probs), isStructural, conditionedValue);
};

var wrapped_flip = $x.wrapped_flip = function(p, isStructural, conditionedValue) {
	return flip(p, isStructural, conditionedValue) == 1;
};

var wrapped_uniform = $x.wrapped_uniform = function(a, b, isStructural, conditionedValue) {
	assert.NumArgsMulti(args_to_array(arguments), [2, 4], "uniform");
	assert.ArgType(a, "number", "uniform");
	assert.ArgType(b, "number", "uniform");
	return uniform(a, b, isStructural, conditionedValue);
};

var wrapped_random_integer = $x.wrapped_random_integer = function(n,isStructural, conditionedValue) {
	assert.NumArgsMulti(args_to_array(arguments), [1,3], "random-integer");
	assert.ArgType(n, "number", "random integer");
  var probs = [], p = 1/n
	for (var i = 0; i < n; i++){probs[i] = p}
  return multinomial(probs,isStructural, conditionedValue)
};

var wrapped_gaussian = $x.wrapped_gaussian = function(mu, sigma, isStructural, conditionedValue) {
	assert.NumArgsMulti(args_to_array(arguments), [2, 4],"gaussian");
	assert.ArgType(mu, "number", "gaussian");
	assert.ArgType(sigma, "number", "gaussian");
	return gaussian(mu, sigma, isStructural, conditionedValue);
};

var wrapped_gamma = $x.wrapped_gamma = function(a, b, isStructural, conditionedValue) {
	assert.NumArgsMulti(args_to_array(arguments), [2, 4],"gamma");
	assert.ArgType(a, "number", "gamma");
	assert.ArgType(b, "number", "gamma");
	return gamma(a, b, isStructural, conditionedValue);
};

var wrapped_beta = $x.wrapped_beta = function(a, b, isStructural, conditionedValue) {
	assert.NumArgsMulti(args_to_array(arguments), [2, 4],"beta");
	assert.ArgType(a, "number", "beta");
	assert.ArgType(b, "number", "beta");
	return beta(a, b, isStructural, conditionedValue);
};

var wrapped_dirichlet = $x.wrapped_dirichlet = function(alpha, isStructural, conditionedValue) {
	assert.NumArgsMulti(args_to_array(arguments), [1,3],"dirichlet");
	assert.ArgType(alpha, "list", "dirichlet");
	assert.AllType(alpha, "number", "dirichlet");
	alpha = listToArray(alpha, true);
	return arrayToList(dirichlet(alpha, isStructural, conditionedValue));
};

var wrapped_traceMH = $x.wrapped_traceMH = function(comp, samples, lag) {
	var inn = traceMH(comp, samples, lag, false, "lessdumb").map(function(x) {return x.sample});
	var res = arrayToList(inn);
	return res;
};

var wrapped_enumerate = $x.wrapped_enumerate = function(comp) {
	var d = enumerateDist(comp);
	var p=[],v=[];
	var norm = 0;
	for (var x in d) {
		p.push(d[x].prob);
		v.push(d[x].val);
		norm += d[x].prob;
	}
	var res = list(arrayToList(v), arrayToList(p.map(function(x){return x/norm})));
	return res;
};

var wrapped_evaluate = $x.wrapped_evaluate = function(code) {
  //need to turn the code list back into a string before calling the webchurch evaluate...
  code = util.format_result(code);
  return evaluate(code);
};

var read_file = $x.read_file = function(fileName) {
	assert.ArgType(fileName, "string", "read-file");
	return fs.readFileSync(fileName, "utf8");
};

var read_csv = $x.read_csv = function(fileName, sep) {
	// TODO: rewrite as FSM instead of simple splits
	assert.ArgType(fileName, "string", "read-csv");
	sep = sep || ",";
	assert.ArgType(sep, "string", "read-csv");
	var data = fs.readFileSync(fileName, "utf8").split(
		"\n").map(function(x) {x=x.split(sep);return arrayToList(x,true);})
	return arrayToList(data, true);
}

var display = $x.display = function(str) {
  var args = args_to_array(arguments);
  var strs = args.map(util.format_result);
  console.log(strs.join(" "));
};
$x.pn = display;

var bootstrap = $x.bootstrap = function(fn, fileName, n) {
	assert.ArgType(fn, "function", "bootstrap");
	assert.ArgType(fileName, "string", "bootstrap");
	assert.ArgType(n, "integer", "bootstrap");
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

var listToArray = $x.listToArray = function(list, recurse) {
	if (recurse) {
		return list.slice(0, -1).map(function (x) {return Array.isArray(x) ? listToArray(x) : x});
	} else {
		return list.slice(0, -1);
	}
};

var arrayToList = $x.arrayToList = function(arr, mutate) {
	if (mutate) {
		arr.push(null);	
	} else {
		arr = arr.concat(null);
	}
	return arr;
};

var string_append = $x.string_append = function() {
  var args = args_to_array(arguments);
  return args.join(""); 
};

var symbol_to_string = $x.symbol_to_string = function(sym) {
  return sym;
};

var iota = $x.iota = function(count, start, step) {
  if (typeof start == 'undefined') {
    start = 0;
  }
  if (typeof step == 'undefined') {
    step = 1;
  } 
  
  var r = [];
  for(var k = start, i = 0;
      i < count;
      i++, k += step) {
    r.push(k);
  }
  return arrayToList(r);
};

module.exports = $x;
