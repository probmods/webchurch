var util = require("./util")
util.openModule(util)
var pr = require("./index")
util.openModule(pr)

var samples = 150
var lag = 20
var runs = 5
var errorTolerance = 0.07

function test(name, estimates, trueExpectation, tolerance)
{
	tolerance = (tolerance === undefined ? errorTolerance : tolerance)
	process.stdout.write("test: " + name + "...")
	var errors = estimates.map(function(est) { return Math.abs(est - trueExpectation) })
	var meanAbsError = mean(errors)
	if (meanAbsError > tolerance)
		console.log("failed! True mean: " + trueExpectation + " | Test mean: " + mean(estimates))
	else
		console.log("passed.")
}

function mhtest(name, computation, trueExpectation, tolerance)
{
	tolerance = (tolerance === undefined ? errorTolerance : tolerance)
	//test(name, repeat(runs, function() { return expectation(computation, traceMH, samples, lag) }), trueExpectation, tolerance)
	test(name, repeat(runs, function() { return expectation(computation, LARJMH, samples, 0, undefined, lag) }), trueExpectation, tolerance)
}

function larjtest(name, computation, trueExpectation, tolerance)
{
	tolerance = (tolerance === undefined ? errorTolerance : tolerance)
	test(name, repeat(runs, function() { return expectation(computation, LARJMH, samples, 10, undefined, lag) }), trueExpectation, tolerance)
}

function eqtest(name, estvalues, truevalues, tolerance)
{
	tolerance = (tolerance === undefined ? errorTolerance : tolerance)
	process.stdout.write("test: " + name + "...")
	if (estvalues.length !== truevalues.length) throw new Error("lengths must be equal!")
	for (var i = 0; i < estvalues.length; i++)
	{
		var estv = estvalues[i]
		var truev = truevalues[i]
		if (Math.abs(estv - truev) > tolerance)
		{
			console.log("failed! True value: " + truev + " | Test value: " + estv)
			return
		}
	}
	console.log("passed.")
}

///////////////////////////////////////////////////////////////////////////////

var d1 = new Date()

console.log("starting tests...")

/*
ERP Tests
*/

test(
	"flip sample",
	repeat(runs, function() { return mean(repeat(samples, function() { return flip(0.7) }))}),
	0.7)

mhtest(
	"flip query",
	prob(function() { return flip(0.7) }),
	0.7)

test(
	"uniform sample",
	repeat(runs, function() { return mean(repeat(samples, function() { return uniform(0.1, 0.4) }))}),
	0.5*(.1+.4))

mhtest(
	"uniform query",
	prob(function() { return uniform(0.1, 0.4) }),
	0.5*(.1+.4))

test(
	"multinomial sample",
	repeat(runs, function() { return mean(repeat(samples, function() { return multinomialDraw([.2, .3, .4], [.2, .6, .2]) }))}),
	0.2*.2 + 0.6*.3 + 0.2*.4)

mhtest(
	"multinomial query",
	prob(function() { return multinomialDraw([.2, .3, .4], [.2, .6, .2]) }),
	0.2*.2 + 0.6*.3 + 0.2*.4)

eqtest(
	"multinomial lp",
	[
		multinomial_logprob(0, [.2, .6, .2]),
		multinomial_logprob(1, [.2, .6, .2]),
		multinomial_logprob(2, [.2, .6, .2])
	],
	[Math.log(0.2), Math.log(0.6), Math.log(0.2)])

test(
	"gaussian sample",
	repeat(runs, function() { return mean(repeat(samples, function() { return gaussian(0.1, 0.5) }))}),
	0.1)

mhtest(
	"gaussian query",
	prob(function() { return gaussian(0.1, 0.5) }),
	0.1)

eqtest(
	"gaussian lp",
	[
		gaussian_logprob(0, 0.1, 0.5),
		gaussian_logprob(0.25, 0.1, 0.5),
		gaussian_logprob(0.6, 0.1, 0.5)
	],
	[-0.2457913526447274, -0.27079135264472737, -0.7257913526447274])

test(
	"gamma sample",
	repeat(runs, function() { return mean(repeat(samples, function() { return gamma(2, 2)/10 }))}),
	0.4)

