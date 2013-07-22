var escodegen = require('escodegen');
var tokenize = require('./tokenize.js').tokenize;
var church_astify = require('./church_astify.js').church_astify;
var js_astify = require('./js_astify.js').church_tree_to_esprima_ast;

function church_to_js(church) {
	return escodegen.generate(js_astify(church_astify(tokenize(church))));
}

module.exports = {
	church_to_js: church_to_js
};