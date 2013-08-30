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
			return ast
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

	var desugar_fns = [dsgr_define, dsgr_quote];

	var ast = astify_expr(expr);
	for (var i = 0; i < desugar_fns.length; i++) {
		ast = traverse(ast, desugar_fns[i]);
	}

	return ast;
}

exports.church_astify = church_astify;