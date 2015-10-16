var trace = require("./trace")


/*
Abstract base class for all ERPs
*/
function RandomPrimitive() {}

RandomPrimitive.prototype.sample_impl = function ERP_sample_impl(params)
{
	throw new Error("ERP subclasses must implement sample_impl!")
}

RandomPrimitive.prototype.logprob = function ERP_logprob(val, params)
{
	throw new Error("ERP subclasses must implement logprob!")
}

RandomPrimitive.prototype.sample = function ERP_sample(params, isStructural, conditionedValue)
{
    isStructural = (isStructural===undefined)?true:isStructural //by default erp draws are structural..
    return trace.lookupVariableValue(this, params, isStructural, conditionedValue)
}

RandomPrimitive.prototype.proposal = function ERP_proposal(currval, params)
{
	// Subclasses can override to do more efficient things
	return this.sample_impl(params)
}

RandomPrimitive.prototype.logProposalProb = function ERP_logProposalProb(currval, propval, params)
{
	// Subclasses can override to do more efficient things
	return this.logprob(propval, params)
}

// NOTE nextVal should be implemented by enumerable ERPs. no default implementation to allow testing for existence.
// RandomPrimitive.prototype.nextVal = function ERP_nextVal(currval)
// {
//    // When currval is null, start at beginning of domain when last val passed, return null.
// 	throw new Error("ERP subclasses must implement nextVal for domain enumeration!")
// }

// NOTE
// ERPs whose supports change depending on parameters (e.g., uniform, multinomial)
// can optionally implement the compareSupport function. this is handy
// for making sure inference doesn't result in invalid traces
// for example, in the model:
//
// a ~ Uniform(0,1)
// b ~ Uniform(0,a)
// ...
//
// the vanilla MH implementation will entertain proposals that make
// b > a; if the remainder of the model results in an error for b > a
// then we're in trouble; inference can't proceed. by declaring
// compareSupport(), we catch this problem earlier (inside of
// RandomExecutionTrace.prototype.lookup), avoiding model code
// errors

// RandomPrimitive.prototype.compareSupport = function ERP_compareSupport(params) {
//   ...
// }


///////////////////////////////////////////////////////////////////////////////


function FlipRandomPrimitive() {}
FlipRandomPrimitive.prototype = Object.create(RandomPrimitive.prototype)

FlipRandomPrimitive.prototype.sample_impl = function Flip_sample_impl(params)
{
	return (Math.random() < params[0])+0
}

FlipRandomPrimitive.prototype.logprob = function Flip_logprob(val, params)
{
	return Math.log(val ? params[0] : 1-params[0])
}

FlipRandomPrimitive.prototype.proposal = function Flip_proposal(currval, params)
{
	return !currval
}

FlipRandomPrimitive.prototype.logProposalProb = function Flip_logProposalProb(currval, propval, params)
{
	return 0
}

FlipRandomPrimitive.prototype.nextVal = function Flip_nextVal(currval, params)
{

  if (currval == null) {
    return 0;
  } else if (currval === 0) {
    return 1
  }
  return null;
};

var flipInst = new FlipRandomPrimitive()
var flip = function flip(p, isStructural, conditionedValue)
{
	p = (p == undefined) ? 0.5 : p
	return flipInst.sample([p], isStructural, conditionedValue) + 0
}


///////////////////////////////////////////////////////////////////////////////


function MultinomialRandomPrimitive() {}
MultinomialRandomPrimitive.prototype = Object.create(RandomPrimitive.prototype)

function multinomial_sample(theta)
{
	var k = theta.length
	var thetasum = 0
	for (var i = 0; i < k; i++) {thetasum += theta[i]}
	var x = Math.random() * thetasum
	var probAccum = 0
    for(var i=0; i<k; i++) {
        probAccum += theta[i]
        if(probAccum >= x) {return i} //FIXME: if x=0 returns i=0, but this isn't right if theta[0]==0...
    }
    return k
}

