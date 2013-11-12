// To be run from the webchurch directory

var evaluate = require('../evaluate.js').evaluate;
var format_result = require("../evaluate.js").format_result;

var numargs = process.argv.length
if (numargs > 2) {
    var srcfile = process.argv[2]
} else {
    var srcfile = "./test/sandbox.church"
}

code = require('fs').readFileSync(srcfile, "utf8");

result = format_result(evaluate(code));
console.log(result);
