// var esprima = require('esprima');
var escodegen = require('escodegen');

var identifier_prefix = "_"

var church_special_forms = ["quote", "if", "set!", "define", "lambda", "begin"]

var church_builtins_map = {
	"+": "plus",
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
	"flip": "flip",
	"list": "list",
	"null?": "is_null",
	"#t": "true",
	"#T": "true",
	"#f": "false",
	"#F": "false",
}

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
function is_identifier(s) { return !(is_string(s) || is_number(s)); }

function strip_quotes(s) { return s.slice(1, -1); }
function get_value_of_string_or_number(s) { 
	if (is_string(s)) {
		return strip_quotes(s);
	} else {
		return parseFloat(s);
	}
}

function rename(s) { return identifier_prefix + s;}

function deep_copy(obj) { return JSON.parse(JSON.stringify(obj)); }

// TODO: add all kinds of error-checking.
function church_tree_to_esprima_ast(church_tree) {
	function make_declaration(church_tree) {
		var node = deep_copy(declaration_node);
		node["declarations"][0]["id"]["name"] = rename(church_tree["children"][0]);
		node["declarations"][0]["init"] = make_expression(church_tree["children"][1]);
		return node;
	}

	function make_function_expression(church_tree) {
		var lambda_args = church_tree["args"];
		var church_actions = church_tree["children"];
		var func_expression;
		if (typeof(lambda_args) == "object") {
			func_expression = deep_copy(function_expression_node);
			for (var i = 0; i < lambda_args.length; i++) {
				func_expression["params"].push(make_simple_expression(lambda_args[i]));
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
		var lambda_args = church_tree["args"];
		var params = church_tree["children"];
		console.log(params);
		if (params.length < 2) {
			throw new Error("Wrong number of arguments");
		}
		var lambda;
		if (typeof(lambda_args) == "object") {
			lambda = deep_copy(function_expression_node);
			for (var i = 0; i < lambda_args.length; i++) {
				lambda["params"].push(make_simple_expression(lambda_args[i]));
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
		var params = church_tree["children"];
		// TODO: better error-checking
		if (params.length < 5) {
			throw new Error("Wrong number of arguments");
		}

		var expression = deep_copy(call_expression_node);
		expression["callee"] = {"type": "Identifier", "name": "distrib"};

		var condition_stmt = make_condition_stmt(make_expression(params[params.length - 1]))

		var computation = deep_copy(function_expression_node);
		computation["body"]["body"] = make_expression_statement_list(params.slice(2, -2))
			.concat(condition_stmt)
			.concat(make_return_statement(params[params.length - 2]));

		expression["arguments"] = [
			computation,
			{"type": "Identifier", "name": "traceMH"},
			make_expression(params[0]),
			make_expression(params[1])];

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
		call_expression["callee"] = make_expression(church_tree["head"]);
		call_expression["arguments"] = make_expression_list(church_tree["children"]);
		return call_expression;
	}

	function make_return_statement(church_tree) {
		var return_statement = deep_copy(return_statement_node);
		return_statement["argument"] = make_expression(church_tree);
		return return_statement;
	}

	function make_if_expression(church_tree) {
		var if_expression = deep_copy(call_expression_node);
		var callee = deep_copy(function_expression_node);
		var if_statement = deep_copy(if_statement_node);
		if_statement["test"] = make_expression(church_tree["cond"]);
		if_statement["consequent"] = deep_copy(block_statement_node);
		if_statement["consequent"]["body"].push(make_return_statement(church_tree["consq"]));

		if (church_tree["alt"]) {
			if_statement["alternate"] = deep_copy(block_statement_node);
			if_statement["alternate"]["body"].push(make_return_statement(church_tree["alt"]));
		}
		callee["body"]["body"] = [if_statement];
		if_expression["callee"] = callee;
		console.log(JSON.stringify(if_expression));
		return if_expression;
	}

	function make_expression(church_tree) {
		// TODO: Turn this into a shorter map-style thing.
		if (typeof(church_tree) == "object") {
			if (church_tree["head"] == "lambda") {
				return make_function_expression(church_tree);
			} else if (church_tree["head"] == "lambda-query") {
				return make_lambda_query_expression(church_tree);
			} else if (church_tree["head"] == "if") {
				return make_if_expression(church_tree);
			} else if (church_tree["head"] == "define") {
				// TODO: figure out whether to catch defines here or in make_expression_statement
			} else if (church_tree["head"] == "mh-query") {
				return make_mh_query_expression(church_tree);
			} else {
				return make_call_expression(church_tree);
			}
		} else {
			return make_simple_expression(church_tree);
		}
	}

	function make_simple_expression(church_leaf) {
		var expression = deep_copy(expression_node);
		if (is_identifier(church_leaf)) {
			expression["type"] = "Identifier";
			expression["name"] = church_leaf;
			if (church_leaf in church_builtins_map){
				expression["name"] = church_builtins_map[church_leaf];
			} else {
				expression["name"] = rename(church_leaf);
			}
		} else {
			expression["type"] = "Literal";
			expression["value"] = get_value_of_string_or_number(church_leaf);
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
		if (church_tree["head"] == "define") {
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