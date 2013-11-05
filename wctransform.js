var esprima = require("esprima")
var escodegen = require("escodegen")
var estraverse = require("escodegen/node_modules/estraverse")

/*
-Webchurch generates a simpler js sublanguage than full js.. so transform can be simpler. Make a specialized transform for webchurch, and just use probabilistic-js runtime.
-In transform, first put into A-normal form, by lifting any CallExpression to enclosing statement (which turns into a block statement).
-Then can wrap calls with enter / leave without making and using a thunk.
-Combine the above:
-on enter:
if a ConditionalExpression replace any non-imediate subexpression (ie not identifier or literal) with function(){subexp}() statement. (to maintain control flow.) mark this call as skipped so it desn't get moved.
-on leave:
if a CallExpression (an not skip marked) replace with a fresh identifier, add to  list of calls to move.
if a Statement, if call list is not empty, replace with Block statement which is variable declaration for each call, wrapped in enterfn/leavefn, then original statement.
*/


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
        
        //catch calls that are being moved at closest Statement:
        if(node.type == 'ExpressionStatement'
           || node.type == 'Program'
           || node.type == 'BlockStatement'
           || node.type == 'ReturnStatement'
           || node.type == 'VariableDeclaration'
           ) {
            
            if(calls) {
                //statements that don't already have a body sequence get wrapped in a block statement:
                if(node.type == 'ExpressionStatement'
                   || node.type == 'ReturnStatement'
                   || node.type == 'VariableDeclaration') {
                    node = {type: "BlockStatement", body: [node]}
                }
                //stick moved calls onto top of body sequence, then reset calls:
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