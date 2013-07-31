function make_generic_node(head, children) {
	return {"head": head, "children": children};
}

function deep_copy(obj) { return JSON.parse(JSON.stringify(obj)); }

function convert_symbols(expr) {
	// First-pass attempt at recognizing the empty list.
	// result = []
	// for (var i = 0; i < expr.length; i++) {
	// 	if (expr[i] == "(" && expr[i+1] == ")") {
	// 		result = result.concat("()");
	// 		i++;
	// 	} else if (expr[i] == "'" && expr[i+1] == "(" && expr[i+2] == ")") {
	// 		result = result.concat("()");
	// 		i = i + 2;
	// 	} else {
	// 		result = result.concat(expr[i]);
	// 	}
	// }
	// return result;
	return expr;
}

// TODO: add all kinds of error-checking.
function church_astify(expr) {
	// Read tokens after a left parens has been opened in the normal context
	// Returns [node, number of tokens read]
	// TODO: Refactor / remove redundant code
	function call_helper(expr) {
		var node = {}
		var i = 0;
		if (expr[i] == "(") {
			var result = call_helper(expr.slice(i+1));
			node["head"] = result[0];
			i += result[1] + 2;
		} else {
			node["head"] = expr[i];
			i++;
		}
		if (node["head"] == "define") {
			var result = helper(expr.slice(i));
			node["children"] = result[0];
			i += result[1];
			// De-sugar special form
			// TODO: Should this be here or in a separate desugar stage?
			if (typeof(node["children"][0]) == "object") {
				lambda_node = {"head": "lambda",
							   "args": node["children"][0]["children"],
							   "children": node["children"].slice(1)};
				node["children"] = [node["children"][0]["head"], lambda_node];
			}
		} else if (node["head"] == "lambda" || node["head"] == "lambda-query") {
			var result = lambda_helper(expr.slice(i));
			node["args"] = result[0]["args"];
			node["children"] = result[0]["children"]
			i += result[1];
		} else if (node["head"] == "if") {
			var result = helper(expr.slice(i));
			node["cond"] = result[0][0];
			node["consq"] = result[0][1];
			node["alt"] = result[0][2];
			i += result[1];
		} else {
			var result = helper(expr.slice(i));
			node["children"] = result[0];
			i += result[1];
		}
		return [node, i];
	}

	// Read tokens after a lambda has been read
	function lambda_helper(expr) {
		var i = 0;
		var args;
		var children;
		// TODO: Handle arbitrary number of args
		if (expr[i] == "(") {
			args = [];
			for (i++; i < expr.length && expr[i] != ")"; i++) {
				args.push(expr[i]);
			}
			i++;
			result = helper(expr.slice(i));
			children = result[0];
			i += result[1];
		}
		return [{"args": args, "children": children}, i];
	}

	// Returns [node, number of tokens read]
	function helper(expr) {
		var nodes = []
		var i = 0;
		while (i < expr.length && expr[i] != ")") {
			if (expr[i] == "(") {
				result = call_helper(expr.slice(i+1));
				nodes.push(result[0]);
				i += result[1] + 2;
			} else {
				nodes.push(expr[i]);
				i++;
			}
		}
		return [nodes, i];
	}

	return helper(convert_symbols(expr))[0];
}

exports.church_astify = church_astify;