function multinomial_logprob(n, theta)
{
	var k = theta.length
	if (n < 0 || n >= k)
	{
		return -Infinity
	}
	n = Math.round(n)
	var thetasum = 0
	for (var i = 0; i < k; i++)
		thetasum += theta[i]
	return Math.log(theta[n]/thetasum)
}

MultinomialRandomPrimitive.prototype.compareSupport = function Multinomial_compareSupport(params1, params2) {
  return (params1.length == params2.length)
}

MultinomialRandomPrimitive.prototype.sample_impl = function Multinomial_sample_impl(params)
{
	return multinomial_sample(params)
}

MultinomialRandomPrimitive.prototype.logprob = function Multinomial_logprob(val, params)
{
	return multinomial_logprob(val, params)
}

// Multinomial with currval projected out
MultinomialRandomPrimitive.prototype.proposal = function Multinomial_proposal(currval, params)
{
	var newparams = params.slice()
	newparams[currval] = 0
	return multinomial_sample(newparams)
}

// Multinomial with currval projected out
MultinomialRandomPrimitive.prototype.logProposalProb = function Multinomial_logProposalProb(currval, propval, params)
{
	var newparams = params.slice()
	newparams[currval] = 0
	return multinomial_logprob(propval, newparams)
}

// try an index. if it has zero probability, keep trying
// until we find one that doesn't
MultinomialRandomPrimitive.prototype.nextVal = function Multinomial_nextVal(currval, params)
{

  if (currval == null) {
    return 0
  } else if (currval < params.length-1) {
    return currval+1
  }
  return null

}

var multinomialInst = new MultinomialRandomPrimitive()
var multinomial = function multinomial(theta, isStructural, conditionedValue)
{
	return multinomialInst.sample(theta, isStructural, conditionedValue) + 0
}
var multinomialDraw = function multinomialDraw(items, probs, isStructural, conditionedValue)
{
	var conditionedValueIndex = items.map(JSON.stringify).indexOf(JSON.stringify(conditionedValue))
	conditionedValue = (conditionedValueIndex == -1) ? undefined : conditionedValueIndex
	var result = items[multinomial(probs, isStructural, conditionedValue)]
	return result;
}

var uniformDraw = function uniformDraw(items, isStructural, conditionedValue)
{
	var probs = []
	for (var i = 0; i < items.length; i++)
		probs[i] = 1/items.length
	return items[multinomial(probs, isStructural, conditionedValue)]
}

///////////////////////////////////////////////////////////////////////////////


function UniformRandomPrimitive() {}
UniformRandomPrimitive.prototype = Object.create(RandomPrimitive.prototype)


UniformRandomPrimitive.prototype.compareSupport = function Uniform_compareSupport(params1, params2) {
  return params1[0] == params2[0] && params1[1] == params2[1];
}

UniformRandomPrimitive.prototype.sample_impl = function Uniform_sample_impl(params)
{
	var u = Math.random()
	return (1-u)*params[0] + u*params[1]
}

UniformRandomPrimitive.prototype.logprob = function Uniform_logprob(val, params)
{
	if (val < params[0] || val > params[1])
		return -Infinity
	return -Math.log(params[1] - params[0])
}

var uniformInst = new UniformRandomPrimitive()
var uniform = function(lo, hi, isStructural, conditionedValue)
{
	return uniformInst.sample([lo, hi], isStructural, conditionedValue) + 0
}


///////////////////////////////////////////////////////////////////////////////


function GaussianRandomPrimitive() {}
GaussianRandomPrimitive.prototype = Object.create(RandomPrimitive.prototype)

function gaussian_sample(mu,sigma)
{
    var u, v, x, y, q;

    do
    {
        u = 1 - Math.random();
        v = 1.7156 * (Math.random() - .5);
        x = u - 0.449871;
        y = Math.abs(v) + 0.386595;
        q = x*x + y*(0.196*y - 0.25472*x);
    }
    while(q >= 0.27597 && (q > 0.27846 || v*v > -4 * u * u * Math.log(u)))

    return mu + sigma*v/u;
}

