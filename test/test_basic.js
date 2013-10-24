/* global console, require */

var log = function() {
  var array = Array.prototype.slice.call(arguments, 0);
  array.forEach(function(x) {
    console.log(x);
  }); 
};

// make a string appear red in terminal
// HT http://stackoverflow.com/a/17524301/351392
var red = function(str) {
  return "\033[31m" + str + ":\033[91m";
};

var evaluate = require("../evaluate.js").evaluate;
var church_builtins = require("../church_builtins.js");

var tests = [
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
    ["((lambda (x . y) y) '(1 2 3))", "(1 2 3)"],

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
	["(cond (#f 1) (#f 2) (else 3))", 3],
  // variadic
  ["(define (f . x) x) (f 1 2 3)", "(1 2 3)"],
  ["(apply + (repeat 123 (lambda () (apply + (repeat 1000 (lambda () 1))))))", 123000],
  ["(map (lambda (x y) (* x y)) '(1 2 3 4) '(5 6 7 8 9))", "(5 12 21 32)"],
  // flip a coin 1000 times, make sure it comes up heads fewer than 600
  ["(< (apply + (map (lambda (x) (if x 1 0)) (repeat 1000 flip))) 600)", "#t"],
  ["(> (* (gaussian 0 1) (gaussian 0 1) ) -1000)", "#t"],
  ["(define f (mem (lambda (x) (gaussian 0 1)))) (= (f 'a) (f 'a))", "#t"],
  ["(define make-coin (lambda (weight) (lambda () (flip weight)))) (define coin (make-coin 0.8)) (define data (repeat 1000 (lambda () (sum (map (lambda (x) (if x 1 0)) (repeat 10 coin)))))) (> (mean data) 0.79)", "#t"],
  ["(define (f) (define lung-cancer (flip 0.01)) (define cold (flip 0.2)) (define cough (or cold lung-cancer)) (if cough 1 0)) (> (apply + (repeat 10000 f)) 2000)", "#t"]
  
];

for (var i = 0; i < tests.length; i++) {
	var churchCode = tests[i][0],
      expectedResult = tests[i][1],
      result;
	
	try {
		result = evaluate(tests[i][0]);
	} catch(err) {
		result = err.message;
	}
	if (result != expectedResult) {
    

		log(red("Code"),
        churchCode,
        "",
        red("Got"),
        expectedResult,
        "", 
        red("Expected"),
        result,
        "");
	} 
}
