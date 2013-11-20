/* global console, require */

var log = function() {
  var array = Array.prototype.slice.call(arguments, 0);
  array.forEach(function(x) {
    console.log(x);
  }); 
};

var pc = process.argv.some(function(x){return x.match(/-pc/)})

//console.log("pc",pc)

log("Webchurch basic tests");

// make a string appear red in terminal
// HT http://stackoverflow.com/a/17524301/351392
var red = function(str) {
  return "\033[31m" + str + ":\033[91m";
};

var evaluate = require("../evaluate.js").evaluate;
var church_builtins = require("../church_builtins.js");
var format_result = require("../evaluate.js").format_result;

var tests = [
	["()", "()"],

	["(+ 1 1)", 2],
	["(+ (* 2 3) 1)", 7],

	["'()", "()"],
	["'abc", "abc"],
	["'(1 2 3)", "(1 2 3)"],
	["''a", "(quote a)"],
  
  ["(first '(1 2 3 4 5 6 7 8))", "1"],
  ["(second '(1 2 3 4 5 6 7 8))", "2"],
  ["(third '(1 2 3 4 5 6 7 8))", "3"],
  ["(fourth '(1 2 3 4 5 6 7 8))", "4"],
  ["(fifth '(1 2 3 4 5 6 7 8))", "5"],
  ["(sixth '(1 2 3 4 5 6 7 8))", "6"],
  ["(seventh '(1 2 3 4 5 6 7 8))", "7"],
  ["(list? (repeat 123456 (lambda () 1)))", "#t"], // make sure list? is iterative
  ["(list? (pair (repeat 12345 (lambda () 1)) 'a))", "#f"],
  
	["((lambda () 1))", 1],
	["((lambda (x) x) 1)", 1],
	["((lambda (x y) (+ x y)) 1 2)", 3],
	["((lambda () (define foo 1) foo) 1)", 1],
	["((lambda x (sum x)) 1 2 3)", 6],
    ["(and ((lambda () true)) ((lambda () true)))", "#t"],

	["(let ((x 1) (y 2)) (+ x y))", 3],

	["(define x 1) x", 1],
	["(define (f) 1) (f)", 1],
	["(define (f x) x) (f 1)", 1],
	["(define (f x y) (* x y)) (f 2 3)", 6],
	["(define f (lambda (x) x)) (f 1)", 1],
	["(define (f . x) x) (f 1 2 3)", "(1 2 3)"],

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
  ["(fold and #t '(#t #t #f))", "#f"],
  ["(fold pair '() '(1 2 3))", "(3 2 1)"],
  ["(fold + 0 '(1 2 3) '(2 4 6))", 18],
  // flip a coin 1000 times, make sure it comes up heads fewer than 600
  ["(< (apply + (map (lambda (x) (if x 1 0)) (repeat 1000 flip))) 600)", "#t"],
  ["(> (* (gaussian 0 1) (gaussian 0 1) ) -1000)", "#t"],
  ["(define f (mem (lambda (x) (gaussian 0 1)))) (= (f 'a) (f 'a))", "#t"],
  ["(define make-coin (lambda (weight) (lambda () (flip weight)))) (define coin (make-coin 0.8)) (define data (repeat 1000 (lambda () (sum (map (lambda (x) (if x 1 0)) (repeat 10 coin)))))) (> (mean data) 0.79)", "#t"],
  ["(define (f) (define lung-cancer (flip 0.01)) (define cold (flip 0.2)) (define cough (or cold lung-cancer)) (if cough 1 0)) (> (apply + (repeat 20000 f)) 2000)", "#t"],
  
// generative models problem 1
["\
(define p1\
  (second\
   (second\
    (enumeration-query\
     (define x (if (flip) (flip 0.7) (flip 0.1)))\
     x\
     true))))\
\
(define p2\
  (second\
   (second\
    (enumeration-query\
     (define x (flip (if (flip) 0.7 0.1)))\
     x\
     true))))\
\
(define p3\
  (second\
   (second\
    (enumeration-query\
     (define x (flip 0.4))\
     x\
     true))))\
\
(and (= p1 p2)\
     (< (- (abs p2 p3)) 0.0000001))\
   ","#t"],
// generative models problem 4
[
"(define (make-coin weight) (lambda () (if (flip weight) 'h 't)))\
(define (bend coin)\
  (lambda () (if (equal? (coin) 'h)\
                 ( (make-coin 0.7) )\
                 ( (make-coin 0.1) ) )))\
\
(define fair-coin (make-coin 0.5))\
(define bent-coin (bend fair-coin))\
\
(> (mean \
 (map (lambda (x) (if (equal? x 'h) 1 0)) (repeat 10000 bent-coin))) 0.38)\
","#t"],
  [
    "(define (foo) (rejection-query (define A (if (flip) 1 0)) (define B (if (flip) 1 0)) (define C (if (flip) 1 0)) (define D (+ A B C)) A  (condition (equal? D 2)))) (> (mean (repeat 5000 foo)) 0.65)",
    "#t"
  ],
  [
"(define samples\
  (mh-query\
   2000 20\
   (define A (if (flip) 1 0))\
   (define B (if (flip) 1 0))\
   (define C (if (flip) 1 0))\
   A\
   (condition (>= (+ A B C) 2))))\
(< (abs (- 0.75 (mean samples))) 0.1)","#t"
  ],
[
"(define samples\
  (mh-query\
   500 5\
    (define strength (mem (lambda (person) (if (flip) 5 10))))\
    (define lazy (lambda (person) (flip (/ 1 3))))\
    (define (total-pulling team)\
      (sum\
         (map\
          (lambda (person) (if (lazy person) (/ (strength person) 2) (strength person)))\
          team)))\
    (define (winner team1 team2)\
      (if (> (total-pulling team1) (total-pulling team2)) 'team1 'team2))\
    (strength 'bob)\
    (and (eq? 'team1 (winner '(bob mary) '(tom sue)))\
         (eq? 'team1 (winner '(bob sue) '(tom jim))))))\
(< (abs (- 9.18 (mean samples))) 0.5)",
  "#t"
],
  ["(define letters '(a b c d e f g h i j k l m n o p q r s t u v w x y z) ) (define (vowel? letter) (if (member letter '(a e i o u y)) #t #f)) (define letter-probabilities (map (lambda (letter) (if (vowel? letter) 0.01 0.047)) letters)) (define (my-list-index needle haystack counter) (if (null? haystack) 'error (if (equal? needle (first haystack)) counter (my-list-index needle (rest haystack) (+ 1 counter))))) (define (get-position letter) (my-list-index letter letters 1)) (define dist (enumeration-query (define my-letter (multinomial letters letter-probabilities)) (define my-position (get-position my-letter)) (define my-win-probability (/ 1.0 (* my-position my-position))) (define win? (flip my-win-probability)) my-letter (flip my-win-probability))) (< (- 0.2755 (abs (first (second dist)))) 0.01)","#t"]
];

var numPassed = 0,
    numTests = tests.length;

for (var i = 0; i < tests.length; i++) {
	var churchCode = tests[i][0],
      expectedResult = tests[i][1],
      result;
	
	try {
//        console.log("running: ", churchCode)
		result = format_result(evaluate(tests[i][0],pc));
	} catch(err) {
		result = err.message;
	}
	if (result != expectedResult) {
		log("Fail #" + i, 
        red("Code"),
        churchCode,
        "",
        red("Got"),
        result,
        "", 
        red("Expected"),
        expectedResult,
        "");
	} else {
    process.stdout.write(".");
    numPassed++;
  }

}

var allPassed = (numPassed == numTests);

log("",
    "Passed " + numPassed + " / " + numTests + " tests",
    allPassed ? "Good" : "Bad" );

process.exit(allPassed ? 0 : 1);