function gaussian_logprob(x, mu, sigma)
{
	return -.5*(1.8378770664093453 + 2*Math.log(sigma) + (x - mu)*(x - mu)/(sigma*sigma))
}

GaussianRandomPrimitive.prototype.sample_impl = function Gaussian_sample_impl(params)
{
	return gaussian_sample(params[0], params[1])
}

GaussianRandomPrimitive.prototype.logprob = function Gaussian_logprob(val, params)
{
	return gaussian_logprob(val, params[0], params[1])
}

// Drift kernel
GaussianRandomPrimitive.prototype.proposal = function Gaussian_proposal(currval, params)
{
	return gaussian_sample(currval, params[1])
}

// Drift kernel
GaussianRandomPrimitive.prototype.logProposalProb = function Gaussian_logProposalProb(currval, propval, params)
{
	return gaussian_logprob(propval, currval, params[1])
}

var gaussianInst = new GaussianRandomPrimitive()
var gaussian = function gaussian(mu, sigma, isStructural, conditionedValue)
{
	return gaussianInst.sample([mu, sigma], isStructural, conditionedValue) + 0
}

///////////////////////////////////////////////////////////////////////////////


function GammaRandomPrimitive() {}
GammaRandomPrimitive.prototype = Object.create(RandomPrimitive.prototype)

function gamma_sample(a,b)
{
    if(a < 1) return gamma_sample(1+a,b) * Math.pow(Math.random(), 1/a);

    var x,v,u;
    var d = a-1/3;
    var c = 1/Math.sqrt(9*d);

    while(true)
    {
        do{x = gaussian_sample(0,1);  v = 1+c*x;} while(v <= 0);

        v=v*v*v;
        u=Math.random();

        if((u < 1 - .331*x*x*x*x) || (Math.log(u) < .5*x*x + d*(1 - v + Math.log(v)))) return b*d*v;
    }
}

var cof = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]
function log_gamma(xx)
{
    var x = xx - 1.0;
    var tmp = x + 5.5; tmp -= (x + 0.5)*Math.log(tmp);
    var ser=1.000000000190015;
    for (j=0;j<=5;j++){ x++; ser += cof[j]/x; }
    return -tmp+Math.log(2.5066282746310005*ser);
}

function gamma_logprob(x,a,b)
{
    return (a - 1)*Math.log(x) - x/b - log_gamma(a) - a*Math.log(b);
}

GammaRandomPrimitive.prototype.sample_impl = function Gamma_sample_impl(params)
{
	return gamma_sample(params[0], params[1])
}

GammaRandomPrimitive.prototype.logprob = function Gamma_logprob(val, params)
{
	return gamma_logprob(val, params[0], params[1])
}

var gammaInst = new GammaRandomPrimitive()
var gamma = function gamma(a, b, isStructural, conditionedValue)
{
	return gammaInst.sample([a, b], isStructural, conditionedValue) + 0
}


///////////////////////////////////////////////////////////////////////////////

function ExponentialRandomPrimitive() {}
ExponentialRandomPrimitive.prototype = Object.create(RandomPrimitive.prototype)

// We can just generate from a uniform on the unit interval,
// take its log, and divide by the negative of the rate 
// HT http://en.wikipedia.org/wiki/Exponential_distribution#Generating_exponential_variates
function exponential_sample(a) {
	  var u = Math.random();
    return Math.log(u) / (-1 * a);
}

ExponentialRandomPrimitive.prototype.sample_impl = function Exponential_sample_impl(params)
{
	  return exponential_sample(params[0])
}

function exponential_logprob(val, a) {
    return Math.log(a) - a * val;
}

ExponentialRandomPrimitive.prototype.logprob = function Exponential_logprob(val, params)
{
	  return exponential_logprob(val, params[0])
}

