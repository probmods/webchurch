module.exports = function(x) {
    x.type = "Bit";
    x.constructor = "Bernoulli";
    x.constructorArgs = [ x.args[0] ]; 
    x.outputVariable = x.id; 
    x.inputVariables = []; 
}
