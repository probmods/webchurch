function sizeof(obj) { return Object.keys(obj).length; }

function args_to_array(args) { return Array.prototype.slice.call(args, 0 ); }

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

function list() {
	var args = args_to_array(arguments);
	var result = [];
	for (var i = args.length-1; i >= 0; i--) {
		result = [args[i], result];
	}
	return result;
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

function repeat(n, fn) {
	assertNumArgs(args_to_array(arguments), 2);
	assertInteger(n);
	assertType(fn, "function");
	var results = [];
	for (; n > 0; n--) {
		results.unshift(fn());
	}
	return list.apply(null, results);
}

function is_equal(x, y) {
	assertNumArgs(args_to_array(arguments), 2)
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

function apply(fn, list) {
	assertType(fn, "function");
	assertList(list);
	return fn.apply(null, listToArray(list, true));
}

function map() {
	function helper(lists) {
		var fn_args = []
		var remaining_lists = []
		for (var i = 0; i < lists.length; i++) {
			if (lists[i].length == 0) {
				return [];
			} else {
				fn_args.push(lists[i][0]);
				remaining_lists.push(lists[i][1]);
			}
		}
		return [fn.apply(null, fn_args), helper(remaining_lists)];
	}

	var args = args_to_array(arguments);
	assertAtLeastNumArgs(args, 2);
	fn = args[0];
	lists = args.slice(1);
	return helper(lists);
}

function uniform_draw(list) {
	assertList(list);
	return uniformDraw(listToArray(list, false));
}

function hist(x) {
	return x;
}

function listToArray(list, recurse) {
	var array = [];
	while (list.length != 0) {
		var left = list[0];
		array.push((Array.isArray(left) && recurse)? listToArray(left) : left);
		list = list[1];
	}
	return array;
}

function assertType(n, type) {
	if (typeof(n) != type) {
		throw new Error('"' + n + '" is not a ' + type); 
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
	}
}

function assertNumArgs(args, n) {
	if (args.length != n) {
		throw new Error("Wrong number of arguments, expected " + n);
	}
}

function assertAtLeastNumArgs(args, n) {
	if (args.length < n) {
		throw new Error("Too few arguments, expected at least " + n + ", got " + args.length);
	}
}

module.exports = {
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

	list: list,
	pair: pair,
	is_pair: is_pair,
	first: first,
	rest: rest,
	length: length,
	repeat: repeat,
	is_equal: is_equal,

	apply: apply,
	map: map,

	uniform_draw: uniform_draw,

	hist: hist
}