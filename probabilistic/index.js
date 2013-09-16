var trace = require("./trace")
var erp = require("./erp")
var control = require("./control")
var inference = require("./inference")
var memoize = require("./memoize")
var marginalize = require("./marginalize")

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

/*
Since source transformation induces dependencies on esprima and escodegen,
and since not everyone will need/want to use it, the index does not forward
the exports from transport. Include transport directly if you want those
features (or call transport from the command line to transfom files directly)
*/