/* global require, process, fs */


var tokenize = require('./tokenize.js').tokenize;
var church_astify = require('./church_astify.js').church_astify;
var js_astify = require('./js_astify.js').church_tree_to_esprima_ast;
//var precompile = require('./precompile.js').precompile;
var wctransform = require('./wctransform');
var escodegen = require('escodegen');
var esprima = require('esprima');
var estraverse = require('escodegen/node_modules/estraverse'); 
var trace = require('./trace.js');
var ttd = require('./trace-to-dimple.js');
var fs = require('fs');

var log = function(x) {
    console.log(x)
}

var filename = process.argv[2];

if (filename === undefined) {
    console.log('Usage: node dimple-compiler.js [filename]')
    return 1;
}

var church_codestring = fs.readFileSync(filename);

////Ising example:
//(define sites (repeat 10 flip))
//(define (constraints s) (if (null? s) ) 

//preamble is an array of strings defining church functions for the precompile pass. these all overload built in functions from the church or probjs runtime.
var preamble = []

//ERPs have to be intercepted and overloaded with a form that calls "random" to make an abstract value.
//var erps = ["uniform-draw", "multinomial", "flip", "uniform", "random_integer", "gaussian", "gamma", "beta", "dirichlet"]
var erps = ["wrapped_uniform_draw", "wrapped_multinomial", "wrapped_flip", "wrapped_uniform", "wrapped_random_integer", "wrapped_gaussian", "wrapped_gamma", "wrapped_beta", "wrapped_dirichlet"]
for (var p in erps) {
//    preamble.push("(define "+ erps[p] +" (lambda args (random '"+ erps[p] +" args idstack)))")
    preamble.push("(define "+ erps[p] +" (lambda args (random '"+ erps[p] +" args)))")

}

//console.log(preamble.join('\n'))

church_codestring = preamble.join("\n")+ "\n" + church_codestring

var tokens = tokenize(church_codestring);
var church_ast = church_astify(tokens);
var js_ast = js_astify(church_ast);
js_ast = wctransform.probTransformAST(js_ast, true);

// console.log('wctransformed code')
// console.log('------------------\n')
// console.log(escodegen.generate(js_ast))
// console.log('')

//trace:
var tracecode = trace.trace(js_ast);

// console.log('traced code')
// console.log('-----------\n')
// console.log(tracecode)
// console.log('')

// // to dimple:
// console.log('dimple code')
// console.log('-----------\n')

var javaImports = [
    "cern.colt.Arrays",
    "com.analog.lyric.dimple.factorfunctions.*",
    "com.analog.lyric.dimple.model.variables.*",
    "com.analog.lyric.dimple.model.domains.*",
    "com.analog.lyric.dimple.model.core.*"
];


log(javaImports.map(function(imp) {
    return "import " + imp + ";";
}).join("\n"));
log("");
log("public class Simple")
log("{")
log("public static void main(String[] args)");
log("{")
log("")
log("FactorGraph myGraph = new FactorGraph();");
log(ttd.traceToDimple(tracecode))


log("}")
log("}")
