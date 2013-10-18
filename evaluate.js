var escodegen = require('escodegen');
var source_map = require('source-map');
var church_builtins = require('./church_builtins');
var tokenize = require('./tokenize.js').tokenize;
var church_astify = require('./church_astify.js').church_astify;
var js_astify = require('./js_astify.js').church_tree_to_esprima_ast;
var util = require('./util.js');

var pr = require('./probabilistic/index.js')
var transform = require("./probabilistic/transform")

// Note: escodegen zero-indexes columns, while JS evaluators and the Church
// tokenizer uses 1-indexed columns.

function get_js_to_church_site_map(src_map) {
	var site_map = {};
	var smc = new source_map.SourceMapConsumer(JSON.parse(JSON.stringify(src_map)));
	smc.eachMapping(function(m) {
		// Some of the mappings map to undefined locations for some reason, ignore those
		if (m.originalLine) {
			site_map[m.generatedLine] = site_map[m.generatedLine] || {};
			site_map[m.generatedLine][m.generatedColumn] = m.originalLine + ":" + m.originalColumn;
		}
	});
	return site_map;
}

function get_church_sites_to_tokens_map(tokens) {
	var map = {}
	for (var i = 0; i < tokens.length; i++) {
		map[tokens[i].start] = tokens[i];
	}
	return map;
}

function get_site_from_stack(split_stack) {
	for (var i = 0; i < split_stack.length; i++) {
		if (split_stack[i].match(/evaluate\.js/)) {
			var site = split_stack[i].match(/(\d+:\d+)[^:]*$/)[1].split(":");
			return [site[0], parseInt(site[1]-1)]; 
		}
	}
}

function evaluate(church_codestring) {
	var tokens = tokenize(church_codestring);
	var church_ast = church_astify(tokens);
	var js_ast = js_astify(church_ast);
	util.spit(js_ast, "JS_AST")
	js_ast = transform.probTransformAST(js_ast)
	var code_and_source_map = escodegen.generate(js_ast, {"sourceMap": "whatever", "sourceMapWithCode": true});
	console.log("CODE")
	console.log(code_and_source_map.code)


	var result;
	try {
		var result = eval(code_and_source_map.code);
	} catch (err) {
		// console.log(err.stack)
		var js_to_church_site_map = get_js_to_church_site_map(code_and_source_map.map);
		console.log("JS2CHURCH SITE MAP")
		console.log(js_to_church_site_map)
		var church_sites_to_tokens_map = get_church_sites_to_tokens_map(tokens);
		console.log("CHURCH SITES TO TOKENS MAP")
		console.log(church_sites_to_tokens_map)

		var stack = err.stack.split("\n");
		var msg = stack[0].split(":");
		// IMPORTANT: For an as-of-yet unknown reason, running code in eval()
		// returns different locations for errors. The only known case so far is
		// on function calls where the function is not defined. In eval, the
		// error refers to the beginning of the line containing the call, instead
		// of where the function is. Thanks to the prob-js transform, we are
		// guaranteed that there can only be one Church function call per line,
		// so for errors we just look up the offending line. This is very
		// likely to break if the prob-js transform changes majorly.

		var js_site = get_site_from_stack(stack.slice(1));

		// console.log("STACK")
		// console.log(stack);

		var church_site = js_to_church_site_map[js_site[0]] && js_to_church_site_map[js_site[0]][js_site[1]];
		console.log("JS SITE")
		console.log(js_site)
		console.log("CHURCH SITE")
		console.log(church_site)
		var token = church_sites_to_tokens_map[church_site];
		util.spit(token, "TOKEN")
		if (token) {
			if (msg[0] == "ReferenceError") {
				util.throw_church_error(msg[0], token.start, token.end, token.text + " is not defined");
			}
		}
		console.log(err.stack)
		throw {name: err.name, message: err.message}
	}

	return util.format_result(result);
}

module.exports = {
	evaluate: evaluate
};