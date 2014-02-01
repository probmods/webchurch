var util = require('./util.js');
var fs = require('fs');

var the_empty_list = [];

function sizeof(obj) { return Object.keys(obj).length; }

function args_to_array(args) { return Array.prototype.slice.call(args, 0 ); }

function args_to_list(args) { return arrayToList(args_to_array(args)); }


//function plus(x,y){return x+y}
//function minus(x,y){return x-y}
//function mult(x,y){return x*y}
//function div(x,y){return x/y}


function plus() {
	var args = args_to_array(arguments);
	var sum = 0;
	for (var i = 0; i < args.length; i++) {
		assertArgType(args[i], "number", "+");
		sum = sum + args[i];
	}
	return sum;
}

function minus() {
	var args = args_to_array(arguments);
	assertAtLeastNumArgs(args, 1);
	assertArgType(args[0], "number", "-");
	if (args.length == (1)) {
		return -args[0];
	} else {
		return args[0] - plus.apply(null, args.slice(1));
	}
}

function mult() {
	var args = args_to_array(arguments);
	var prod = 1;
	for (var i = 0; i < args.length; i++) {
		assertArgType(args[i], "number", "*");
		prod = prod * args[i];
	}
	return prod;
}

function div() {
	var args = args_to_array(arguments);
	assertAtLeastNumArgs(args, 1);
	assertArgType(args[0], "number", "/");
	if (args.length == (1)) {
		return 1 / args[0];
	} else {
		return args[0] / mult.apply(null, args.slice(1)); //FIXME: going to give wrong argTo for divisors...
	}
}

function sum(list) {
	assertNumArgs(args_to_array(arguments), 1, "sum");
    assertArgType(list, "list", "sum");
	return plus.apply(null, listToArray(list, true));
}



function and() {
	var args = args_to_array(arguments);
	for (var i = 0; i < args.length; i++) {
        //FIXME: should check that types are boolean, or accept any truthy types?
		if (!args[i]) {
			return false;
		}
	}
	return true
}

function all(list) {
	assertNumArgs(args_to_array(arguments), 1, "all");
    assertArgType(list, "list", "all");
	return and.apply(null, listToArray(list, true));
}

function or() {
	var args = args_to_array(arguments);
	for (var i = 0; i < args.length; i++) {
		if (args[i]) {
			return args[i];
		}
	}
	return false;
}

function not(x) {
	assertNumArgs(args_to_array(arguments), 1, "not");
	return !x;
}

function cmp_nums(cmp_fn, args) {
	assertAtLeastNumArgs(args, 2)
	for (var i = 0; i < args.length - 1; i++) {
		assertArgType(args[i], "number", "comparison");
		if (!cmp_fn(args[i], args[i+1])) return false; 
	}
	return true;
}


function greater() {
	return cmp_nums(function(x, y) {return x > y;}, args_to_array(arguments));
}

function less() {
	return cmp_nums(function(x, y) {return x < y;}, args_to_array(arguments));
}

function geq() {
	return cmp_nums(function(x, y) {return x >= y;}, args_to_array(arguments));
}

function leq() {
	return cmp_nums(function(x, y) {return x <= y;}, args_to_array(arguments));
}

function eq() {
	return cmp_nums(function(x, y) {return x == y;}, args_to_array(arguments));
}

function is_null(x) {
	assertNumArgs(args_to_array(arguments), 1, "null?")
	return x == the_empty_list || (Array.isArray(x) && x.length == 0);
}

function list() {
	var args = args_to_array(arguments);
	var result = the_empty_list;
	for (var i = args.length-1; i >= 0; i--) {
		result = [args[i], result];
	}
	return result;
}

function is_list(list) {
	assertNumArgs(args_to_array(arguments), 1, "list?");
  var lst = list;
  while (true) {
	  if (!Array.isArray(lst)) {
      return false;
    }
		if (lst.length == 0) {
			return true;
		} else {
			lst = lst[1];
		}
	}
}