var exponentialInst = new ExponentialRandomPrimitive()

var exponential = function exponential(a, isStructural, conditionedValue)
{
	  return exponentialInst.sample([a], isStructural, conditionedValue) + 0
}


///////////////////////////////////////////////////////////////////////////////



function BetaRandomPrimitive() {}
BetaRandomPrimitive.prototype = Object.create(RandomPrimitive.prototype)

function beta_sample(a, b)
{
    var x = gamma_sample(a, 1);
    return x / (x + gamma_sample(b, 1));
}

function log_beta(a, b)
{
	return log_gamma(a) + log_gamma(b) - log_gamma(a+b)
}

function beta_logprob(x, a, b)
{
	if (x > 0 && x < 1)
		return (a-1)*Math.log(x) + (b-1)*Math.log(1-x) - log_beta(a,b)
	else return -Infinity
}

BetaRandomPrimitive.prototype.sample_impl = function Beta_sample_impl(params)
{
	return beta_sample(params[0], params[1])
}

BetaRandomPrimitive.prototype.logprob = function Beta_logprob(val, params)
{
	return beta_logprob(val, params[0], params[1])
}

var betaInst = new BetaRandomPrimitive()
var beta = function beta(a, b, isStructural, conditionedValue)
{
	return betaInst.sample([a, b], isStructural, conditionedValue) + 0
}


///////////////////////////////////////////////////////////////////////////////


function BinomialRandomPrimitive() {}
BinomialRandomPrimitive.prototype = Object.create(RandomPrimitive.prototype)

function binomial_sample(p,n)
{
    var k = 0;
    var N = 10;

    var a, b;
    while(n > N)
    {
        a = 1 + n/2;
        b = 1 + n-a;

        var x = beta_sample(a,b);

        if(x >= p){ n = a-1; p /= x; }
        else{ k += a; n = b - 1; p = (p-x) / (1-x); }
    }

    var u;
    for(var i=0; i<n; i++)
    {
        u = Math.random();
        if(u<p) k++;
    }

    return k | 0;
}

function g(x)
{
	if (x == 0) return 1
	if (x == 1) return 0
	var d = 1 - x
	return (1 - (x * x) + (2 * x * Math.log(x))) / (d * d)
}

function binomial_logprob(s, p, n)
{
	var inv2 = 1/2
	var inv3 = 1/3
	var inv6 = 1/6
	if (s >= n) return -Infinity
	var q = 1-p
	var S = s + inv2
	var T = n - s - inv2
	var d1 = s + inv6 - (n + inv3) * p
	var d2 = q/(s+inv2) - p/(T+inv2) + (q-inv2)/(n+1)
	var d2 = d1 + 0.02*d2
	var num = 1 + q * g(S/(n*p)) + p * g(T/(n*q))
	var den = (n + inv6) * p * q
	var z = num / den
	var invsd = Math.sqrt(z)
	z = d2 * invsd
	return gaussian_logprob(z, 0, 1) + Math.log(invsd) 
}

BinomialRandomPrimitive.prototype.sample_impl = function Binomial_sample_impl(params)
{
	return binomial_sample(params[0], params[1])
}

BinomialRandomPrimitive.prototype.logprob = function Binomial_logprob(val, params)
{
	return binomial_logprob(val, params[0], params[1])
}

var binomialInst = new BinomialRandomPrimitive()
var binomial = function binomial(p, n, isStructural, conditionedValue)
{
	return binomialInst.sample([p,n], isStructural, conditionedValue) + 0
}


///////////////////////////////////////////////////////////////////////////////


function PoissonRandomPrimitive() {}
PoissonRandomPrimitive.prototype = Object.create(RandomPrimitive.prototype)

function poisson_sample(mu)
{
    var k = 0;

    while(mu > 10)
    {
        var m = 7/8*mu;
        var x = gamma_sample(m, 1);

        if (x > mu)
        {
        	return (k + binomial_sample(mu/x, m-1)) | 0;
        }
        else
        {
        	mu -= x;
        	k += m;
        }
    }

    var emu = Math.exp(-mu);
    var p = 1;
    do{ p *= Math.random(); k++; } while(p > emu);

    return (k-1) | 0;
}

