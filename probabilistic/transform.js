var fs = require("fs")
var esprima = require("esprima")
var escodegen = require("escodegen")
var estraverse = require("escodegen/node_modules/estraverse")


/*
'Desugar' all function declarations into var assignments of
function expressions
*/
var fnDeclDesugarer = 
{
	enter: function(node)
	{
		if (node.type == estraverse.Syntax.FunctionDeclaration)
		{
			node.type = estraverse.Syntax.FunctionExpression
			// This recursion shouldn't be necessary..
			estraverse.replace(node, fnDeclDesugarer)
			var replNode = 
			{
				type: estraverse.Syntax.VariableDeclaration,
				declarations: [
				{
					type: estraverse.Syntax.VariableDeclarator,
					id:
					{
						type: estraverse.Syntax.Identifier,
						name: node.id.name
					},
					init: node
				}],
				kind: "var"
        	}
        	return replNode
		}
		else return node
	}
}

/*
Wrap all function expressions in 'prob' calls
*/
var probWrapper = 
{
	enter: function(node)
	{
		if (node.type == estraverse.Syntax.FunctionExpression)
		{
			// This recursion shouldn't be necessary...
			estraverse.replace(node.body, probWrapper)
			var wrapNode = 
			{
				type: estraverse.Syntax.CallExpression,
				callee:
				{
					type: estraverse.Syntax.MemberExpression,
					computed: false,
					object:
					{
						type: estraverse.Syntax.Identifier,
						name: "__pr"
					},
					property:
					{
						type: estraverse.Syntax.Identifier,
						name: "prob"
					}
				},
				arguments: [node]
			}
			return wrapNode
		}
		return node
	}
}

/*
Transform a string of code by the above two transformations
*/
function probTransform(codeString)
{
	var ast = esprima.parse(codeString)
	estraverse.replace(ast, fnDeclDesugarer)
	estraverse.replace(ast, probWrapper)
	var preamble = "var __pr = null\ntry {\n\t__pr = require('probabilistic/index')\n} catch (e) {\n\t__pr = require('./probabilistic/index')\n}\n"
	return preamble + escodegen.generate(ast)
}


module.exports =
{
	probTransform: probTransform
}


/*
If called as the main module:
	node transform.js inputfilename outputfilename
*/
if (require.main === module)
{
	if (process.argv.length !== 4)
	{
		console.log("usage: node transform.js inputfilename outputfilename")
		process.exit()
	}
	fs.writeFileSync(process.argv[3],
		probTransform(fs.readFileSync(process.argv[2])))
}