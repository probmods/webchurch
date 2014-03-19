/* global require, CodeMirror, $ */

var evaluate = require('./evaluate').evaluate,
    format_result = require('./evaluate').format_result;

var d3 = require('d3');
require("codemirror"); // this doesn't export anything but instead sets window.CodeMirror
require("./cm-church");
require("./cm-brackets");
require("./cm-comments");
require("./viz");

var folding = require("./cm-folding");

CodeMirror.keyMap.default["Tab"] = "indentAuto";
CodeMirror.keyMap.default["Cmd-;"] = "toggleComment";
CodeMirror.keyMap.default["Cmd-."] = function(cm){cm.foldCode(cm.getCursor(), folding.myRangeFinder); };

CodeMirror.keyMap.default["Ctrl-;"] = "toggleComment";
CodeMirror.keyMap.default["Ctrl-."] = function(cm){cm.foldCode(cm.getCursor(), folding.myRangeFinder); };


var _ = require('underscore');
_.templateSettings = {
  interpolate: /\{\{(.+?)\}\}/g
};

var runners = {};
runners['webchurch'] = makewebchurchrunner();
runners['webchurch-opt'] = makewebchurchrunner(true);

function makewebchurchrunner(evalparams){
  return function(editor) {
    var code = editor.getValue(),
        exerciseName = editor.exerciseName,
        $results = editor.$results;

    $results.show();
    if (editor.errormark != undefined){editor.errormark.clear(); }
    try {      
      var runResult = evaluate(code,evalparams);
      
      var underlyingData;

      // render all side effects
      sideEffects.forEach(function(e) {
        if (e.type == "string") {
          $results.append( $("<pre>"+e.data+"</pre>") );
        }
        if (e.type == "svg") {
          $results.append( $("<div></div>").append(e.data));
          // try {
          //   d3.select($results[0]).append(e.data);
          // } catch (err) {
          //   debugger;
          // }
        }
        
      }); 
      
      //        runResult = format_result(runResult);
      // if we get back a string, just show the text
      underlyingData = runResult;
      runResult = format_result(runResult);
      $results.removeClass("error").append($("<pre>"+runResult+'</pre>'));
      
    } catch (e) {
      
      var error = e.message;
      $results.addClass("error").text( error );
      
      if (e.stackarray != undefined) {
        $results.append("\nStack trace: " + e.stack );
        
        //        var errorlocation = e.stackarray[0]
        //        var start=errorlocation.start.split(":"), end=errorlocation.end.split(":")
        var start=e.start.split(":"), end=e.end.split(":");
        editor.errormark = editor.markText({line: Number(start[0])-1, ch: Number(start[1])-1},
                                           {line: Number(end[0])-1, ch: Number(end[1])},
                                           {className: "CodeMirrorError", clearOnEnter: true});
        //        mark.clear()
      }

    } 
  };
};

var inject = function(domEl, options) {
  options = _(options).defaults({
    defaultText: "",
    exerciseName: "",
    defaultEngine: "webchurch"
  }); 
  
  // editor
  var editor = CodeMirror(
    function(el) {
      $(domEl).replaceWith(el);
    },
    {
      value: options.defaultText,
      lineNumbers: false,
      matchBrackets: true,
      continueComments: "Enter",
      viewportMargin: Infinity,
      autoCloseBrackets: true,
      mode: 'scheme'
    });

  _(editor).extend(options);
  editor.engine = editor.defaultEngine;
  
  //fold ";;;fold:" parts:
  var lastLine = editor.lastLine();
  for(var i=0;i<=lastLine;i++) {
    var txt = editor.getLine(i),
        pos = txt.indexOf(";;;fold:");
    if (pos==0) {editor.foldCode(CodeMirror.Pos(i,pos),folding.tripleCommentRangeFinder);}
  }
  
  // results div
  var $results = $("<div class='results'>");
  $results.css('display', 'none');

  // engine selector

  var engines = ["webchurch", "webchurch-opt"],
      engineSelectorString = "<select>\n" + _(engines).map(
        function(engine) {
          var tmpl = _.template('<option value="{{ engine }}" {{ selectedString }}> {{ engine }} </option>'),
              str = tmpl({
                engine: engine,
                selectedString: engine == editor.engine ? "selected" : ""
              });

          return str; 
        } 
      ).join("\n") + "\n</select>",
      $engineSelector = $(engineSelectorString);
  
  $engineSelector.change(function(e) {
    editor.engine = $(this).val();
  });

  // reset button
  var $resetButton = $("<button>").html("Reset");
  $resetButton.click(function() {
    editor.setValue(options.defaultText);
    editor.$engineSelector.val(options.defaultEngine);
    
    $results.hide().html('');

  });

  $resetButton.css('float', 'right');

  // run button
  var $runButton = $("<button class='run'>").html("Run");
  $runButton.click(function() {
    if (options.onRunStart) {
      options.onRunStart(editor);
    }
    
    sideEffects = [];
    $results.html('');
    $runButton.attr('disabled','disabled');

    var newCode = editor.getValue(),
        newEngine = editor.engine;

    // submit church code to accounts server if the
    // code has actually changed or we're running
    // with a different engine
    if (editor.oldCode != newCode || editor.oldEngine != newEngine) {
      // unset editor.codeId
      editor.codeId = false; 
    }
    
    editor.oldCode = newCode;
    editor.oldEngine = newEngine;

    // use runner on this editor
    // use setTimeout so the run-button disabling actually
    // shows up on the DOM
    setTimeout(function() { runners[editor.engine](editor);
                            if (editor.engine == "webchurch" || editor.engine == "webchurch-opt") {
                              $runButton.removeAttr('disabled');
                            }
                          }, 15);
  });

  $runButton.css({'padding-top': '5px',
                  'padding-bottom': '5px'
                 });

  var $codeControls = $("<div class='code-controls'>");
  // HT http://somerandomdude.com/work/open-iconic/#

  $codeControls.append(
    $runButton,
    $engineSelector[0],
    $resetButton[0]
  );

  // add code controls and results divs after codemirror
  $(editor.display.wrapper).after($codeControls, $results);


  $(editor.display.wrapper).attr("id", "ex-"+ options.exerciseName);
  
  editor.$runButton = $runButton;
  editor.$engineSelector = $engineSelector;
  editor.$resetButton = $resetButton;
  editor.$results = $results;
  
};

module.exports = {
  injector: inject
};
