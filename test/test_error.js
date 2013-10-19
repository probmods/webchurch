var evaluate = require("../evaluate.js").evaluate;
var church_builtins = require("../church_builtins.js");

tests = [
	["\"unclosed", "1:1-1:1: Unclosed double quote"],
	["(", "1:1-1:1: Unclosed parens"],
	[" ( ", "1:2-1:2: Unclosed parens"],
	["(define x)", "1:1-1:10: Invalid define"],
	["define x 1", "1:1-1:6: Special form define cannot be used as an atom"],

	["(rejection-query true)", "1:1-1:22: rejection-query has the wrong number of arguments"]

]

for (var i = 0; i < tests.length; i++) {
	try {
		evaluate(tests[i][0]);
	} catch(err) {
		if (err.message != tests[i][1]) {
			console.log("Failed:\n" +
						tests[i][0] +
						"\n\nGot:\n" +
						err.message
						 +
						"\n\nExpected:\n" +
						tests[i][1] +
						"\n\n******\n");
	}
	

	}
}