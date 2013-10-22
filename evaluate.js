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

function get_sites_from_stack(split_stack) {
	var sites = [];
	for (var i = 0; i < split_stack.length; i++) {
		// This makes the fairly safe assumption that the first run of consecutive
		// stack frames containing "<anonymous>" belong to the generated code
		if (split_stack[i].match("<anonymous>")) {
			var site = split_stack[i].match(/(\d+:\d+)[^:]*$/)[1].split(":");
			sites.push([site[0], parseInt(site[1]-1)]); 
		} else if (sites.length > 0) {
			break;
		}
	}
	return sites;
}

function evaluate(church_codestring) {
	var tokens = tokenize(church_codestring);
	var church_ast = church_astify(tokens);
	var js_ast = js_astify(church_ast);
	js_ast = transform.probTransformAST(js_ast)
	var code_and_source_map = escodegen.generate(js_ast, {"sourceMap": "whatever", "sourceMapWithCode": true});

	var result;
	try {
		var result = eval(code_and_source_map.code);
        if (typeof result != "function") {
            result = util.format_result(result)
        }
	} catch (err) {
		var js_to_church_site_map = get_js_to_church_site_map(code_and_source_map.map);
    var churchLines = church_codestring.split("\n");
		var church_sites_to_tokens_map = get_church_sites_to_tokens_map(tokens);
		var stack = err.stack.split("\n");
		var msg = stack[0].split(":");

		var js_sites = get_sites_from_stack(stack.slice(1));
		var church_sites = [];
		for (var i = 0; i < js_sites.length; i++) {
			var js_site = js_sites[i];
			var church_site = js_to_church_site_map[js_site[0]] && js_to_church_site_map[js_site[0]][js_site[1]];

			church_sites.push(church_site);
		}

 		church_sites = church_sites.filter(function (x) {return x});
 		if (church_sites.length == 0) {
 			throw err;
 		} else {
			var token = church_sites_to_tokens_map[church_sites[0]],
          displayedMessage = err.message;

      if (msg[0] == "ReferenceError") {
        displayedMessage = token.text + " is not defined";
      }
      
      if ( msg[1].match(/is not a function/)  ) {
        // error sometimes matches on starting paren rather than the function name
        // so seek to next token, which is the function name
        if (token.text == "(") {
          var tokStart = token.start,
              tokEnd = token.end,
              tokeNum; 

          for(var j = 0, jj = tokens.length; j < jj; j++) {
            if (tokens[j].start == tokStart && tokens[j].end == tokEnd) {
              tokeNum = j;
            }
          }
          token = tokens[tokeNum + 1];
        }
        
        var nonFunction = token.text;
        
        displayedMessage = nonFunction + " is not a function"; 

      };
      
			var e = util.make_church_error(msg[0], token.start, token.end, displayedMessage);
      
			e.stack = church_sites.map(function(x) {
				var tok = church_sites_to_tokens_map[x];
				return tok.start + "-" + tok.end;
			}).join(",");
            e.stackarray = church_sites.map(function(x) {return church_sites_to_tokens_map[x]})
 			throw e;
 		}
	}

	return result;
}

module.exports = {
	evaluate: evaluate
};
