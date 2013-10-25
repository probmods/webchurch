// To be run from the webchurch directory

var evaluate = require('../evaluate.js').evaluate;

code = require('fs').readFileSync("./test/sandbox.church", "utf8");

result = evaluate(code);
console.log(result);