function pair(a, b) {
	assertNumArgs(args_to_array(arguments), 2, "pair")
	return [a, b];
}

function is_pair(x) {
	assertNumArgs(args_to_array(arguments), 1, "pair?");
	return x.length == 2;
}

function first(x) {
	assertNumArgs(args_to_array(arguments), 1, "first");
	if (x.length != 2) {
		throw new Error(util.format_result(x) + " does not have required pair structure");
	} else {
		return x[0];
	}
}

function second(x) {
	return first(rest.apply(null, arguments));
}

function third(x) {
	assertArgType(x, "list", "third");
	return first(rest(rest(x)));
}

function fourth(x) {
	assertArgType(x, "list", "fourth");
	return first(rest(rest(rest(x))));
}

function fifth(x) {
	assertArgType(x, "list", "fifth");
	return first(rest(rest(rest(rest(x)))));
}

function sixth(x) {
	assertArgType(x, "list", "sixth");
	return first(rest(rest(rest(rest(rest(x))))));
}

function seventh(x) {
	assertArgType(x, "list", "seventh");
	return first(rest(rest(rest(rest(rest(rest(x)))))));
}

function list_ref(lst, n) {
  assertArgType(lst, "list", "list lookup");
  assertArgType(n, "number", "list lookup");
  if (n < 0) {
    throw new Error("Can't have negative list index");
  }
  
  var res = lst, error = false;
  for(var i = 0; i < n; i++) {
    if (res.length < 2) {
      error = true;
      break;
    }
    res = res[1];
  }
  if (res.length == 0) {
    throw new Error("list index too big: asked for item #" + (n+1) + " but list only contains " + i + " items");
  }

  return res[0]; 
}

function list_elt(lst, n) {
  return list_ref(lst, n - 1);  
}

function take(lst,n) {
    return arrayToList(listToArray(lst).slice(0,n))
}

function drop(lst,n) {
    return arrayToList(listToArray(lst).slice(n))
}


function max(x) {
	var args = args_to_array(arguments);
	return Math.max.apply(Math, args);
}

function min(x) {
	var args = args_to_array(arguments);
	return Math.min.apply(Math, args);
}

function expt(a, b) {
	return Math.pow(a, b);
}

function mean(lst) {
    assertArgType(lst,"list","mean");
	var vals = listToArray(lst),
      sum = 0,
      n = vals.length;
  
	for (var i=0; i < n; i++) {
    sum += vals[i];
  }
	return sum / n;
}

function append() {
	var args = args_to_array(arguments);
	return arrayToList([].concat.apply([], args.map(function(x) {
		assertArgType(x,"list","append");
		return listToArray(x);
	})));
}

function flatten(x) {
	assertArgType(x,"list","flatten");
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
}

function fold(fn, initialValue, list) {
	var args = args_to_array(arguments);
	var fn = args[0];
	assertArgType(fn, "function", "fold");
	var initialValue = args[1];
	var lists = args.slice(2);
	var arrs = [];
	for (var i=0; i<lists.length; i++) {
		assertArgType(lists[i], "list");
		arrs.push(listToArray(lists[i]));
	}
	var max_length = Math.min.apply(this, arrs.map(function(el) {return el.length;}));
	var cumulativeValue = initialValue;
	for (var i=0; i<max_length; i++) {
		var fn_args = arrs.map(function(el) {return el[i];});
		fn_args.push(cumulativeValue);
		cumulativeValue = fn.apply(this, fn_args);
	}
	return cumulativeValue;
}

function repeat(n,fn) {
    assertArgType(fn, "function", "repeat");
    assertArgType(n, "number", "repeat");
	var ret = [];
	for(var i=0;i<n;i++) {ret[i] = fn()}
	return arrayToList(ret);
}

function map() {
  var args = args_to_array(arguments),
      fn = args[0];
  
  assertArgType(fn, "function", "map");
    
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
}

