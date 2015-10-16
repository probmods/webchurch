var esprima = require("esprima")
var escodegen = require("escodegen")
var estraverse = require("escodegen/node_modules/estraverse")


// Add a string format method
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

var replcode = "(function() {enterfn({0}); var ret = __p_REPLACEME_p__; leavefn(); return ret; }).apply(this)"


function makeWrappedCallReplacer(callNode)
{
	var replacer = 
	{
		enter: function(node)
		{
			if (node.type == estraverse.Syntax.Identifier &&
				node.name == "__p_REPLACEME_p__")
			{
				return callNode
			}
			return node
		}
	}
	return replacer
}

var nextid = 0
var callWrapper = 
{
	enter: function(node)
	{
		if (!node.skip && node.type == estraverse.Syntax.CallExpression)
		{
			var replacer = makeWrappedCallReplacer(node)
			var wrapast = esprima.parse(replcode.format(nextid)).body[0].expression
			nextid++

			// We do NOT wrap the calls to enterfn, the fn itself, or leavefn
			wrapast.callee.object.body.body[0].expression.skip = true
			node.skip = true
			wrapast.callee.object.body.body[2].expression.skip = true

			// To preserve source map information 
			wrapast.loc = node.loc
			wrapast.callee.object.body.body[1].loc = node.callee.loc

			estraverse.replace(wrapast, replacer)

			// OK, now we need to extract and evaluate any & all args to this call
			//   *before* passing them to the call. This is because if we leave it them
			//   inline, the order of evaluation might get messed up.
			// For example, if we have a function call as one of the args, then this call
			//   will see the id of the outer function call on the stack, which does not reflect
			//   the execution structure of the original program.
			for (var i = 0; i < node.arguments.length; i++)
			{
				var arg = node.arguments[i]
				var decl =
				{
					type: "VariableDeclaration",
					declarations:
					[{
						type: "VariableDeclarator",
						id: {type: "Identifier", name: "arg"+i},
						init: arg,
						loc: arg.loc
					}],
					kind: "var",
					loc: arg.loc
				}
				node.arguments[i] = {type: "Identifier", name: "arg"+i}
				wrapast.callee.object.body.body.splice(i, 0, decl)
			}

			return wrapast
		}
		return node
	}
}

var preamble = "var __pr = null\ntry {\n\t__pr = require('probabilistic/index')\n} catch (e) {\n\t__pr = require('./probabilistic/index')\n}\n__pr.openModule(__pr);\n"

/*
Transform a string of code by the above two transformations
*/
function probTransform(codeString)
{
	var ast = esprima.parse(codeString)
	estraverse.replace(ast, callWrapper)
    //+ "__pr.setmaxid(" + nextid + ");\n"
	return preamble + escodegen.generate(ast)
}

/*
Same as above, but takes an AST instead of a code string
*/
function probTransformAST(ast)
{
	estraverse.replace(ast, callWrapper)
	ast["body"].unshift(esprima.parse(preamble))
	return ast
}


module.exports =
{
	probTransformAST: probTransformAST,
	probTransform: probTransform
}

"var x = foo(1, bar(), 3)"