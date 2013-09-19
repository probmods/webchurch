// var esprima = require('esprima');
var escodegen = require('escodegen');

var identifier_prefix = "_"

var church_builtins_map = {
	"+": "plus",
	"sum": "sum",
	"-": "minus",
	"*": "mult",
	"/": "div",
	">": "greater",
	"<": "less",
	">=": "geq",
	"<=": "leq",
	"=": "eq",
	"and": "and",
	"or": "or",
	"not": "not",

	"null?": "is_null",
	"list": "list",
	"list?": "is_list",
	"pair": "pair",
	"pair?": "is_pair",
	"first": "first",
	"second": "second",
	"rest": "rest",
	"length": "length",
	"repeat": "repeat",
	"make-list": "make_list",
	"eq?": "is_eq",
	"equal?": "is_equal",
	"member": "member",

	"apply": "apply",
	"map": "map",

	"uniform-draw": "wrapped_uniform_draw",
	"multinomial": "wrapped_multinomial",
	"flip": "wrapped_flip",
	"uniform": "wrapped_uniform",
	"gaussian": "wrapped_gaussian",
	"dirichlet": "wrapped_dirichlet",

	// "hist": "hist"
}

var probjs_builtins_map = {
	"mem": "mem",
}

var js_builtins_map = {
	"round": "Math.round"
}

var true_aliases = ["#t", "#T", "true"];

var false_aliases = ["#f", "#F", "false"];

var program_node = {
	"type": "Program",
	"body": []
}
var declaration_node = {
	"type": "VariableDeclaration",
	"declarations": [
		{
			"type": "VariableDeclarator",
			"id": {
				"type": "Identifier",
				"name": null
			},
			"init": null
		}
	],
	"kind": "var"
}
var function_expression_node = {
	"type": "FunctionExpression",
	"id": null,
	"params": [],
	"defaults": [],
	"body": {
		"type": "BlockStatement",
		"body": []
	},
	"rest": null,
	"generator": false,
	"expression": false
}
var expression_statement_node = {
	"type": "ExpressionStatement",
	"expression": null
}
var array_node = {
	"type": "ArrayExpression",
	"elements": []
}
var expression_node = {
	"type": null,
	"name": null,
	"value": null
}
var member_expression_node = {
	"type": "MemberExpression",
	"computed": false,
	"object": {
		"type": "Identifier",
		"name": null
	},
	"property": {
		"type": "Identifier",
		"name": null
	}
}

var return_statement_node = {
	"type": "ReturnStatement",
	"argument": null
}
var call_expression_node = {
	"type": "CallExpression",
	"callee": null,
	"arguments": []
}
var if_statement_node = {
	"type": "IfStatement",
	"test": null,
	"consequent": null,
	"alternate": null
}
var block_statement_node = {
	"type": "BlockStatement",
	"body": []
}

function is_string(s) { return s[0] == "\""; }
function is_number(s) { return !isNaN(parseFloat(s)); }
function is_identifier(s) { return !(is_string(s) || is_number(s) || Array.isArray(s)); }

function strip_quotes(s) { return s.slice(1, -1); }
function get_value_of_string_or_number(s) { 
	if (is_string(s)) {
		return strip_quotes(s);
	} else {
		return parseFloat(s);
	}
}

function convert_char(char) { return ("_" + char.charCodeAt(0)); }

// Any identifier that doesn't match the form [a-zA-Z_$][0-9a-zA-Z_$]* isn't
// okay in JS, so we need to rename them.
function format_identifier(id) {
	var new_id;
	if (id[0].match("[a-zA-Z_$]")) {
		new_id = id[0];
	} else {
		new_id = convert_char(id[0]);
	}
	for (var j = 1; j < id.length; j++) {
		if (id[j].match("[0-9a-zA-Z_$]")) {
			new_id = new_id + id[j];
		} else {
			new_id = new_id + convert_char(id[j]);
		}
	}
	return new_id;
}

function rename(s) { return identifier_prefix + format_identifier(s);}

function deep_copy(obj) { return JSON.parse(JSON.stringify(obj)); }