//function sample(fn) {return fn()}

function rest(x) {
	assertNumArgs(args_to_array(arguments), 1, "rest");
	if (x.length != 2) {
		throw new Error("Argument does not have required pair structure");
	} else {
		return x[1];
	}
}

function length(x) {
	assertNumArgs(args_to_array(arguments), 1, "length");
    assertArgType(x, "list", "length")
	var len = 0;
	while (x.length != 0) {
		if (x.length != 2) {
			throw new Error("Argument is not a proper list");
		} else {
			x = x[1];
			len++;
		}
	}
	return len;
}

// predefine the length, decently quick and
// not so complicated as recursive merge
// http://jsperf.com/best-init-array/3
function make_list(n, x) {
	assertNumArgs(args_to_array(arguments), 2, "make-list");
	assertArgType(n, "integer", "make-list");
	if (n == 0) return the_empty_list;
	var results = new Array(n);

	for (var i = 0; i < n; i += 1) {
		results[i] = x;
	}
	return arrayToList(results);
}

function is_eq(x, y) {
	assertNumArgs(args_to_array(arguments), 2, "eq?");
	return typeof(x) == typeof(y) && x == y;
}

function is_equal(x, y) {
	assertNumArgs(args_to_array(arguments), 2, "equal?");
	if (typeof(x) == typeof(y)) {
		if (Array.isArray(x)) {
			if (x.length == y.length) {
				return is_equal(x[0], y[0]) && is_equal(x[1], y[1]);
			} else {
				return false;
			}
		} else {
			return x == y;
		}
	} else {
		return false
	}
}

function member_base(x, list, eq_fn) {
	assertArgType(list,"list","member");
	if (list.length == 0) {
		return false;
	} else if (eq_fn(x, list[0])) {
		return list;
	} else {
		return member_base(x, list[1], eq_fn);
	}
}

function member(x, list) {
	assertNumArgs(args_to_array(arguments), 2, "member");
	return member_base(x, list, is_equal);
}

function apply(fn, list) {
	assertArgType(fn,"function","apply");
	assertArgType(list,"list","apply");
	return fn.apply(null, listToArray(list, false));
}

function assoc(obj, alist) {
	assertArgType(alist, "list", assoc);
	alist = listToArray(alist);
	for (var i=0; i<alist.length; i++) {
		assertArgType(alist[i], "pair", assoc);
		if (is_equal(alist[i][0], obj)) {
			return alist[i];
		}
	}
	return false;
}

function regexp_split(str, regex) {
	assertArgType(str,"string","regexp_split");
	assertArgType(regex,"string","regexp_split");
	return arrayToList(str.split(regex));
}

function string_to_number(str) {
	assertArgType(str,"string","string_to_number");
	return parseFloat(str) || false;
}

function number_to_string(num) {
	assertArgType(num,"number","number_to_string");
	return num.toString();
}

function wrapped_uniform_draw(items, isStructural, conditionedValue) {
	assertArgType(items,"list","uniform-draw");
    var u = uniformDraw(listToArray(items, false), isStructural, conditionedValue)
	return u //uniformDraw(listToArray(items, false), isStructural, conditionedValue);
}

function wrapped_multinomial(items, probs, isStructural, conditionedValue) {
	assertArgType(items,"list","multinomial");
	assertArgType(probs,"list","multinomial");
	if (items.length != probs.length) {
		throw new Error("Lists of items and probabilities must be of equal length");
	}
	return multinomialDraw(listToArray(items, false), listToArray(probs), isStructural, conditionedValue);
}

function wrapped_flip(p, isStructural, conditionedValue) {
	return flip(p, isStructural, conditionedValue) == 1;
}

function wrapped_uniform(a, b, isStructural, conditionedValue) {
	assertNumArgsMulti(args_to_array(arguments), [2, 4], "uniform");
	assertArgType(a, "number", "uniform");
	assertArgType(b, "number", "uniform");
	return uniform(a, b, isStructural, conditionedValue);
}

