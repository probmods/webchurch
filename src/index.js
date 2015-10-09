global.webchurch = {
  EditorModel: require('./editor').EditorModel,
  d3: require('d3')
}

var formatResult = require('app/util').format_result;
var churchToBareJs = require('app/evaluate').churchToBareJs;
var __pr = require('app/probabilistic-js');
__pr.openModule(__pr);
var __ch = require('app/church_builtins');
__pr.openModule(__ch);
