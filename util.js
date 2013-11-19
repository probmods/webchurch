// ******************************
// * PARSING
// ******************************

function is_leaf(node) { return (!node["children"]); }

var boolean_aliases = {
	"#t": true,
	"#T": true,
	"true": true,
	"#f": false,
	"#F": false,
	"false": false
}

function is_string(s) { return s[0] == "\""; }
function is_number(s) { return !isNaN(parseFloat(s)); }
function is_identifier(s) { return !(boolean_aliases[s]!=undefined || is_string(s) || is_number(s)); }

// ******************************
// * EVALUATION
// ******************************

function make_church_error(name, start, end, msg) {
	return {name: "Church" + name, message: start + "-" + end + ": " + msg, start: start, end: end};
}

function format_result(obj) {
	function format_result_in_list_helper(obj) {
		if (obj.length == 2) {
			return " " + format_result(obj[0]) + format_result_in_list_helper(obj[1]);
		} else if (obj.length == 0) {
			return ")";
		} else {
			return " . " + format_result(obj) + ")";
		}
	}

	if (Array.isArray(obj)) {
		if (obj.length == 2) {
			return "(" + format_result(obj[0]) + format_result_in_list_helper(obj[1]);
		} else {
			return "()";
		}
	} else {
		if (typeof(obj) == "boolean") {
			if (obj) {
				return "#t";
			} else {
				return "#f";
			}
		} else {
			return "" + obj;
		}
	}
}

function log(obj, header) {
	console.log(header||"*********************************");
	if (typeof(obj) == "string") {
		console.log(obj);
	} else {
		console.log(JSON.stringify(obj, undefined, 2));
	}
}

module.exports = {
	is_leaf: is_leaf,
	boolean_aliases: boolean_aliases,
	is_string: is_string,
	is_identifier: is_identifier,

	make_church_error: make_church_error,
	format_result: format_result,
	log: log
}