function wrapped_random_integer(n,isStructural, conditionedValue) {
	assertNumArgsMulti(args_to_array(arguments), [1,3], "random-integer");
	assertArgType(n, "number", "random integer");
    var probs = [], p = 1/n
	for (var i = 0; i < n; i++){probs[i] = p}
    return multinomial(probs,isStructural, conditionedValue)
}

function wrapped_gaussian(mu, sigma, isStructural, conditionedValue) {
	assertNumArgsMulti(args_to_array(arguments), [2, 4],"gaussian");
	assertArgType(mu, "number", "gaussian");
	assertArgType(sigma, "number", "gaussian");
	return gaussian(mu, sigma, isStructural, conditionedValue);
}

function wrapped_gamma(a, b, isStructural, conditionedValue) {
	assertNumArgsMulti(args_to_array(arguments), [2, 4],"gamma");
	assertArgType(a, "number", "gamma");
	assertArgType(b, "number", "gamma");
	return gamma(a, b, isStructural, conditionedValue);
}

function wrapped_beta(a, b, isStructural, conditionedValue) {
	assertNumArgsMulti(args_to_array(arguments), [2, 4],"beta");
	assertArgType(a, "number", "beta");
	assertArgType(b, "number", "beta");
	return beta(a, b, isStructural, conditionedValue);
}

function wrapped_dirichlet(alpha, isStructural, conditionedValue) {
	assertNumArgsMulti(args_to_array(arguments), [1,3],"dirichlet");
	assertArgType(alpha, "list", "dirichlet");
	assertAllType(alpha, "number", "dirichlet");
	alpha = listToArray(alpha, true);
	return arrayToList(dirichlet(alpha, isStructural, conditionedValue));
}

function wrapped_traceMH(comp, samples, lag) {
	var inn = traceMH(comp, samples, lag, false, "lessdumb").map(function(x) {return x.sample});
	var res = arrayToList(inn);
	return res;
}

function wrapped_enumerate(comp) {
	var d = enumerateDist(comp);
	var p=[],v=[];
	var norm = 0;
	for (var x in d) {
		p.push(d[x].prob)
		v.push(d[x].val)
		norm += d[x].prob
	}
	var res = list(arrayToList(v), arrayToList(p.map(function(x){return x/norm})));
	return res;
}

function wrapped_evaluate(code) {
    //need to turn the code list back into a string before calling the webchurch evaluate...
    code = util.format_result(code)
    return evaluate(code)
}

function read_file(fileName) {
	assertArgType(fileName, "string", "read-file");
	return fs.readFileSync(fileName, "utf8");
}

//dummy hist for testing
function hist(x) {
	return x;
}

function display(str) {
	console.log(str);
}

function listToArray(list, recurse) {
	var array = [];
	while (list.length > 0) {
		var left = list[0];
		array.push((Array.isArray(left) && recurse) ? listToArray(left) : left);
		list = list[1];
	}
	return array;
}

function arrayToList(arr) {
	if (arr.length == 0) {
		return the_empty_list;
	} else {
	var i = arr.length, r = [];
	while (i--) {
	  r = [arr[i], r];
	}
	return r;
	}
}


///Asserts for checking arguments to functions.
///FIXME: if we turn these off, does code go much faster?