function fact(x)
{
    var t=1;
    while(x>1) t*=x--;
    return t;
}

function lnfact(x)
{
    if (x < 1) x = 1;

    if (x < 12) return Math.log(fact(Math.round(x)));

    var invx = 1 / x;
    var invx2 = invx * invx;
    var invx3 = invx2 * invx;
    var invx5 = invx3 * invx2;
    var invx7 = invx5 * invx2;

    var sum = ((x + 0.5) * Math.log(x)) - x;
    sum += Math.log(2*Math.PI) / 2;
    sum += (invx / 12) - (invx3 / 360);
    sum += (invx5 / 1260) - (invx7 / 1680);

    return sum;
}

function poisson_logprob(k, mu)
{
	return k * Math.log(mu) - mu - lnfact(k)
}

PoissonRandomPrimitive.prototype.sample_impl = function Poisson_sample_impl(params)
{
	return poisson_sample(params[0])
}

PoissonRandomPrimitive.prototype.logprob = function Poisson_logprob(val, params)
{
	return poisson_logprob(val, params[0])
}

var poissonInst = new PoissonRandomPrimitive()
var poisson = function poisson(mu, isStructural, conditionedValue)
{
	return poissonInst.sample([mu], isStructural, conditionedValue) + 0
}


///////////////////////////////////////////////////////////////////////////////


function DirichletRandomPrimitive() {}
DirichletRandomPrimitive.prototype = Object.create(RandomPrimitive.prototype)

function dirichlet_sample(alpha)
{
	var ssum = 0
	var theta = []
	var t;
	for (var i = 0; i < alpha.length; i++)
	{
		t = gamma_sample(alpha[i], 1)
		theta[i] = t
		ssum = ssum + t
	}
	  for (var i = 0; i < theta.length; i++) {
		    theta[i] /= ssum
        theta[i] = Math.max(Number.MIN_VALUE, theta[i])
  }
	return theta
}

function dirichlet_logprob(theta, alpha)
{
	var asum = 0
	for (var i = 0; i < alpha.length; i++) asum += alpha[i]
	var logp = log_gamma(asum)
	for (var i = 0; i < alpha.length; i++)
	{
		logp += (alpha[i]-1)*Math.log(theta[i])
		logp -= log_gamma(alpha[i])
	}
	return logp
}

DirichletRandomPrimitive.prototype.sample_impl = function Dirichlet_sample_impl(params)
{
	return dirichlet_sample(params)
}

DirichletRandomPrimitive.prototype.logprob = function Dirichlet_logprob(val, params)
{
	return dirichlet_logprob(val, params)
}

var dirichletInst = new DirichletRandomPrimitive()
var dirichlet = function dirichlet(alpha, isStructural, conditionedValue)
{
	return dirichletInst.sample(alpha, isStructural, conditionedValue).concat([])
}


///////////////////////////////////////////////////////////////////////////////


module.exports = 
{
    RandomPrimitive: RandomPrimitive,
	flip: flip,
	multinomial_logprob: multinomial_logprob,
	multinomial: multinomial,
	multinomialDraw: multinomialDraw,
	uniformDraw: uniformDraw,
	uniform: uniform,
	gaussian_logprob: gaussian_logprob,
	gaussian: gaussian,
	gamma_logprob: gamma_logprob,
	gamma: gamma,
	beta_logprob: beta_logprob,
	beta: beta,
	binomial_logprob: binomial_logprob,
	binomial: binomial,
	poisson_logprob: poisson_logprob,
	poisson: poisson,
	dirichlet_logprob: dirichlet_logprob,
	dirichlet: dirichlet,
  exponential: exponential,
  exponential_logprob: exponential_logprob
}