mhtest(
	"gamma query",
	prob(function() { return gamma(2, 2)/10 }),
	0.4)

eqtest(
	"gamma lp",
	[
		gamma_logprob(1, 2, 2),
		gamma_logprob(4, 2, 2),
		gamma_logprob(8, 2, 2)
	],
	[-1.8862944092546166, -2.000000048134726, -3.306852867574781])

test(
	"beta sample",
	repeat(runs, function() { return mean(repeat(samples, function() { return beta(2, 5) }))}),
	2.0/(2+5))

mhtest(
	"beta query",
	prob(function() { return beta(2, 5) }),
	2.0/(2+5))

eqtest(
	"beta lp",
	[
		beta_logprob(.1, 2, 5),
		beta_logprob(.2, 2, 5),
		beta_logprob(.6, 2, 5)
	],
	[0.677170196389683, 0.899185234324094, -0.7747911992475776])

test(
	"binomial sample",
	repeat(runs, function() { return mean(repeat(samples, function() { return binomial(.5, 40)/40 }))}),
	0.5)

mhtest(
	"binomial query",
	prob(function() { return binomial(.5, 40)/40 }),
	0.5)

eqtest(
	"binomial lp",
	[
		binomial_logprob(15, .5, 40),
		binomial_logprob(20, .5, 40),
		binomial_logprob(30, .5, 40)
	],
	[-3.3234338674089985, -2.0722579911387817, -7.2840211276953575])

test(
	"poisson sample",
	repeat(runs, function() { return mean(repeat(samples, function() { return poisson(4)/10 }))}),
	0.4)

mhtest(
	"poisson query",
	prob(function() { return poisson(4)/10 }),
	0.4)

eqtest(
	"poisson lp",
	[
		poisson_logprob(2, 4),
		poisson_logprob(5, 4),
		poisson_logprob(7, 4)
	],
	[-1.9205584583201643, -1.8560199371825927, -2.821100833226181])


/*
Tests adapted from Church
*/

mhtest(
	"setting a flip",
	prob(function()
	{
		var a = 1/1000
		condition(flip(a))
		return a
	}),
	1/1000,
	0.000000000000001)

mhtest(
	"and conditioned on or",
	prob(function()
	{
		var a = flip()
		var b = flip()
		condition(a || b)
		return (a && b)
	}),
	1/3)

mhtest(
	"and conditioned on or, biased flip",
	prob(function()
	{
		var a = flip(0.3)
		var b = flip(0.3)
		condition(a || b)
		return (a && b)
	}),
	(0.3*0.3) / (0.3*0.3 + 0.7*0.3 + 0.3*0.7))

mhtest(
	"contitioned flip",
	prob(function()
	{
		var bitflip = prob(function (fidelity, x)
		{
			return flip(x ? fidelity : 1-fidelity)
		})
		var hyp = flip(0.7)
		condition(bitflip(0.8, hyp))
		return hyp
	}),
	(0.7*0.8) / (0.7*0.8 + 0.3*0.2))

mhtest(
	"random 'if' with random branches, unconditioned",
	prob(function()
	{
		if (flip(0.7))
			return flip(0.2)
		else
			return flip(0.8)
	}),
	0.7*0.2 + 0.3*0.8)

mhtest(
	"flip with random weight, unconditioned",
	prob(function()
	{
		return flip(flip(0.7) ? 0.2 : 0.8)
	}),
	0.7*0.2 + 0.3*0.8)

mhtest(
	"random procedure application, unconditioned",
	prob(function()
	{
		var proc = prob(flip(0.7) ?
			function (x) { return flip(0.2) } :
			function (x) { return flip(0.8) })
		return proc(1)
	}),
	0.7*0.2 + 0.3*0.8)

mhtest(
	"conditioned multinomial",
	prob(function()
	{
		var hyp = multinomialDraw(['b', 'c', 'd'], [0.1, 0.6, 0.3])
		var observe = prob(function (x)
		{
			if (flip(0.8))
				return x
			else
				return 'b'
		})
		condition(observe(hyp) == 'b')
		return (hyp == 'b')
	}),
	0.357)

