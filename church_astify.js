function make_generic_node(head, children) {
	return {"head": head, "children": children};
}

function deep_copy(obj) { return JSON.parse(JSON.stringify(obj)); }

// TODO: add all kinds of error-checking.
function church_astify(expr) {
	function get_tokens(tree) { return expr.slice(tree["range"][0], tree["range"][1]); }

	function get_atom(tree) {
		var tokens = get_tokens(tree);
		if (tokens.length == 1) {
			return tokens[0];
		} else if (tokens.length == 2) {
			return "()";
		} else {
			throw new Error();
		}
	}

	function has_children(tree) { return tree["children"].length > 0}

	function literal_helper(tree) {
		if (has_children(tree)) {
			var result = [];
			for (var i = 0; i < tree["children"].length; i++) {
				result.push(literal_helper(tree["children"][i]));
			}
			return result
		} else {
			return get_atom(tree);
		}
	}

	function define_helper(trees) {
		var variable;
		var body;
		if (has_children(trees[0])) {
			var variable_and_formals = literal_helper(trees[0]);
			variable = variable_and_formals[0];
			body_children = [variable_and_formals.slice(1), main_helper([trees[1]])[0]]
			body = {"head": "lambda", "children": body_children};
		} else {
			variable = get_atom(trees[0]);
			body = main_helper([trees[1]])[0];
		}
		return [variable, body];
	}

	function lambda_helper(trees) {
		var args = trees[0];
		var procs = trees.slice(1);
		var children = [];
		children.push(literal_helper(args));
		children = children.concat(main_helper(procs));
		return children;
	}

	function call_helper(tree) {
		var node = {}
		var head;
		var first_child = tree["children"][0];
		var rest_children = tree["children"].slice(1);
		if (has_children(first_child)) {
			head = call_helper(first_child);
		} else {
			head = get_atom(first_child);
		}
		node["head"] = head;
		if (head == "define") {
			node["children"] = define_helper(rest_children);
		} else if (head == "lambda" || head == "lambda-query") {
			node["children"] = lambda_helper(rest_children);
		} else if (head == "'" || head == "quote") {
			console.log(head, "HI")
		} else {
			node["children"] = main_helper(rest_children);
		}
		return node;
	}

	function main_helper(trees) {
		var nodes = []
		for (var i = 0; i < trees.length; i++) {
			var tree = trees[i];
			if (has_children(tree)) {
				nodes.push(call_helper(tree));
			} else {
				nodes.push(get_atom(tree));
			}
		}
		return nodes;
	}

	function make_range_trees(expr) {
		function read_many_expressions(expr, start_index) {
			var children = [];
			var end_index = 0;
			while (end_index < expr.length && expr[end_index] != ")") {
				child = read_one_expression(expr.slice(end_index), start_index+end_index);
				children.push(child);
				end_index = end_index + child["range"][1] - child["range"][0];
			}
			return children;
		}

		function read_one_expression(expr, start_index) {
			var children = [];
			var end_index = 0;
			if (expr[end_index] == "(") {
				end_index++;
				children = read_many_expressions(expr.slice(end_index), start_index+end_index);
				if (children.length > 0) {
					end_index = end_index + children[children.length-1]["range"][1] - children[0]["range"][0] + 1;
				} else {
					end_index++;
				}
			} else if (expr[end_index] == "'") {
				end_index++;
				child = read_one_expression(expr.slice(end_index), start_index+end_index);
				children.push(child);
				end_index = end_index + child["range"][1] - child["range"][0];
			} else {
				end_index++;
			}
			return {"range" : [start_index, start_index+end_index], "children": children};
		}

		return read_many_expressions(expr, 0);
	}

	return main_helper(make_range_trees(expr));
}

exports.church_astify = church_astify;