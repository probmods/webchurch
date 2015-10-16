var trace = require("./trace")

/*
Wrapper around a function to memoize its results
*/
function mem(fn)
{
    if (typeof fn !== 'function' ) {
        throw new Error('mem requires a function')
    }
	var cache = {}
	return function()
	{
		var str = JSON.stringify(arguments)
		var val = cache[str]
		if (val === undefined)
		{
			val = fn.apply(this, arguments)
			cache[str] = val
		}
		return val
	}
}

module.exports = 
{
	mem: mem
}
