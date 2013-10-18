var evaluate = require("../evaluate.js").evaluate;
var church_builtins = require("../church_builtins.js");

tests = [
	["()", "()"],

	["(+ 1 1)", 2],
	["(+ (* 2 3) 1)", 7],

	["'()", "()"],
	["'abc", "abc"],
	["'(1 2 3)", "(1 2 3)"],
	["''a", "(quote a)"],

	["((lambda () 1))", 1],
	["((lambda (x) x) 1)", 1],
	["((lambda (x y) (+ x y)) 1 2)", 3],
	["((lambda () (define foo 1) foo) 1)", 1],
	["((lambda x (sum x)) 1 2 3)", 6],

	["(define x 1) x", 1],
	["(define (f) 1) (f)", 1],
	["(define (f x) x) (f 1)", 1],
	["(define (f x y) (* x y)) (f 2 3)", 6],
	["(define f (lambda (x) x)) (f 1)", 1],

	["(if #t 1)", 1],
	["(if #t 1 2)", 1],
	["(if #f 1 2)", 2],

	["(case #t ((#t) 1))", 1],
	["(case #t ((#f) 1))", "undefined"],
	["(case #t ((#f) 1) ((#t) 2) (else 3))", 2],
	["(case #t ((#f) 1) (else 2))", 2],

	["(cond (#t 1))", 1],
	["(cond (#f 1) (#t 2))", 2],
	["(cond (#f 1) (#f 2) (else 3))", 3]
]

for (var i = 0; i < tests.length; i++) {
	var result;
	
	try {
		result = evaluate(tests[i][0]);
	} catch(err) {
		result = "EVAL ERROR"
	}
	if (result != tests[i][1]) {
		console.log("Failed:\n" +
					tests[i][0] +
					"\n\nGot:\n" +
					result +
					"\n\nExpected:\n" +
					tests[i][1] +
					"\n\n******\n");
	}
	
}