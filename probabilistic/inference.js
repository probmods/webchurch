var trace = require("./trace")
var util = require("./util")

/*
Compute the discrete distribution over the given computation
Only appropriate for computations that return a discrete value
(Variadic arguments are arguments to the sampling function)
*/
function distrib(computation, samplingFn)
{
	var args = Array.prototype.slice.apply(arguments)
	var hist = {}
	var samps = samplingFn.apply(this, [computation].concat(args.slice(2)))
	for (var i = 0; i < samps.length; i++)
	{
		var stringrep = JSON.stringify(samps[i].sample)
		var prevval = hist[stringrep] || 0
		hist[stringrep] = prevval + 1
	}
	for (var s in hist)
		hist[s] /= samps.length
	return hist
}

/*
Compute the mean of a set of values
*/
function mean(values)
{
	var m = values[0]
	var n = values.length
	for (var i = 1; i < n; i++)
		m += values[i]
	return m / n
}

/*
Compute the expected value of a computation
Only appropraite for computations whose return value is a number
*/
function expectation(computation, samplingFn)
{
	var args = Array.prototype.slice.apply(arguments)
	var samps = samplingFn.apply(this, [computation].concat(args.slice(2)))
	return mean(samps.map(function(s) { return s.sample }))
}

/*
Maximum a posteriori inference (returns the highest probability sample)
*/
function MAP(computation, samplingFn)
{
	var args = Array.prototype.slice.apply(arguments)
	var samps = samplingFn.apply(this, [computation].concat(args.slice(2)))
	var maxelem = {sample: null, logprob: -Infinity}
	var s = null
	for (var i = 0; i < samps.length; i++)
	{
		s = samps[i]
		if (s.logprob > maxelem.logprob)
			maxelem = s
	}
	return maxelem.sample
}

/*
Rejection sample a result from computation that satisfies all
conditioning expressions.
Note: doesn't work when there are conditionedValue ERPs
*/
function rejectionSample(computation)
{
	var tr = trace.newTrace(computation)
	return tr.returnValue
}

//same but return a bunch of samples in data structure that matches traceMH
function bunchaRejectionSample(computation, numsamps)
{
    var samps = []
    
    for(i=0;i<numsamps;i++)
    {
        var tr = trace.newTrace(computation)
        samps.push({sample: tr.returnValue, logprob: tr.logprob})
    }
	
	return samps
}


/*
MCMC transition kernel that takes random walks by tweaking a
single variable at a time
*/
function RandomWalkKernel(structural, nonstructural)
{
	structural = (structural == undefined ? true : structural)
	nonstructural = (nonstructural == undefined ? true : nonstructural)
	this.structural = structural
	this.nonstructural = nonstructural
	this.proposalsMade = 0
	this.proposalsAccepted = 0
}

RandomWalkKernel.prototype.next = function RandomWalk_next(currTrace)
{
	this.proposalsMade += 1
	var name = util.randomChoice(currTrace.freeVarNames(this.structural, this.nonstructural))

	/*
	If we have no free random variables, then just run the computation
	and generate another sample (this may not actually be deterministic,
	in the case of nested query)
	*/
	if (!name)
	{
		currTrace.traceUpdate(!this.structural)
		return currTrace
	}
	/*
	Otherwise, make a proposal for a randomly-chosen variable, probabilistically
	accept it
	*/
	else
	{
		var retval = currTrace.proposeChange(name, !this.structural)
		var nextTrace = retval[0]; var fwdPropLP = retval[1]; var rvsPropLP = retval[2]
		fwdPropLP -= Math.log(currTrace.freeVarNames(this.structural, this.nonstructural).length)
		rvsPropLP -= Math.log(nextTrace.freeVarNames(this.structural, this.nonstructural).length)
		var acceptThresh = nextTrace.logprob - currTrace.logprob + rvsPropLP - fwdPropLP
		if (nextTrace.conditionsSatisfied && Math.log(Math.random()) < acceptThresh)
		{
			this.proposalsAccepted += 1
			return nextTrace
		}
		else
			return currTrace
	}
}

RandomWalkKernel.prototype.stats = function RandomWalk_stats()
{
	console.log("Acceptance ratio: " + this.proposalsAccepted/this.proposalsMade + " (" +
		this.proposalsAccepted + "/" + this.proposalsMade + ")")
}


/*
Abstraction for the linear interpolation of two execution traces
*/
function LARJInterpolationTrace(trace1, trace2, alpha)
{
	alpha = alpha == undefined ? 0 : alpha
	this.trace1 = trace1
	this.trace2 = trace2
	this.alpha = alpha
}

LARJInterpolationTrace.prototype.__defineGetter__("logprob", function()
{
	return (1-this.alpha)*this.trace1.logprob + this.alpha*this.trace2.logprob
})

