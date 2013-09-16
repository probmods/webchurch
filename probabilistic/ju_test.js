var util = require("./util")
util.openModule(util)
var pr = require("./index")
util.openModule(pr)
var transform = require("./transform")

code = "flip(0.5);"

code = transform.probTransform(code);

console.log("RESULT:\n");
console.log(eval(code));