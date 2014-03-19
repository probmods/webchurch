/* global require */

var builtins = require('./church_builtins.js');
var annotations = require('./church_builtins.js').__annotations__;
var _ = require('underscore');

_.templateSettings = {
  interpolate: /\{\{(.+?)\}\}/g
};


/*

 functionName

 description

 arg_1 - type_1 - desc_1
 arg_2 - type_2 - desc_2
 ...
 arg_3 - type_3 - desc_3
 
*/

// TODO: transform names like 'x ...' into 'x1 x2 ...'
function renderFunction(functionName, props) {
  var description = props.desc || "";
  var args = props.params || [];
        
  var renderArg = _.template("<tr><td><code>{{name}}</code></td><td>{{type}}</td><td>{{desc}}</td></tr>"); 

  var argsTable = _.template("<table>\n{{tbody}}\n</table>",
                             {tbody: args.map(function(arg) {
                               arg = _.defaults(arg, {type: '', desc: ''});
                               return renderArg(arg);
                             }).join('\n')});

  var templateString = ['<div class="function">',
                        '<code class="function-name">({{functionName}} {{argList}})</code>',
                        '<div class="description">{{description}}</div>',
                        '{{table}}',
                        '</div>'].join('\n');
  
  return _.template(templateString,
                    {functionName: functionName,
                     argList: _(args).pluck('name').join(' '),
                     description: description,
                     table: argsTable});
}


function renderAllFunctions() {
  var rendered = _(annotations).map(function(props, functionName) {
    return renderFunction(functionName, props);
  });
  return rendered.join('\n');
}

var res = renderAllFunctions();

console.log(res);