// TODO: add all kinds of error-checking.
function church_tree_to_esprima_ast(church_tree) {
	var heads_to_helpers = {
		"lambda": make_function_expression,
		"lambda-query": make_lambda_query_expression,
		"if": make_if_expression,
		"quote": make_quoted_expression,
		"mh-query": make_mh_query_expression,
		"rejection-query": make_rejection_query_expression
	}

	function make_declaration(church_tree) {
		var node = deep_copy(declaration_node);
		node["declarations"][0]["id"]["name"] = rename(church_tree[1]);
		node["declarations"][0]["init"] = make_expression(church_tree[2]);
		return node;
	}

	function make_function_expression(church_tree) {
		var lambda_args = church_tree[1];
		var church_actions = church_tree.slice(2);
		var func_expression;
		if (typeof(lambda_args) == "object") {
			func_expression = deep_copy(function_expression_node);
			for (var i = 0; i < lambda_args.length; i++) {
				func_expression["params"].push(make_leaf_expression(lambda_args[i]));
			}
			var procedure_statements = make_expression_statement_list(church_actions.slice(0, -1));
			var return_statement = deep_copy(return_statement_node);
			return_statement["argument"] = make_expression(church_actions[church_actions.length-1]);
			func_expression["body"]["body"] = procedure_statements.slice(0, -1);
			func_expression["body"]["body"].push(return_statement);
		} else {
			// Handle arbitrary number of args
		}
		return func_expression;
	}

	function make_lambda_query_expression(church_tree) {
		var lambda_args = church_tree[1];
		var params = church_tree.slice(2);
		if (params.length < 2) {
			throw new Error("Wrong number of arguments");
		}
		var lambda;
		if (typeof(lambda_args) == "object") {
			lambda = deep_copy(function_expression_node);
			for (var i = 0; i < lambda_args.length; i++) {
				lambda["params"].push(make_leaf_expression(lambda_args[i]));
			}
			var defines = make_expression_statement_list(params.slice(0, -2));
			var condition_stmt = make_condition_stmt(params[params.length-1]);
			var return_stmt = deep_copy(return_statement_node);
			return_stmt["argument"] = make_expression(params[params.length-2]);
			lambda["body"]["body"] = defines.concat(condition_stmt).concat(return_stmt)
		} else {
			// Handle arbitrary number of args
		}

		var marginalize = deep_copy(call_expression_node);
		marginalize["callee"] = {"type": "Identifier", "name": "marginalize"};
		marginalize["arguments"] = [
			lambda,
            {"type": "Identifier", "name": "traceMH"},
            {"type": "Literal", "value": 100}]
		return marginalize;
	}

	function make_mh_query_expression(church_tree) {
		var params = church_tree.slice(1);
		// TODO: better error-checking
		if (params.length < 5) {
			throw new Error("Wrong number of arguments");
		}
		var expression = deep_copy(call_expression_node);
		expression["callee"] = {"type": "Identifier", "name": "church_builtins.wrapped_traceMH"};

		var condition_stmt = make_condition_stmt(params[params.length - 1]);

		var computation = deep_copy(function_expression_node);
		computation["body"]["body"] = make_expression_statement_list(params.slice(2, -2))
			.concat(condition_stmt)
			.concat(make_return_statement(params[params.length - 2]));

		expression["arguments"] = [
			computation,
			make_expression(params[0]),
			make_expression(params[1]),
			{"type": "Literal", "value": false}
		];

		return expression;
	}

	function make_rejection_query_expression(church_tree) {
		var params = church_tree.slice(1);
		if (params.length < 2) {
			throw new Error("Wrong number of arguments");
		}
		var expression = deep_copy(call_expression_node);
		expression["callee"] = {"type": "Identifier", "name": "rejectionSample"};

		var condition_stmt = make_condition_stmt(params[params.length - 1])

		var computation = deep_copy(function_expression_node);
		computation["body"]["body"] = make_expression_statement_list(params.slice(0, -2))
			.concat(condition_stmt)
			.concat(make_return_statement(params[params.length - 2]));

		expression["arguments"] = [computation];

		return expression;

	}

	function make_condition_stmt(cond_tree) {
		var condition_stmt = deep_copy(expression_statement_node);
		condition_stmt["expression"] = deep_copy(call_expression_node);
		condition_stmt["expression"]["callee"] = {"type": "Identifier", "name": "condition"};
		condition_stmt["expression"]["arguments"] = [make_expression(cond_tree)];
		return condition_stmt;
	}

	function make_call_expression(church_tree) {
		var call_expression = deep_copy(call_expression_node);
		call_expression["callee"] = make_expression(church_tree[0]);
		call_expression["arguments"] = make_expression_list(church_tree.slice(1));
		return call_expression;
	}

	function make_return_statement(church_tree) {
		var return_statement = deep_copy(return_statement_node);
		return_statement["argument"] = make_expression(church_tree);
		return return_statement;
	}

	function make_if_expression(church_tree) {
		function helper(test, consequent, alternate) {
			var if_statement = deep_copy(if_statement_node);
			if_statement["test"] = make_expression(test);
			if_statement["consequent"] = deep_copy(block_statement_node);
			if_statement["consequent"]["body"].push(make_return_statement(consequent));

			if (alternate != undefined) {
				// Detect basic nested ifs
				if (alternate[0] == "if") {
					if_statement["alternate"] = helper.apply(null, alternate.slice(1));
				} else {
					if_statement["alternate"] = deep_copy(block_statement_node);
					if_statement["alternate"]["body"].push(make_return_statement(alternate));
				}
			}
			return if_statement;
		}
		var if_expression = deep_copy(call_expression_node);
		var callee = deep_copy(function_expression_node);
		callee["body"]["body"] = [helper.apply(null, church_tree.slice(1))];
		if_expression["callee"] = callee;
		return if_expression;
	}

	// function make_case_expression(church_tree) {
	// 	function helper(key, clauses) {
	// 		if (clauses.length == 0) {
	// 			return make_leaf_expression([]);
	// 		} else {
	// 			if (clauses[0][0] == "else") {
	// 				return make_return_statement(clauses[0][1]);
	// 			} else {
	// 				var if_statement = deep_copy(if_statement_node);
	// 				// if_statement["test"] = make_call_expression(["member", key, clauses[0][0]]);
	// 				if_statement["test"] = make_leaf_expression("true")
	// 				if_statement["consequent"] = deep_copy(block_statement_node);
	// 				if_statement["consequent"]["body"].push(make_return_statement([]));
	// 				if_statement["alternate"] = deep_copy(block_statement_node);
	// 				if_statement["alternate"]["body"].push(make_return_statement([]));
	// 				return if_statement;
	// 			}
	// 		}
	// 	}
	// 	var case_expression = deep_copy(call_expression_node);
	// 	var callee = deep_copy(function_expression_node);
	// 	callee["body"]["body"] = helper(church_tree[1], church_tree.slice(2));
	// 	case_expression["callee"] = callee;
	// 	console.log("******************")
	// 	console.log(case_expression);
	// 	return case_expression;
	// }

	function make_quoted_expression(church_tree) {
		function quote_helper(quoted) {
			if (Array.isArray(quoted)) {
				if (quoted.length == 0) {
					return make_leaf_expression(quoted);
				} else {
					var array = deep_copy(array_node);
					array["elements"] = [quote_helper(quoted[0]), quote_helper(quoted.slice(1))];
					return array;
				}
			} else {
				if (is_identifier(quoted)) {
					return make_leaf_expression('"' + quoted + '"');
				} else {
					return make_leaf_expression(quoted);
				}
			}
		}
		return quote_helper(church_tree[1]);
	}

	function make_expression(church_tree) {
		// TODO: Turn this into a shorter map-style thing.
		if (Array.isArray(church_tree) && church_tree.length > 0) {
			if (church_tree[0] in heads_to_helpers) {
				return heads_to_helpers[church_tree[0]](church_tree);
			} else {
				return make_call_expression(church_tree);
			}
		} else {
			return make_leaf_expression(church_tree);
		}
	}

	function make_identifier_expression(church_leaf) {
		var expression;
		if (church_leaf in church_builtins_map) {
			expression = deep_copy(member_expression_node);
			expression["object"]["name"] = "church_builtins"
			expression["property"]["name"] = church_builtins_map[church_leaf];
		} else if (church_leaf in probjs_builtins_map) {
			expression = deep_copy(expression_node);
			expression["type"] = "Identifier";
			expression["name"] = probjs_builtins_map[church_leaf];
		} else if (church_leaf in js_builtins_map) {
			expression = deep_copy(expression_node);
			expression["type"] = "Identifier";
			expression["name"] = js_builtins_map[church_leaf];
		} else {
			expression = deep_copy(expression_node);
			expression["type"] = "Identifier";
			expression["name"] = rename(church_leaf);
		}
		return expression;
	}

	function make_leaf_expression(church_leaf) {
		var expression = deep_copy(expression_node);
		if (Array.isArray(church_leaf) && church_leaf.length == 0) {
			expression["type"] = "Identifier";
			expression["name"] = "church_builtins.the_empty_list";
		} else if (true_aliases.indexOf(church_leaf) != -1) {
			expression["type"] = "Literal";
			expression["value"] = true;
		} else if (false_aliases.indexOf(church_leaf) != -1) {
			expression["type"] = "Literal";
			expression["value"] = false;
		} else if (is_identifier(church_leaf)) {
			expression = make_identifier_expression(church_leaf);
		} else {
			value = get_value_of_string_or_number(church_leaf);
			if (value < 0) {
				expression["type"] = "UnaryExpression";
				expression["operator"] = "-"
				expression["argument"] = {"type": "Literal", "value": -value}
			} else {
				expression["type"] = "Literal";
				expression["value"] = value
			}

		}
		return expression;
	}

	function make_expression_list(church_trees) {
		var body = []
		for (var i = 0; i < church_trees.length; i++) {
			body.push(make_expression(church_trees[i]));
		}
		return body;
	}

	function make_expression_statement(church_tree) {
		if (church_tree[0] == "define") {
			return make_declaration(church_tree);
		} else {
			var expr_statement = deep_copy(expression_statement_node);
			expr_statement["expression"] = make_expression(church_tree);
			return expr_statement;
		}
	}

	function make_expression_statement_list(church_trees) {
		var body = []
		for (var i = 0; i < church_trees.length; i++) {
			body.push(make_expression_statement(church_trees[i]));
		}
		return body;
	}


	var ast = program_node;
	ast["body"] = make_expression_statement_list(church_tree);
	return ast;
}

exports.church_tree_to_esprima_ast = church_tree_to_esprima_ast;