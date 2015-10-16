var trace = require("./trace")
var util = require("./util")
var STKernel = require("./STKernel")

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
Note: doesn't work if the desired log probability is higher than the
probability of generating the state by running the program forwards
(such as with a factor statement)
*/
function rejectionSample(computation)
{
	var tr = trace.newTrace(computation)
	while (Math.log(Math.random()) > tr.logprob - tr.genlogprob) {
		tr = trace.newTrace(computation)
	}

	return tr.returnValue
}

////same but return a bunch of samples in data structure that matches traceMH
//function bunchaRejectionSample(computation, numsamps)
//{
//    var samps = []
//    
//    for(i=0;i<numsamps;i++)
//    {
//        var tr = trace.newTrace(computation)
//        samps.push({sample: tr.returnValue, logprob: tr.logprob})
//    }
//	
//	return samps
//}

// HT https://en.wikipedia.org/wiki/Kahan_summation_algorithm
function kahanSum(nums) {
  var sum = 0.0;
  var c = 0.0;  // A running compensation for lost low-order bits.
  for(var i = 0, ii = nums.length; i < ii; i++) {
	var y = nums[i] - c; // Subtract off compensation
	var t = sum + y; // make temp variable for new sum
	c = (t - sum) - y; // update compensation.
	sum = t
  }
  return sum;
}

function normalSum(nums) {
  var res = 0;
  for(var i = 0, ii = nums.length; i < ii; i++) {
	res += nums[i] 
  }
  return res;
}

/*
 Enumerate through random choices in the program.
 Assumes:
 all random choice have an iteration method that iterates over thier (finite) domain, returning special symbol when end of domain is reached.
 random choice names are always returned in evauation order.
 Returns a discrete distribution (the marginal on return values).
 */
function enumerateDist(computation) {
	var dist = {}
	function addElt(val, logprob) {
		var stringrep = JSON.stringify(val)
		if (!dist[stringrep]) {
			dist[stringrep]={}
			dist[stringrep].val = val
			dist[stringrep].prob = []
		}
		dist[stringrep].prob.push( Math.exp(logprob) )
	}
	
	//    initialize at start of domain for each ERP:
	var currTrace = trace.newTrace(computation, false)
  currTrace.enumerate=true
  currTrace.traceUpdate()
  currTrace.enumerate=false
  //iterate through ERP vals:
  while(currTrace) {
	if (currTrace.conditionsSatisfied) {addElt(currTrace.returnValue, currTrace.logprob)}
	currTrace = currTrace.nextEnumState(true)
  }

  for(var item in dist) {
	dist[item].prob = kahanSum(dist[item].prob);
  }

  return dist
}



/*
MCMC transition kernel that takes random walks by tweaking a
single variable at a time
*/
function RandomWalkKernel(pred)
{
	this.pred = pred
	this.proposalsMade = 0
	this.proposalsAccepted = 0
}

