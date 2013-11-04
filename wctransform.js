var esprima = require("esprima")
var escodegen = require("escodegen")
var estraverse = require("escodegen/node_modules/estraverse")


//// Add a string format method
//if (!String.prototype.format) {
//  String.prototype.format = function() {
//    var args = arguments;
//    return this.replace(/{(\d+)}/g, function(match, number) { 
//      return typeof args[number] != 'undefined'
//        ? args[number]
//        : match
//      ;
//    });
//  };
//}

//var replcode = "(function() {__pr.enterfn({0}); var ret = __p_REPLACEME_p__; __pr.leavefn(); return ret; })()"
//var replcode = "(function() {enterfn({0}); var ret = __p_REPLACEME_p__; leavefn(); return ret; })()"


//function makeIdReplacer(callNode)
//{
//	var replacer = 
//	{
//		enter: function(node)
//		{
//			if (node.type == estraverse.Syntax.Identifier &&
//				node.name == "__p_REPLACEME_p__")
//			{
//				return callNode
//			}
//			return node
//		}
//	}
//	return replacer
//}


//var nextid = 0
//var callWrapper =
//{
//	enter: function(node)
//	{
//		if (!node.skip && node.type == estraverse.Syntax.CallExpression)
//		{
//			var replacer = makeIdReplacer(node)
//			var wrapast = esprima.parse(replcode.format(nextid)).body[0].expression
//			nextid++
//
//			// We do NOT wrap the calls to enterfn, the fn itself, or leavefn
//			wrapast.callee.body.body[0].expression.skip = true
//			node.skip = true
//			wrapast.callee.body.body[2].expression.skip = true
//
//			// To preserve source map information 
//			wrapast.loc = node.loc
//			wrapast.callee.body.body[1].loc = node.callee.loc
//
//			estraverse.replace(wrapast, replacer)
//
//			// OK, now we need to extract and evaluate any & all args to this call
//			//   *before* passing them to the call. This is because if we leave it them
//			//   inline, the order of evaluation might get messed up.
//			// For example, if we have a function call as one of the args, then this call
//			//   will see the id of the outer function call on the stack, which does not reflect
//			//   the execution structure of the original program.
//			for (var i = 0; i < node.arguments.length; i++)
//			{
//				var arg = node.arguments[i]
//				var decl =
//				{
//					type: "VariableDeclaration",
//					declarations:
//					[{
//						type: "VariableDeclarator",
//						id: {type: "Identifier", name: "arg"+i},
//						init: arg,
//						loc: arg.loc
//					}],
//					kind: "var",
//					loc: arg.loc
//				}
//				node.arguments[i] = {type: "Identifier", name: "arg"+i}
//				wrapast.callee.body.body.splice(i, 0, decl)
//			}
//
//			return wrapast
//		}
//		return node
//	}
//}

function templateReplace(template, replacenode) {
    var replacer =
	{
    enter: function(node)
		{
			if (node.type == estraverse.Syntax.Identifier &&
				node.name == "__REPLACEME__")
			{
				return replacenode
			}
			return node
		}
	}
    var templateAST = esprima.parse(template).body[0] //NOTE: template must be expression or single statement.
    return estraverse.replace(templateAST, replacer)
}


var nextid = 0
var calls = []

var callWrapper =
{
    
enter: function(node)
	{
        if(node.type == 'ConditionalExpression') {
            //replace any non-imediate subexpression (ie not identifier or literal) with function(){subexp}() statement. (to maintain control flow.) mark this call as skipped so it desn't get moved.
            //TODO: don't wrap if immediate.
            var test = templateReplace("(function(){return __REPLACEME__}())", node.test).expression
            test.skip = true
            var consequent = templateReplace("(function(){return __REPLACEME__}())", node.consequent).expression
            consequent.skip = true
            var alternate = templateReplace("(function(){return __REPLACEME__}())", node.alternate).expression
            alternate.skip = true
            node.test=test
            node.consequent = consequent
            node.alternate = alternate
            return node
        }
        return node
    },
    
leave: function(node)
    {
        if(node.skip){return node}
        if(node.type == 'CallExpression') {
            //replace with new identifier, add to call queue.
            var id = nextid++
            var idNode = {type: "Identifier", name: "call"+id}
            var newCallBlock = templateReplace("{enterfn("+id+"); var call"+id+"=__REPLACEME__; leavefn();}",node)
            calls.push(newCallBlock)
            return idNode
        }
        
        if(node.type == 'ExpressionStatement'
           || node.type == 'Program'
           || node.type == 'BlockStatement'
           ) {
            if(calls) {
                if(node.type == 'ExpressionStatement') {
                    node = {type: "BlockStatement", body: [node]}
                }
                node.body = calls.concat(node.body)
                calls = []
                return node
            }
            return node
        }
        
        return node
    }
}


var preamble = "var __pr = null\ntry {\n\t__pr = require('probabilistic/index')\n} catch (e) {\n\t__pr = require('./probabilistic/index')\n}\n__pr.openModule(__pr);\n"

function probTransform(codeString)
{
	var ast = esprima.parse(codeString)
    return probTransformAST(ast)
}

function probTransformAST(ast)
{
	estraverse.replace(ast, callWrapper)
	ast.body.unshift(esprima.parse(preamble))
	return ast
}


module.exports =
{
	probTransformAST: probTransformAST,
	probTransform: probTransform
}

"var x = foo(1, bar(), 3)"