mhtest(
	"recursive stochastic fn, unconditioned (tail recursive)",
	prob(function()
	{
		var powerLaw = prob(function (p, x)
		{
			if (flip(p, true))
				return x
			else
				return powerLaw(p, x+1)
		})
		var a = powerLaw(0.3, 1)
		return a < 5
	}),
	0.7599)

mhtest(
	"recursive stochastic fn, unconditioned",
	prob(function()
	{
		var powerLaw = prob(function (p, x)
		{
			if (flip(p, true))
				return x
			else
				return 0 + powerLaw(p, x+1)
		})
		var a = powerLaw(0.3, 1)
		return a < 5
	}),
	0.7599)

mhtest(
	"memoized flip, unconditioned",
	prob(function()
	{
		var proc = mem(prob(function (x) { return flip(0.8) }))
		var p11 = proc(1)
		var p21 = proc(2)
		var p12 = proc(1)
		var p22 = proc(2)
		return p11 && p21 && p12 && p22
	}),
	0.64)

mhtest(
	"memoized flip, conditioned",
	prob(function()
	{
		var proc = mem(prob(function (x) { return flip(0.2) }))
		var p11 = proc(1)
		var p21 = proc(2)
		var p22 = proc(2)
		var p23 = proc(2)
		condition(p11 || p21 || p22 || p23)
		return proc(1)
	}),
	0.5555555555555555)

mhtest(
	"bound symbol used inside memoizer, unconditioned",
	prob(function()
	{
		var a = flip(0.8)
		var proc = mem(prob(function (x) { return a }))
		var p11 = proc(1)
		var p12 = proc(1)
		return p11 && p12
	}),
	0.8)

mhtest(
	"memoized flip with random argument, unconditioned",
	prob(function()
	{
		var proc = mem(prob(function (x) { return flip(0.8) }))
		var p1 = proc(uniformDraw([1,2,3], true))
		var p2 = proc(uniformDraw([1,2,3], true))
		return p1 && p2
	}),
	0.6933333333333334)

mhtest(
	"memoized random procedure, unconditioned",
	prob(function()
	{
		var proc = flip(0.7) ?
					prob(function (x) { return flip(0.2)}) :
					prob(function (x) { return flip(0.8)})
		var memproc = mem(proc)
		var mp1 = memproc(1)
		var mp2 = memproc(2)
		return mp1 && mp2
	}),
	0.22)

mhtest(
	"mh-query over rejection query for conditioned flip",
	prob(function()
	{
		var bitflip = prob(function (fidelity, x)
		{
			return flip(x ? fidelity : 1-fidelity)
		})
		var innerQuery = prob(function()
		{
			var a = flip(0.7)
			condition(bitflip(0.8, a))
			return a
		})
		return rejectionSample(innerQuery)
	}),
	0.903225806451613)

mhtest(
	"trans-dimensional",
	prob(function()
	{
		var a = flip(0.9, true) ? beta(1, 5) : 0.7
		var b = flip(a)
		condition(b)
		return a
	}),
	0.417)

larjtest(
	"trans-dimensional (LARJ)",
	prob(function()
	{
		var a = flip(0.9, true) ? beta(1, 5) : 0.7
		var b = flip(a)
		condition(b)
		return a
	}),
	0.417)

mhtest(
	"memoized flip in if branch (create/destroy memprocs), unconditioned",
	prob(function()
	{
		var a = flip() ? mem(flip) : mem(flip)
		var b = a()
		return b
	}),
	0.5)


/*
Tests for things specific to new implementation
*/


mhtest(
	"native loop",
	prob(function()
	{
		var accum = 0
		for (var i = 0; i < 4; i++)
			accum += flip()
		return accum/4
	}),
	0.5)

mhtest(
	"directly conditioning variable values",
	prob(function()
	{
		var accum = 0
		for (var i = 0; i < 10; i++)
		{
			if (i < 5)
				accum += flip(0.5, false, 1)
			else
				accum += flip(0.5)
		}
		return accum / 10
	}),
	0.75)


console.log("tests done!")

var d2 = new Date()
console.log("time: " + (d2.getTime() - d1.getTime()) / 1000)