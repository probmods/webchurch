function make_generic_node(head, children) {
	return {"head": head, "children": children};
}

var church_special_forms = ["quote", "if", "set!", "define", "lambda", "begin"]

// TODO: add all kinds of error-checking.
function church_astify(expr) {
	// Read tokens after a left parens has been opened in the normal context
	// Returns [node, number of tokens read]
	function call_helper(expr) {
		var node = {}
		var i = 0;
		if (expr[i] == "(") {
			var result = call_helper(expr.slice(i+1));
			node["head"] = make_generic_node(result[0][0], result[0].slice(1));
			i += result[1] + 2;
		} else {
			node["head"] = expr[i];
			i++;
		}
		if (node["head"] == "lambda") {
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
	return helper(expr)[0];
}

exports.church_astify = church_astify;