function assertArgType(x, type, argTo) {
    argTo = (argTo == 'undefined')? '"' : '" to ' + argTo
    switch(type) {
        case "function":
            if (typeof(x) != 'function') {
                //doesn't say "is not a function" to avoid special purpose code in evaluate.js
                throw new Error('argument "' + util.format_result(x) + argTo  + ' not a function');}
            break;
            
        case "integer":
            if (typeof(x) != "number" && parseInt(n) != n) {
                throw new Error('"' + util.format_result(n) + argTo + '" is not an integer');
            }
            break;
            
        case "number":
            if (typeof(x) != 'number') {
                throw new Error('argument "' + util.format_result(x) + argTo  + ' is not a number');}
            break;
            
        case "list":
            if (!is_list(x)) {
                throw new Error('argument "' + util.format_result(x) + argTo  + ' is not a list');}
            break;

        case "pair":
        	if (!is_pair(x)) {
                throw new Error('argument "' + util.format_result(x) + argTo  + ' is not a pair');}
        	break;
            
        default:
            if (typeof(x) != type) {
                throw new Error('argument "' + util.format_result(x) + argTo  + ' has incorrect type');}
    }
}

function assertAllType(list, type, argTo) {
	if (list.length != 0) {
		assertArgType(list[0], type, argTo);
		assertAllType(list[1], type, argTo);
	}
}

function assertNumArgs(args, n, argTo) {
	if (args.length != n) {
		throw new Error("Wrong number of arguments to "+ argTo +", expected " + n + ", got " + args.length);
	}
}

function assertNumArgsMulti(args, choices, argTo) {
	if (choices.indexOf(args.length) < 0) {
		throw new Error("Wrong number of arguments to "+ argTo +", expected " + choices.join(" or ") + ", got " + args.length +": "+args);
	}
}

function assertAtLeastNumArgs(args, n) {
	if (args.length < n) {
		throw new Error("Too few arguments, expected at least " + n + ", got " + args.length);
	}
}

module.exports = {
	the_empty_list: the_empty_list,

	plus: plus,
	sum: sum,
	minus: minus,
	mult: mult,
	div: div,
	greater: greater,
	less: less,
	geq: geq,
	leq: leq,
	eq: eq,

	and: and,
    all: all,
	or: or,
	not: not,

	is_null: is_null,
	list: list,
	is_list: is_list,
	pair: pair,
	cons: pair,
	is_pair: is_pair,
	first: first,
	car: first,
	second: second,
	third: third,
	fourth: fourth,
	fifth: fifth,
	sixth: sixth,
	seventh: seventh,
	max: max,
	min: min,
	expt: expt,
	mean: mean,
	append: append,
	flatten: flatten,
	rest: rest,
	cdr: rest,
	length: length,
	make_list: make_list,
	is_eq: is_eq,
	is_equal: is_equal,
	member: member,
    list_ref: list_ref,
    list_elt: list_elt,
    take: take,
    drop: drop,
	apply: apply,
	assoc: assoc,

	regexp_split: regexp_split,
	string_to_number: string_to_number,
	number_to_string: number_to_string,
	
	fold: fold,
	repeat: repeat,
	map: map,
	// sample: sample,
    wrapped_evaluate: wrapped_evaluate,

	wrapped_uniform_draw: wrapped_uniform_draw,
	wrapped_multinomial: wrapped_multinomial,
	wrapped_flip: wrapped_flip,
	wrapped_uniform: wrapped_uniform,
	wrapped_random_integer: wrapped_random_integer,
	wrapped_gaussian: wrapped_gaussian,
    wrapped_gamma: wrapped_gamma,   
    wrapped_beta: wrapped_beta,
	wrapped_dirichlet: wrapped_dirichlet,
	wrapped_traceMH: wrapped_traceMH,
	wrapped_enumerate: wrapped_enumerate,
	
	read_file: read_file,
	display: display,

	// Utility functions,
  args_to_array: args_to_array,
	args_to_list: args_to_list,
	arrayToList: arrayToList,
  listToArray: listToArray
	//hist: hist
};

module.exports.string_append = function() {
  var args = args_to_array(arguments);
  return args.join(""); 
};

module.exports.symbol_to_string = function(sym) {
  return sym;
};

module.exports.iota = function(n) {
  var r = [];
  for(var k = 0; k < n; k++) {
    r.push(k);
  }
  return arrayToList(r);
};
