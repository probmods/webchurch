var delimiters = ["(", ")", "'", "\""]
var whitespace_re = /^\s/

function tokenize(s) {
	tokens = [];
	var begin = 0;
	var end = 0;
	while (begin < s.length) {
		if (s[begin].match(whitespace_re)) {
			begin++;
		} else {
			if (s[begin] == "\"") {
				for (end = begin + 1; ; end++) {
					if (end > s.length) {
						throw new Error("Unclosed double quote");
					} else if (s.slice(end, end + 2) == "\\\"") {
						end++;
					} else if (s[end] == "\"") {
						end++;
						break;
					}
				}
			} else if (delimiters.indexOf(s[begin]) != -1) {
				end = begin + 1;
			} else {
				for (end = begin; end < s.length; end++) {
					if (delimiters.indexOf(s[end]) != -1 || s[end].match(whitespace_re)) {
						break;
					}
				}
			}
			tokens.push(s.slice(begin, end));
			begin = end;
		}
	}
	return tokens;
}

exports.tokenize = tokenize;