// IMPORTANT: any builtin function may have up to one ERP call only.

var the_empty_list = [];

function sizeof(obj) { return Object.keys(obj).length; }

function args_to_array(args) { return Array.prototype.slice.call(args, 0 ); }

function args_to_list(args) { return arrayToList(args_to_array(args)); }

function plus() {
	var args = args_to_array(arguments);
	var sum = 0;
	for (var i = 0; i < args.length; i++) {
		assertType(args[i], "number");
		sum = sum + args[i];
	}
	return sum;
}

function sum(list) {
	assertNumArgs(args_to_array(arguments), 1);
	return plus.apply(null, listToArray(list, true));
}

function minus() {
	var args = args_to_array(arguments);
	assertAtLeastNumArgs(args, 1);
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
		assertType(args[i], "number");
		prod = prod * args[i];
	}
	return prod;
}

function div() {
	var args = args_to_array(arguments);
	assertAtLeastNumArgs(args, 1);
	assertType(args[0], "number");
	if (args.length == (1)) {
		return 1 / args[0];
	} else {
		return args[0] / mult.apply(null, args.slice(1));
	}
}

function and() {
	var args = args_to_array(arguments);
	for (var i = 0; i < args.length; i++) {
		if (!args[i]) {
			return false;
		}
	}
	return true
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
	assertNumArgs(args_to_array(arguments), 1);
 	return !x;
}