RandomWalkKernel.prototype.next = function RandomWalk_next(currTrace)
{
	this.proposalsMade += 1
	
	var currNames = currTrace.freeVarNames(this.pred)
	
	/*
	If we have no free random variables, then just run the computation
	and generate another sample (this may not actually be deterministic,
	in the case of nested query)
	*/
	if (currNames.length==0)
	{
		currTrace.traceUpdate()
		return currTrace
	}
	/*
	Otherwise, make a proposal for a randomly-chosen variable, probabilistically
	accept it
	*/
	else
	{
		var name = util.randomChoice(currNames)
		var retval = currTrace.proposeChange(name)
		var nextTrace = retval[0]
		var fwdPropLP = retval[1] - Math.log(currNames.length)
		var rvsPropLP = retval[2] - Math.log(nextTrace.freeVarNames(this.pred).length)
		var acceptThresh = nextTrace.logprob - currTrace.logprob + rvsPropLP - fwdPropLP
		if (nextTrace.conditionsSatisfied && Math.log(Math.random()) < acceptThresh)
		{
			this.proposalsAccepted += 1
			return nextTrace
		}
	}
	return currTrace //if we haven't accepted, return currTrace
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

LARJInterpolationTrace.prototype.freeVarNames = function LARJInterpTrace_freeVarNames(pred)
{
	var fv1 = this.trace1.freeVarNames(pred)
	var fv2 = this.trace2.freeVarNames(pred)
	var set = {}
	for (var i = 0; i < fv1.length; i++)
		set[fv1[i]] = true
	for (var i = 0; i < fv2.length; i++)
		set[fv2[i]] = true
	return util.keys(set)
}

LARJInterpolationTrace.prototype.proposeChange = function LARJInterpTrace_proposeChange(varname)
{
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
		nextTrace.trace1.traceUpdate(!v1.structural)
	}
	if (v2)
	{
		v2.val = propval
		v2.logprob = v2.erp.logprob(v2.val, v2.params)
		nextTrace.trace2.traceUpdate(v2.structural)
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
	
	this.isStructural = function pred(rec){return rec.structural}
	this.isNotStructural = function pred(rec){return !rec.structural}

}

LARJKernel.prototype.next = function LARJKernel_next(currTrace)
{
	var numStruct = currTrace.freeVarNames(this.isStructural).length
	var numNonStruct = currTrace.freeVarNames(this.isNotStructural).length

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
	var structVars = newStructTrace.freeVarNames(this.isStructural)
	var name = util.randomChoice(structVars)
	var v = newStructTrace.getRecord(name)
	var origval = v.val
	var propval = v.erp.proposal(v.val, v.params)
	var fwdPropLP = v.erp.logProposalProb(v.val, propval, v.params)
	v.val = propval
	v.logprob = v.erp.logprob(v.val, v.params)
	newStructTrace.traceUpdate()
	var oldNumVars = oldStructTrace.freeVarNames(this.isStructural).length
	var newNumVars = newStructTrace.freeVarNames(this.isStructural).length
	fwdPropLP += newStructTrace.newlogprob - Math.log(oldNumVars)

	// We only actually do annealing if we have any non-structural variables and we're
	// doing more than zero annealing steps
	var annealingLpRatio = 0
	if ((oldStructTrace.freeVarNames(this.isNotStructural).length
		 + newStructTrace.freeVarNames(this.isNotStructural).length) !== 0
		&& this.annealSteps > 0)
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

function mcmc_thunk(computation, kernel, lag, verbose, init) {
	lag = (lag === undefined ? 1 : lag)
	init = (init == undefined ? "rejection" : init)
	kernel = (kernel == undefined ? new RandomWalkKernel() : kernel)
	var currentTrace = trace.newTrace(computation, init)
	return function() {
		for (var i = 0; i < lag; i++) {
			currentTrace = kernel.next(currentTrace);
		}
		return currentTrace.returnValue;
	}
}

/*
Do MCMC for 'numsamps' iterations using a given transition kernel
*/
function mcmc(computation, kernel, numsamps, lag, verbose, init)
{
	lag = (lag === undefined ? 1 : lag)
	init = (init == undefined ? "rejection" : init)
	var currentTrace = trace.newTrace(computation, init)
	var samps = []
	var iters = numsamps*lag
	var t0 = new Date().getTime()
	for (var i = 0; i < iters; i++)
	{
		currentTrace = kernel.next(currentTrace)
		if (i % lag === 0)
			samps.push({sample: currentTrace.returnValue, logprob: currentTrace.logprob})
	}
	if (verbose)
	{
		kernel.stats()
		var t1 = new Date().getTime()
		var tsecs = (t1-t0)/1000
		console.log("Time: ", tsecs)
	}
	return samps
}

/*
 Mixture kernel
 */
function mixKernel(k1,k2) { //FIXME: variable number, variable weights
	this.k1=k1
	this.k2=k2
}

mixKernel.prototype.next = function(trace){return Math.random()>0.5?this.k1.next(trace):this.k2.next(trace)}

mixKernel.prototype.stats =function(){this.k1.stats(); this.k2.stats()}

/*
Sample from a probabilistic computation for some
number of iterations using single-variable-proposal
Metropolis-Hastings 
*/
function traceMH(computation, numsamps, lag, verbose, init)
{
	lag = (lag === undefined ? 1 : lag)
	return mcmc(computation, new RandomWalkKernel(), numsamps, lag, verbose, init)
}


/*
Sample from a probabilistic computation using locally 
annealed reversible jump mcmc
*/
function LARJMH(computation, numsamps, annealSteps, jumpFreq, lag, verbose)
{
	lag = (lag === undefined ? 1: lag)
	return mcmc(computation,
				new LARJKernel(new RandomWalkKernel(function(rec){return !rec.structural}), annealSteps, jumpFreq),
				numsamps, lag, verbose)
}

/*
 Sample from a probabilistic computation using Suwa-Todo (irreversible kernel) 
*/
function traceST(computation, numsamps, lag, verbose, init)
{
	lag = (lag === undefined ? 1 : lag)
	//make MH proposals to structural or non-enumerable ERPs:
	var rwkernel = new RandomWalkKernel(function(rec){return rec.structural || (typeof rec.erp.nextVal != 'function')})
	var kernel = new mixKernel(new STKernel.STKernel(), rwkernel)
	return mcmc(computation, kernel, numsamps, lag, verbose, init)
}


/*
 Create conditional thunk.
 Options includes the algorithm and any algorithm-specific params.
 FIXME: do we need to return a thunk or an ERP (that knows how to score itself)?
 FIXME: finish
*/

function conditional(computation, options) {
	switch (options.algorithm) {
		case "traceMH":
			
			return mcmc_thunk(computation, new RandomWalkKernel(), options.lag, options.verbose, options.init)
			
		case "traceST":
			var rwkernel = new RandomWalkKernel(function(rec){return rec.structural || (typeof rec.erp.nextVal != 'function')})
			var kernel = new mixKernel(new STKernel.STKernel(), rwkernel)
			return mcmc_thunk(computation, kernel, options.lag, options.verbose, options.init)
			
		case "LARJMH":
			
			return mcmc_thunk(computation,
				new LARJKernel(new RandomWalkKernel(function(rec){return !rec.structural}), annealSteps, jumpFreq),
				options.lag, options.verbose)
			
		case "enumerate":
			var items = []
			var probs = []
			var enumeration = enumerateDist(computation)
			for (key in enumeration) {
				items.push(enumeration[key].val)
				probs.push(enumeration[key].prob)
			}
			return function() {
				return items[util.discreteChoice(probs)];
			}

		default: //rejection
			return function() {
				return rejectionSample(computation)
			}
			
	}
	
}



module.exports = 
{
	distrib: distrib,
	mean: mean,
	expectation: expectation,
	MAP: MAP,
	rejectionSample: rejectionSample,
	enumerateDist: enumerateDist,
//    bunchaRejectionSample: bunchaRejectionSample,
	mcmc_thunk: mcmc_thunk,
	traceMH: traceMH,
	LARJMH: LARJMH,
	traceST: traceST,
	conditional: conditional
}
