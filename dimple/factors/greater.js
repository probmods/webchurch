module.exports = function(x) {
    x.type = "Real";
    x.constructor = "Greater"; 
    x.outputVariable = x.id; 
    x.inputVariables = x.args; 
}
