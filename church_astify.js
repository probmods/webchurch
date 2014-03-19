var util = require('./util.js');

var brackets_map = {"(": ")", "[": "]"};

function make_generic_node(head, children) {
	return {"head": head, "children": children};
}

function deep_copy(obj) { return JSON.parse(JSON.stringify(obj)); }

function isquote(ast){return ast.children && ast.children[0].text && ast.children[0].text=="quote"}

// TODO: add all kinds of error-checking.
function church_astify(tokens) {
	// astify changes the opening bracket tokens so the end site is the matching closing bracket
	function astify(tokens) {

		function helper(opening_bracket) {
			// Tree nodes have keys [children, start, end]
			var result = {children: [], start: opening_bracket ? opening_bracket.start : "1:1"};
			while (tokens.length > 0) {
				if (tokens[0].text == "(" || tokens[0].text == "[") {
					var bracket = tokens[0];
					storage.push(tokens.shift());
					result.children.push(helper(bracket));
				} else if (tokens[0].text == ")" || tokens[0].text == "]") {
					if (!opening_bracket || tokens[0].text != brackets_map[opening_bracket.text]) {
						throw util.make_church_error("SyntaxError", tokens[0].start, tokens[0].end, "Unexpected close parens");
					} else {
						result["end"] = tokens[0].start;
						opening_bracket.end = tokens[0].start;
						storage.push(tokens.shift());
						return result;
					}
				} else {
					var token = tokens.shift();
					storage.push(token);
					result.children.push(token);
				}
			}
			if (!opening_bracket) {
				return result;
			} else {
				throw util.make_church_error("SyntaxError", opening_bracket.start, opening_bracket.end, "Unclosed parens");
			}
		}
		var storage = [];
		var ast = helper();
		for (var i = 0; i < storage.length; i++) {
			tokens.push(storage[i]);
		}
		return ast;
	}

	function traverse(ast, fn, stopfn) {
		if (!util.is_leaf(ast) && ast.children.length > 0 && (!stopfn || !stopfn(ast))) {
			ast = fn(ast);
			for (var i = 0; i < ast.children.length; i++) {
				ast.children[i] = traverse(ast.children[i], fn, stopfn);
			}
		}
		return ast;
	}

	function is_special_form(text) {
		return ["define", "lambda", "case", "cond", "if", "let"].indexOf(text) != -1;
	}

	function assert_not_special_form(node) {
		if (is_special_form(node.text)) {
			throw util.make_church_error("SyntaxError", node.start, node.end, "Special form " + node.text + " cannot be used as an atom");
		}
	}

	function validate_leaves(ast) {
		for (var i = 1; i < ast.children.length; i++) {
			assert_not_special_form(ast.children[i]);
		}
		return ast;
	}

	// NOTE: Many of the desugar functions don't add range information.
	// For now, it seems unlikely they'll be needed.

	function dsgr_define(ast) {
		if (ast.children[0].text=="define") {
			if (ast.children.length < 3) {
				throw util.make_church_error("SyntaxError", ast.start, ast.end, "Invalid define");
			}
			// Function define sugar
			if (!util.is_leaf(ast.children[1])) {
				var lambda_args;
				// Variadic sugar
				if (ast.children[1].children.length == 3 && ast.children[1].children[1].text == ".") {
					lambda_args = ast.children[1].children[2];
				} else {
					lambda_args = {children: ast.children[1].children.slice(1)};
				}
				var lambda = {
					children: [
						{text: "lambda"},
						lambda_args
					].concat(ast.children.slice(2))
				};
				return {
					children: [ast.children[0], ast.children[1].children[0], lambda],
					start: ast.start,
					end: ast.end
				};
			}
		}
		return ast;
	}

	function dsgr_lambda(ast) {
		if (ast.children[0].text=="lambda") {
			if (ast.children.length < 3) {
				throw util.make_church_error("SyntaxError", ast.start, ast.end, "lambda has no body");
			}
		}
		return ast;
	}

	function dsgr_let(ast) {
		var let_varieties = ["let", "let*"];

		if (let_varieties.indexOf(ast.children[0].text)!=-1) {
			if (ast.children.length < 3) {
				throw util.make_church_error("SyntaxError", ast.start, ast.end, ast.children[0].text + " has no body");
			}
			var bindings = ast.children[1];
			var valid_bindings = true;
			if (util.is_leaf(bindings)) {
				valid_bindings = false;
			} else {
				for (var i = 0; i < bindings.children.length; i++) {
					if (util.is_leaf(bindings.children[i]) || bindings.children[i].children.length != 2) {
						valid_bindings = false;
						break;
					}
				}
			}
			if (!valid_bindings) {
				throw util.make_church_error_range("SyntaxError", bindings.start, bindings.end, ast.children[0].text + " has invalid bindings");
			}

			switch (ast.children[0].text) {
				case "let":
					return {
						children: [
							{
								children: [
									{text: "lambda"},
									{children: bindings.children.map(function(x) {return x.children[0]})},
									ast.children[2]
								]
							}
						].concat(bindings.children.map(function(x) {return x.children[1]}))
					};
				case "let*":
					var new_ast = {
						children: [
							{
								children: [
									{text: "lambda"},
									{children: []},
									ast.children[2]
								]
							}
						]
					}
					for (var i = bindings.children.length-1; i >= 0; i--) {
						// console.log(JSON.stringify(bindings.children[i].children[0],undefined,2))
						new_ast = {
							children: [
								{
									children: [
										{text: "lambda"},
										{children: [bindings.children[i].children[0]]},
										new_ast
									]
								},
								bindings.children[i].children[1]
							]
						}
					}
					return new_ast;
			}


		} else {
			return ast;
		}
	}

	function dsgr_quote(ast) {
		var last = ast.children[ast.children.length-1];
		if (last.text=="'") {
			throw util.make_church_error("SyntaxError", last.start, last.end, "Invalid single quote");
		}
		for (var i = ast.children.length - 2; i >= 0; i--) {
			if (ast.children[i].text == "'") {
				ast.children.splice(i, 2, {
					children: [{text: "quote", start: ast.children[i].start, end: ast.children[i].end}, ast.children[i+1]],
					start: ast.children[i].start,
					end: ast.children[i+1].end
				});
			}
		}
		return ast;
	}

	function dsgr_case(ast) {
		function case_helper(key, clauses) {
			if (clauses.length == 0) {
				return undefined;
			}
			var clause = clauses[0];
			if (util.is_leaf(clause) || clause.children.length != 2 ||
				(util.is_leaf(clause.children[0]) && clause.children[0].text!="else")) {
				throw util.make_church_error("SyntaxError", clause.start, clause.end, "Bad clause for case");
			}

			if (clause.children[0].text=="else") {
				if (clauses.length > 1) {
					throw util.make_church_error("SyntaxError", clause.start, clause.end, "Bad placement of else clause in case");
				} else {
					return clause.children[1];
				}
			} else {
				for (var i = 0; i < clause.children[0]; i++) {
					var datum = clause.children[0].children[i];
					if (util.is_leaf(datum)) {
						throw util.make_church_error("SyntaxError", datum.start, datum.end, " for case");
					}
				}

				var next = case_helper(key, clauses.slice(1));
				var new_ast = {
					children: [
						{text: "if"},
						{
							children: [
								{text: "member"},
								key,
                {children: [{text: "list"}].concat(clause.children[0].children)}
								// {children: [{text: "list"}].concat(clause.children[0])}
							]
						},
						clause.children[1]
					]
				};
				if (next) {
					new_ast.children.push(next);
				}
				return new_ast;
			}
		}

		if (ast.children[0].text=="case") {
			if (ast.children.length < 3) {
				throw util.make_church_error("SyntaxError", ast.start, ast.end, "case is missing clauses");
			}
			return case_helper(ast.children[1], ast.children.slice(2));
		} else {
			return ast;
		}
	}

	function dsgr_cond(ast) {
		function cond_helper(clauses) {
			if (clauses.length == 0) {
				return undefined;
			}
			var clause = clauses[0];
			if (util.is_leaf(clause) || clause.children.length != 2) {
				throw util.make_church_error("SyntaxError", clause.start, clause.end, "Bad clause for cond");
			}
			if (clause.children[0].text=="else") {
				if (clauses.length > 1) {
					throw util.make_church_error("SyntaxError", clause.start, clause.end, "Bad placement of else clause in cond");
				} else {
					return clause.children[1];
				}
			} else {
				var next = cond_helper(
					clauses.slice(1));
				var new_ast = {
					children: [
						{text: "if"},
						clause.children[0],
						clause.children[1]
					]
				};
				if (next) {
					new_ast.children.push(next);
				}
				return new_ast;
			}
		}

		if (ast.children[0].text=="cond") {
			if (ast.children.length < 2) {
				throw util.make_church_error("SyntaxError", ast.start, ast.end, "cond is missing clauses");
			}
			return cond_helper(ast.children.slice(1));
		} else {
			return ast;
		}
	}

	function dsgr_query(ast) {
		// Makes the lambda that's passed to the query function
		function query_helper(statements, condition, args) {
			if (util.is_leaf(condition) ||
                (condition.children[0].text != "condition" && condition.children[0].text != "factor")) {
				condition = {
					children: [{text: "condition"}, condition],
					start: condition.start,
					end: condition.end
				};
			}
			args = args || {children: []};
			return {
				children: [
					{text: "lambda"},
					args
				].concat(statements.slice(0, -1)).concat(condition).concat(statements[statements.length-1])
			};
		}
		
		if (["rejection-query", "enumeration-query"].indexOf(ast.children[0].text) != -1) {
			if (ast.children.length < 3) {
				throw util.make_church_error("SyntaxError", ast.start, ast.end, ast.children[0].text + " has the wrong number of arguments");
			}
			return {
				children: [
					ast.children[0],
					query_helper(ast.children.slice(1, -1), ast.children[ast.children.length-1])
				],
				start: ast.start,
				end: ast.end
			};
		}
		if (["mh-query"].indexOf(ast.children[0].text) != -1) {
			if (ast.children.length < 6) {
				throw util.make_church_error("SyntaxError", ast.start, ast.end, ast.children[0].text + " has the wrong number of arguments");
			}
			return {
				children: [
					ast.children[0],
					query_helper(ast.children.slice(3, -1), ast.children[ast.children.length-1])
				].concat(ast.children.slice(1, 3)),
				start: ast.start,
				end: ast.end
			};
		}
		return ast;
	}

	function validate_if(ast) {
		if (ast.children[0].text=="if") {
			if (ast.children.length < 3 || ast.children.length > 4) {
				throw util.make_church_error("SyntaxError", ast.start, ast.end, "if has the wrong number of arguments");
			}
		}
		return ast;
	}
 
	function transform_equals_condition(ast) {
		function is_equals_conditionable(ast) {
			var equals_conditionable_erps = ["flip", "uniform", "gaussian"];
			return !util.is_leaf(ast) && ast.children[4] == undefined && equals_conditionable_erps.indexOf(ast.children[0].text) != -1;
		}

		function transform_erp(erp, conditioned_value) {
			[1,2,3].map(function(x) {erp.children[x] = erp.children[x] || {}});
			erp.children[4] = conditioned_value;
		}

		function try_transform(left, right) {
			if (left == undefined) return false;
			if (is_equals_conditionable(left)) {
				transform_erp(left, right);
				lambda_children.splice(i, 1, left);
				return true;
			} else if (util.is_leaf(left) && define_table[left.text]) {
				var left_entry = define_table[left.text];
				if (!util.is_identifier(right.text) || (
						define_table[right.text] && left_entry.index > define_table[right.text].index)) {
					transform_erp(left_entry.def, right);
					lambda_children.splice(i, 1);
					return true;
				}
			}
			return false;
		}

		var transformed;
		if (["rejection-query", "enumeration-query", "mh-query"].indexOf(ast.children[0].text) != -1) {			
			var define_table = {};
			// Assumes preprocessing through dsgr_query
			var lambda_children = ast.children[1].children
			var i = 0;
			for (var i = 2; i < lambda_children.length; i++) {
				if (!util.is_leaf(lambda_children[i])) {
					if (lambda_children[i].children[0].text == "define") {
						define_table[lambda_children[i].children[1].text] = {
							index: i,
							def: lambda_children[i].children[2]
						};
					} else if (lambda_children[i].children[0].text == "condition") {
						var condition = lambda_children[i].children[1];
						if (!util.is_leaf(condition) && condition.children[0].text == "=") {
							var left = condition.children[1];
							var right = condition.children[2];
							if (!try_transform(left, right)) try_transform(right, left);
						}
					}
					
				}
			}

		}
		return ast;
	}

	// Order is important, particularly desugaring quotes before anything else.
	var desugar_fns = [validate_leaves, dsgr_define, dsgr_lambda, dsgr_let, dsgr_case, dsgr_cond, dsgr_query, validate_if, transform_equals_condition];

	var ast = astify(tokens);
	// Special top-level check
	for (var i = 0; i < ast.children.length; i++) {
		assert_not_special_form(ast.children[i]);
	}
    ast = traverse(ast, dsgr_quote);
	for (var i = 0; i < desugar_fns.length; i++) {
		ast = traverse(ast, desugar_fns[i], isquote);
	}

	return ast;
}

function church_shallow_preconditions(ast) {
    return traverse(ast, transform_equals_condition, isquote)
}

module.exports =
{
    church_astify: church_astify,
    church_shallow_preconditions: church_shallow_preconditions
}
