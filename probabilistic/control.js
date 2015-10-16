
// Repeat a computation n times
function ntimes(times, block)
{
	for (var i = 0; i < times; i++)
	{
		block(i)
	}
}

// Invoke block until condition is true
function until(condition, block)
{
	var cond = condition()
	while (!cond)
	{
		block()
		cond = condition()
	}
}

// Evaluate proc a bunch of times and build a list out of the results
function repeat(times, proc)
{
	var arr = []
	for (var i = 0; i < times; i++)
		arr[i] = proc()
	return arr
}

module.exports = 
{
	ntimes: ntimes,
	until: until,
	repeat: repeat
}