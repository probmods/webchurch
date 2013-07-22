function sizeof(obj) { return Object.keys(obj).length; }

function args_to_array(args) { return Array.prototype.slice.call(args, 0 ); }

function plus() {
	var args = args_to_array(arguments);
	if (args.length == 0) {
		return 0;
	} else {
		return args[0] + plus.apply(null, args.slice(1));
	}
}

function minus() {
	var args = args_to_array(arguments);
	if (args.length == 0) {
		throw new Error("Wrong number of arguments");
	} else if (args.length == (1)) {
		return -args[0];
	} else {
		return args[0] - plus.apply(null, args.slice(1));
	}
}

function mult() {
	var args = args_to_array(arguments);
	if (args.length == 0) {
		return 1;
	} else {
		return args[0] * mult.apply(null, args.slice(1));
	}
}

function div() {
	var args = args_to_array(arguments);
	if (args.length == 0) {
		throw new Error("Wrong number of arguments");
	} else if (args.length == (1)) {
		return 1 / args[0];
	} else {
		return args[0] / mult.apply(null, args.slice(1));
	}
}

function and() {
	var args = args_to_array(arguments);
	if (args.length == 0) {
		return true;
	} else if (args.length == 1) {
		return args[0];
	} else {
		return args[0] && and.apply(null, args.slice(1));
	}
}

function eq() {
	var args = args_to_array(arguments);
	if (args.length < 2) {
		throw new Error("Wrong number of arguments");
	} else {
		for (var i = 0; i < args.length; i++) {
			if (args[i] != args[0]) return false; 
		}
		return true;
	}
}

module.exports = {
	plus: plus,
	minus: minus,
	mult: mult,
	div: div,
	and: and,
	eq: eq
}