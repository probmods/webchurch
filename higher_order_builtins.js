var sample = "(define (sample fn) (apply fn '()))"

var repeat = "(define (repeat n fn) (if (> n 0) (pair (fn) (repeat (- n 1) fn)) ()))"

var map = "(define map (lambda x (let ((fn (first x)) (lists (rest x))) (if (null? (rest lists)) (if (null? (first lists)) () (pair (fn (first (first lists))) (map fn (rest (first lists))))) (if (apply or (map null? lists)) () (pair (apply fn (map first lists)) (apply map (pair fn (map rest lists)))))))))"

module.exports = {
	sample: sample,
	repeat: repeat,
	map: map
}