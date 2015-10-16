
//this file provides a utility for marginalizing a function.
//it caches the marginal for each argument set, thus providing a simple dynamic programming construct.
//note that because a marginal is created, this acts as a query boundary for any free random variables or constraints within the function.

var erp = require("./erp")
var inference = require("./inference")
var trace = require("./trace")

function MarginalRandomPrimitive(fn, samplingFn, samplingFnArgs) {
    this.fn = fn
    this.samplingFn = samplingFn
    this.samplingFnArgs = samplingFnArgs
    this.cache = {}
}

//why create an object to assign the primitive? instead of just assigning the primitive?
MarginalRandomPrimitive.prototype = new erp.RandomPrimitive //Object.create(erp.RandomPrimitive.prototype)

MarginalRandomPrimitive.prototype.clearCache = function clearCache() {
    this.cache = {}
}

//this is going to work ok, because traceUpdate is written properly to that it sets asside current trace state and reinstates it when done, hence nesting will do the right thing...
MarginalRandomPrimitive.prototype.getDist = function getDist(args) {

    var stringedargs = JSON.stringify(args) //stringify to use as key. needed?
    
    if(!(stringedargs in this.cache)) {
        
//        console.log("Generating marginal for args " +stringedargs)
        
        var dist = {}
        var fn = this.fn
        //FIXME: check that the computation runs with same address in all locations
        var computation = function computation(){return fn.apply(this, args)}
        var samps = this.samplingFn.apply(this, [computation].concat(this.samplingFnArgs))
        //var samps = inference.traceMH(computation, 100, 1) //TODO: which inference fn..? may want rejection or enumeration sometimes.
        
        for(i in samps)
        {
            var v = samps[i].sample
            if(dist[v] == undefined){dist[v]={}; dist[v].prob=0; dist[v].val=v}
            dist[v].prob = dist[v].prob + 1
        }
        for(v in dist)
        {
            dist[v].prob /= samps.length
        }
                
        this.cache[stringedargs] = dist
    } //else console.log("Re-using marginal for args " +stringedargs)
    return this.cache[stringedargs]
}


MarginalRandomPrimitive.prototype.sample_impl = function Marginal_sample_impl(params)
{
    //note: assumes dist is normalized.
    var dist = this.getDist(params)
    var x = Math.random()
    var accum = 0
    for(v in dist)
    {
        accum += dist[v].prob            //could store the CDF to avoid this sum.
        if(accum>=x) {return dist[v].val}
    }
}

MarginalRandomPrimitive.prototype.logprob = function Marginal_logprob(val, params)
{
    //note: assumes dist is normalized.
    var dist = this.getDist(params)
    if(dist[val] == undefined) {return -Infinity}
	return Math.log(dist[val].prob)
}


//assume fn is a function to be marginalized..
//returns an ERP that computes and caches marginals of the original function.
//computes marginal by using samplingFn and variadic args are args to the sampling function.
marginalize = function marginalize(fn, samplingFn)
{
    var samplingFnArgs = Array.prototype.slice.apply(arguments).slice(2)
    
    if(samplingFn == undefined){samplingFn = inference.traceMH; samplingFnArgs = [100, 1]}
    
    var marginalInt = new MarginalRandomPrimitive(fn, samplingFn, samplingFnArgs)
    
    var marginal = function marginal()//variadic..
                              {
                              var args = Array.prototype.slice.apply(arguments)
                              return marginalInt.sample(args)
                              }
    
    //this lets you set a conditioned value for the marginal ERP, even though it's variadic:
    marginal.conditionTo = function conditionTo(conditionedValue){
                                      return function(){
                                                 var args = Array.prototype.slice.apply(arguments)
                                                 return marginalInt.sample(args,undefined,conditionedValue)
                                                 }
                                      }
    
    marginal.clearCache = function() {marginalInt.clearCache()}
    
    marginal.logprob = function logprob(){ //variadic
                                  var args = Array.prototype.slice.apply(arguments)
                                  var val = args.pop()
                                  return marginalInt.logprob(val,args)
                                  }
    
    return marginal
}


///////////////////////////////////////////////////////////////////////////////


module.exports =
{
marginalize: marginalize
}





