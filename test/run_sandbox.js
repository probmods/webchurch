// To be run from the webchurch directory

var evaluate = require('../evaluate.js').evaluate;
var format_result = require("../evaluate.js").format_result;

code = require('fs').readFileSync("./test/sandbox.church", "utf8");

result = format_result(evaluate(code));
console.log(result);
