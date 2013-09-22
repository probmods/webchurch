function make_generic_node(head, children) {
	return {"head": head, "children": children};
}

function deep_copy(obj) { return JSON.parse(JSON.stringify(obj)); }

// TODO: add all kinds of error-checking.
function church_astify(expr) {
	// Destroys the passed expression
	function astify_expr(expr) {
		function helper(top_level) {
			var result = []
			while (expr.length > 0) {
				if (expr[0] == "(") {
					expr.shift()
					result.push(helper(false));
				} else if (expr[0] == ")") {
					if (top_level) {
						throw new Error("Unexpected close parens");
					} else {
						expr.shift();
						return result;
					}
				} else {
					result.push(expr.shift());
				}
			}
			if (top_level) {
				return result;
			} else {
				throw new Error("Unclosed parens");
			}
		}
		return helper(true);
	}

	function traverse(ast, fn) {
		ast = fn(ast);
		for (var i = 0; i < ast.length; i++) {
			if (Array.isArray(ast[i])) {
				ast[i] = traverse(ast[i], fn);
			}
		}
		return ast;
	}

	function dsgr_define(ast) {
		if (ast[0] == "define" && Array.isArray(ast[1])) {
			var lambda = ["lambda", ast[1].slice(1)].concat(ast.slice(2));
			return ["define", ast[1][0], lambda];
		} else {
			return ast;
		}
	}

	function dsgr_let(ast) {
		if (ast[0] == "let") {
			return [["lambda", ast[1].map(function(x) {return x[0]}), ast[2]]].concat(
				ast[1].map(function(x) {return x[1]}));
		} else {
			return ast;
		}
	}

	function dsgr_quote(ast) {
		for (var i = ast.length - 2; i >= 0; i--) {
			if (ast[i] == "'") {
				ast.splice(i, 2, ["quote", ast[i+1]]);
			}
		}
		return ast;
	}

	function dsgr_case(ast) {
		function case_helper(key, clauses) {
			if (clauses.length == 0) {
				return [];
			} else {
				if (clauses[0][0] == "else") {
					return clauses[0][1];
				} else {
					return ["if", ["member", key, ["list"].concat(clauses[0][0])], clauses[0][1], case_helper(key, clauses.slice(1))];
				}
			}
		}

		if (ast[0] == "case") {
			return case_helper(ast[1], ast.slice(2));
		} else {
			return ast;
		}
	}

	function dsgr_query(ast) {
		if (["query", "mh-query", "rejection-query", "exact-query"].indexOf(ast[0]) != -1) {
			var cond = ast[ast.length - 1]
			if (!Array.isArray(cond) || cond[0] != "condition") {
				ast[ast.length - 1] = ["condition", cond];
			}
		}
		return ast;
	}
 
	// Order is important, particularly desugaring quotes before anything else.
	var desugar_fns = [dsgr_quote, dsgr_define, dsgr_let, dsgr_case, dsgr_query];

	var ast = astify_expr(expr);
	for (var i = 0; i < desugar_fns.length; i++) {
		ast = traverse(ast, desugar_fns[i]);
	}

	return ast;
}

exports.church_astify = church_astify;