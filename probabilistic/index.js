var trace = require("./trace")
var erp = require("./erp")
var control = require("./control")
var inference = require("./inference")
var memoize = require("./memoize")
var marginalize = require("./marginalize")
var transform = require("./transform")

module.exports = {}

// Forward trace exports
for (var prop in trace)
	module.exports[prop] = trace[prop]

// Forward erp exports
for (var prop in erp)
	module.exports[prop] = erp[prop]

// Forward control exports
for (var prop in control)
	module.exports[prop] = control[prop]

// Forward inference exports
for (var prop in inference)
	module.exports[prop] = inference[prop]

// Forward memoize exports
for (var prop in memoize)
	module.exports[prop] = memoize[prop]

// Forward marginalize exports
for (var prop in marginalize)
    module.exports[prop] = marginalize[prop]

// Forward transform exports
for (var prop in transform)
	module.exports[prop] = transform[prop]

//// We also forward 'openModule' from util.js,
//// b/c this makes source transformation easier.
var util = require("./util")
module.exports["openModule"] = util.openModule