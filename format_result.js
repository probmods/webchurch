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

module.exports = {
	format_result: format_result
};