LARJInterpolationTrace.prototype.__defineGetter__("conditionsSatisfied", function()
{
	return this.trace1.conditionsSatisfied && this.trace2.conditionsSatisfied
})

LARJInterpolationTrace.prototype.__defineGetter__("returnValue", function()
{
	return this.trace2.returnValue
})

LARJInterpolationTrace.prototype.freeVarNames = function LARJInterpTrace_freeVarNames(structural, nonstructural)
{
	structural = (structural === undefined ? true : structural)
	nonstructural = (nonstructural === undefined ? true : nonstructural)
	var fv1 = this.trace1.freeVarNames(structural, nonstructural)
	var fv2 = this.trace2.freeVarNames(structural, nonstructural)
	var set = {}
	for (var i = 0; i < fv1.length; i++)
		set[fv1[i]] = true
	for (var i = 0; i < fv2.length; i++)
		set[fv2[i]] = true
	return util.keys(set)
}

LARJInterpolationTrace.prototype.proposeChange = function LARJInterpTrace_proposeChange(varname, structureIsFixed)
{
	if (!structureIsFixed) throw new Error("Structure must be fixed for LARJ annealing proposals!")
	var v1 = this.trace1.getRecord(varname)
	var v2 = this.trace2.getRecord(varname)
	var nextTrace = new LARJInterpolationTrace(v1 ? this.trace1.deepcopy() : this.trace1,
											   v2 ? this.trace2.deepcopy() : this.trace2,
											   this.alpha)
	v1 = nextTrace.trace1.getRecord(varname)
	v2 = nextTrace.trace2.getRecord(varname)
	var v = v1 || v2
	if (v.structural) throw new Error("Cannot change structural vars in interpolation kernel!")
	var propval = v.erp.proposal(v.val, v.params)
	var fwdPropLP = v.erp.logProposalProb(v.val, propval, v.params)
	var rvsPropLP = v.erp.logProposalProb(propval, v.val, v.params)
	if (v1)
	{
		v1.val = propval
		v1.logprob = v1.erp.logprob(v1.val, v1.params)
		nextTrace.trace1.traceUpdate(structureIsFixed)
	}
	if (v2)
	{
		v2.val = propval
		v2.logprob = v2.erp.logprob(v2.val, v2.params)
		nextTrace.trace2.traceUpdate(structureIsFixed)
	}
	return [nextTrace, fwdPropLP, rvsPropLP]
}


/*
MCMC transition kernel that does reversible jumps using the LARJ algorithm
*/
function LARJKernel(diffusionKernel, annealSteps, jumpFreq)
{
	this.diffusionKernel = diffusionKernel
	this.annealSteps = annealSteps
	this.jumpFreq = jumpFreq
	this.jumpProposalsMade = 0
	this.jumpProposalsAccepted = 0
	this.diffusionProposalsMade = 0
	this.diffusionProposalsAccepted = 0
	this.annealingProposalsMade = 0
	this.annealingProposalsAccepted = 0
}

LARJKernel.prototype.next = function LARJKernel_next(currTrace)
{
	var numStruct = currTrace.freeVarNames(true, false).length
	var numNonStruct = currTrace.freeVarNames(false, true).length

	// If we have no free random variables, then just run the computation
	// and generate another sample (this may not actually be deterministic,
	// in the case of nested query)
	if (numStruct + numNonStruct === 0)
	{
		currTrace.traceUpdate()
		return currTrace
	}
	// Decide whether to jump or diffuse
	var structChoiceProb = (this.jumpFreq === undefined ? numStruct/(numStruct+numNonStruct) : this.jumpFreq)
	if (Math.random() < structChoiceProb)
		return this.jumpStep(currTrace)
	else
	{
		var prevAccepted = this.diffusionKernel.proposalsAccepted
		var nextTrace = this.diffusionKernel.next(currTrace)
		this.diffusionProposalsMade++
		this.diffusionProposalsAccepted += (this.diffusionKernel.proposalsAccepted - prevAccepted)
		return nextTrace
	}
}

