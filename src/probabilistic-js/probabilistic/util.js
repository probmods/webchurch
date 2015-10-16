
function openModule(mod, prefix)
{
        // '.' in scheme tranforms to '_46' in js
        prefix = typeof prefix === 'undefined' ? "" : prefix + "_46";
	for (var prop in mod)
	{
		if (mod.hasOwnProperty(prop))
		{
			global[prefix+prop] = mod[prop]
		}
	}
}

function arrayEquals(a1, a2)
{
	var n = a1.length
	if (n !== a2.length)
		return false
	for (var i = 0; i < n; i++)
	{
		if (a1[i] !== a2[i])
			return false
	}
	return true
}

function randomChoice(arr)
{
	return arr[Math.floor(Math.random()*arr.length)]
}

function discreteChoice(theta)
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

function keys(obj)
{
	var a = []
	var i = 0
	for (var prop in obj)
	{
		a[i] = prop
		i++
	}
	return a
}

module.exports =
{
	openModule: openModule,
	arrayEquals: arrayEquals,
	randomChoice: randomChoice,
    discreteChoice: discreteChoice,
	keys: keys
}