function cmp_nums(cmp_fn, args) {
	assertAtLeastNumArgs(args, 2)
	for (var i = 0; i < args.length - 1; i++) {
		assertType(args[i], "number");
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
	assertNumArgs(args_to_array(arguments), 1)
	return x == the_empty_list;
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
	assertNumArgs(args_to_array(arguments), 1)
	if (Array.isArray(list)) {
		if (list.length == 0) {
			return true;
		} else {
			return is_list(list[1]);
		}
	} else {
		return false;
	}
}

function pair(a, b) {
	assertNumArgs(args_to_array(arguments), 2)
	return [a, b];
}

function is_pair(x) {
	assertNumArgs(args_to_array(arguments), 1);
	return x.length == 2;
}

function first(x) {
	assertNumArgs(args_to_array(arguments), 1);
	if (x.length != 2) {
		throw new Error("Argument does not have required pair structure");
	} else {
		return x[0];
	}
}

function second(x) {
	return first(rest.apply(null, arguments));
}

function third(x) {
	return first(rest(rest(x)));
}

function fourth(x) {
	return first(rest(rest(rest(x))));
}

function fifth(x) {
	return first(rest(rest(rest(rest(x)))));
}

function sixth(x) {
	return first(rest(rest(rest(rest(rest(x))))));
}

function seventh(x) {
	return first(rest(rest(rest(rest(rest(rest(x)))))));
}

function max(x) {
  return Math.max.apply(Math, listToArray(x));
}

function min(x) {
  return Math.min.apply(Math, listToArray(x));
}

function expt(a, b) {
  return Math.pow(a, b);
}

//i'm sure this can be done better but at least it works for now
function append() {
  var args = args_to_array(arguments);
  return arrayToList([].concat.apply([], args.map(function(x) {
    assertList(x);
    return listToArray(x);
  })));
}

function rest(x) {
	assertNumArgs(args_to_array(arguments), 1);
	if (x.length != 2) {
		throw new Error("Argument does not have required pair structure");
	} else {
		return x[1];
	}
}

function length(x) {
	assertNumArgs(args_to_array(arguments), 1);
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

function make_list(n, x) {
	assertNumArgs(args_to_array(arguments), 2);
	assertInteger(n);
	if (n == 0) return the_empty_list;
	var results = []
	for (; n > 0; n--) {
		results.unshift(x);
	}
	return arrayToList(results);
}

function is_eq(x, y) {
	assertNumArgs(args_to_array(arguments), 2);
	return typeof(x) == typeof(y) && x == y;
}

function is_equal(x, y) {
	assertNumArgs(args_to_array(arguments), 2);
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
	assertList(list);
	if (list.length == 0) {
		return false;
	} else if (eq_fn(x, list[0])) {
		return list;
	} else {
		return member_base(x, list[1], eq_fn);
	}
}

function member(x, list) {
	assertNumArgs(args_to_array(arguments), 2);
	return member_base(x, list, is_equal);
}

function sample(fn) {
	assertType(fn, "function");
	return fn();
}

function apply(fn, list) {
	assertType(fn, "function");
	assertList(list);
	return fn.apply(null, listToArray(list, false));
}

function wrapped_uniform_draw(items) {
	assertList(items);
	return uniformDraw(listToArray(items, false), false);
}

function wrapped_multinomial(items, probs) {
	assertList(items);
	assertList(probs);
	if (items.length != probs.length) {
		throw new Error("Lists of items and probabilities must be of equal length");
	}
	return multinomialDraw(listToArray(items, false), listToArray(probs), null);
}

function wrapped_flip(p, isStructural, conditionedValue) {
	return flip(p, isStructural, conditionedValue) == 1;
}

function wrapped_uniform(a, b, isStructural, conditionedValue) {
	assertNumArgsMulti(args_to_array(arguments), [2, 4]);
	assertType(a, "number");
	assertType(b, "number");
	return uniform(a, b, isStructural, conditionedValue);
}

function wrapped_random_integer(n) {
	assertNumArgs(args_to_array(arguments), 1);
	assertType(n, "number");
	return Math.floor(uniform(0, 1, false, null) * n);
}

function wrapped_gaussian(mu, sigma, isStructural, conditionedValue) {
	assertNumArgsMulti(args_to_array(arguments), [2, 4]);
	assertType(mu, "number");
	assertType(sigma, "number");
	return gaussian(mu, sigma, isStructural, conditionedValue);
}

function wrapped_gamma(a, b, isStructural, conditionedValue) {
	assertNumArgsMulti(args_to_array(arguments), [2, 4]);
	assertType(a, "number");
	assertType(b, "number");
	return gamma(a, b, isStructural, conditionedValue);
}

function wrapped_beta(a, b, isStructural, conditionedValue) {
	assertNumArgsMulti(args_to_array(arguments), [2, 4]);
	assertType(a, "number");
	assertType(b, "number");
	return beta(a, b, isStructural, conditionedValue);
}

function wrapped_dirichlet(alpha) {
	assertNumArgs(args_to_array(arguments), 1);
	assertList(alpha);
	assertAllType(alpha, "number");
	alpha = listToArray(alpha, true);
	return arrayToList(dirichlet(alpha, false, null));
}

function wrapped_traceMH(comp, samples, lag) {
	inn = traceMH(comp, samples, lag, false).map(function(x) {return x.sample})
	res = arrayToList(inn);
	return res;
}

function hist(x) {
	return x;
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
		return [arr[0], arrayToList(arr.slice(1))];
	}
}

function assertType(n, type) {
	if (typeof(n) != type) {
		throw new Error('"' + n + '" is not a ' + type); 
	}
}

function assertAllType(list, type) {
	if (list.length != 0) {
		assertType(list[0], type);
		assertAllType(list[1], type);
	}
}

function assertInteger(n) {
	if (typeof(n) != "number" && parseInt(n) != n) {
		throw new Error('"' + n + '" is not an integer'); 
	}
}

function assertList(list) {
	if (Array.isArray(list)) {
		if (list.length == 0) {
			return;
		} else if (list.length != 2) {
			throw new Error("Expected list");
		}
		assertList(list[1]);
	} else {
		throw new Error("Expected list");
	}
}

function assertNumArgs(args, n) {
	if (args.length != n) {
		throw new Error("Wrong number of arguments, expected " + n);
	}
}

function assertNumArgsMulti(args, choices) {
	if (choices.indexOf(args.length) < 0) {
		throw new Error("Wrong number of arguments, expected " + choices.join(" or "));
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
	or: or,
	not: not,

	is_null: is_null,
	list: list,
	is_list: is_list,
	pair: pair,
	is_pair: is_pair,
	first: first,
	second: second,
    third: third,
    fourth: fourth,
    fifth: fifth,
    sixth: sixth,
    seventh: seventh,
    max: max,
    min: min,
    expt: expt,
    append: append,
    //flatten: flatten,
	rest: rest,
	length: length,
	make_list: make_list,
	is_eq: is_eq,
	is_equal: is_equal,
	member: member,

	apply: apply,

	wrapped_uniform_draw: wrapped_uniform_draw,
	wrapped_multinomial: wrapped_multinomial,
	wrapped_flip: wrapped_flip,
	wrapped_uniform: wrapped_uniform,
	wrapped_random_integer: wrapped_random_integer,
	wrapped_gaussian: wrapped_gaussian,
	wrapped_dirichlet: wrapped_dirichlet,
	wrapped_traceMH: wrapped_traceMH,

	// Utility functions, not exposed to Church
	args_to_array: args_to_array,
	args_to_list: args_to_list,
	arrayToList: arrayToList,
	hist: hist
}
