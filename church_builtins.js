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

function eq() {
	var args = args_to_array(arguments);
	assertAtLeastNumArgs(args, 2)
	for (var i = 0; i < args.length; i++) {
		assertType(args[i], "number");
		if (args[i] != args[0]) return false; 
	}
	return true;
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
	minus: minus,
	mult: mult,
	div: div,
	eq: eq,

	and: and,
	or: or,

	list: list,
	pair: pair,
	is_pair: is_pair,
	first: first,
	rest: rest,
	length: length,
	repeat: repeat
}