LARJKernel.prototype.jumpStep = function LARJKernel_jumpStep(currTrace)
{
	this.jumpProposalsMade++
	var oldStructTrace = currTrace.deepcopy()
	var newStructTrace= currTrace.deepcopy()

	// Randomly choose a structural variable to change
	var structVars = newStructTrace.freeVarNames(true, false)
	var name = util.randomChoice(structVars)
	var v = newStructTrace.getRecord(name)
	var origval = v.val
	var propval = v.erp.proposal(v.val, v.params)
	var fwdPropLP = v.erp.logProposalProb(v.val, propval, v.params)
	v.val = propval
	v.logprob = v.erp.logprob(v.val, v.params)
	newStructTrace.traceUpdate()
	var oldNumVars = oldStructTrace.freeVarNames(true, false).length
	var newNumVars = newStructTrace.freeVarNames(true, false).length
	fwdPropLP += newStructTrace.newlogprob - Math.log(oldNumVars)

	// We only actually do annealing if we have any non-structural variables and we're
	// doing more than zero annealing steps
	var annealingLpRatio = 0
	if (oldStructTrace.freeVarNames(false, true) + newStructTrace.freeVarNames(false, true) !== 0 &&
		this.annealSteps > 0)
	{
		var lerpTrace = new LARJInterpolationTrace(oldStructTrace, newStructTrace)
		var prevAccepted = this.diffusionKernel.proposalsAccepted
		for (var aStep = 0; aStep < this.annealSteps; aStep++)
		{
			lerpTrace.alpha = aStep/(this.annealSteps-1)
			annealingLpRatio += lerpTrace.logprob
			lerpTrace = this.diffusionKernel.next(lerpTrace)
			annealingLpRatio -= lerpTrace.logprob
		}
		this.annealingProposalsMade += this.annealSteps
		this.annealingProposalsAccepted += (this.diffusionKernel.proposalsAccepted - prevAccepted)
		oldStructTrace = lerpTrace.trace1
		newStructTrace = lerpTrace.trace2
	}

	// Finalize accept/reject decision
	v = newStructTrace.getRecord(name)
	var rvsPropLP = v.erp.logProposalProb(propval, origval, v.params) + oldStructTrace.lpDiff(newStructTrace) - Math.log(newNumVars)
	var acceptanceProb = newStructTrace.logprob - currTrace.logprob + rvsPropLP - fwdPropLP + annealingLpRatio
	if (newStructTrace.conditionsSatisfied && Math.log(Math.random()) < acceptanceProb)
	{
		this.jumpProposalsAccepted++
		return newStructTrace
	}
	return currTrace
}

LARJKernel.prototype.stats = function LARJKernel_stats()
{
	var overallProposalsMade = this.jumpProposalsMade + this.diffusionProposalsMade
	var overallProposalsAccepted = this.jumpProposalsAccepted + this.diffusionProposalsAccepted
	if (this.diffusionProposalsMade > 0)
	{
		console.log("Diffusion acceptance ratio: " + (this.diffusionProposalsAccepted/this.diffusionProposalsMade) +
			" (" + this.diffusionProposalsAccepted + "/" + this.diffusionProposalsMade + ")")
	}
	if (this.jumpProposalsMade > 0)
	{
		console.log("Jump acceptance ratio: " + (this.jumpProposalsAccepted/this.jumpProposalsMade) +
			" (" + this.jumpProposalsAccepted + "/" + this.jumpProposalsMade + ")")
	}
	if (this.annealingProposalsMade > 0)
	{
		console.log("Annealing acceptance ratio: " + (this.annealingProposalsAccepted/this.annealingProposalsMade) +
			" (" + this.annealingProposalsAccepted + "/" + this.annealingProposalsMade + ")")
	}
	console.log("Overall acceptance ratio: " + (overallProposalsAccepted/overallProposalsMade) +
		" (" + overallProposalsAccepted + "/" + overallProposalsMade + ")")
}


/*
Do MCMC for 'numsamps' iterations using a given transition kernel
*/
function mcmc(computation, kernel, numsamps, lag, verbose)
{
	lag = (lag === undefined ? 1 : lag)
	var currentTrace = trace.newTrace(computation)
	var samps = []
	var iters = numsamps*lag
	for (var i = 0; i < iters; i++)
	{
		currentTrace = kernel.next(currentTrace)
		if (i % lag === 0)
			samps.push({sample: currentTrace.returnValue, logprob: currentTrace.logprob})
	}
	if (verbose)
		kernel.stats()
	return samps
}


/*
Sample from a probabilistic computation for some
number of iterations using single-variable-proposal
Metropolis-Hastings 
*/
function traceMH(computation, numsamps, lag, verbose)
{
	lag = (lag === undefined ? 1 : lag)
	return mcmc(computation, new RandomWalkKernel(), numsamps, lag, verbose)
}


/*
Sample from a probabilistic computation using locally 
annealed reversible jump mcmc
*/
function LARJMH(computation, numsamps, annealSteps, jumpFreq, lag, verbose)
{
	lag = (lag === undefined ? 1: lag)
	return mcmc(computation,
				new LARJKernel(new RandomWalkKernel(false, true), annealSteps, jumpFreq),
				numsamps, lag, verbose)
}


module.exports = 
{
	distrib: distrib,
	mean: mean,
	expectation: expectation,
	MAP: MAP,
	rejectionSample: rejectionSample,
    bunchaRejectionSample: bunchaRejectionSample,
	traceMH: traceMH,
	LARJMH: LARJMH
}