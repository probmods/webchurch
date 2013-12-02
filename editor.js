/* global require */

var evaluate = require('./evaluate').evaluate,
    format_result = require('./evaluate').format_result;

require("codemirror"); // this doesn't export anything but instead sets window.CodeMirror 

var _ = require('underscore');
_.templateSettings = {
  interpolate: /\{\{(.+?)\}\}/g
};

// return a dictionary of DOM element attributes
var getAttributes = function(x) {
  var attributes = {};
  // extract all info from 
  for(var i = 0, ii = x.attributes.length; i < ii; i++) {
    var attr = x.attributes.item(i),
        name = attr.name,
        value = attr.value;
    
    attributes[name] = value;
  }
  return attributes;
};


var runners = {};
runners['webchurch'] = makewebchurchrunner();
runners['webchurch-opt'] = makewebchurchrunner(true);

function makewebchurchrunner(evalparams){
  return function(editor) {
    var code = editor.getValue(),
        exerciseName = editor.exerciseName,
        $results = editor.$results,
        resultData = {'exercise_id': editor.exerciseName,
                      //'csrfmiddlewaretoken': Cookies.get('csrftoken')
                     };

    $results.show();
    if (editor.errormark != undefined){editor.errormark.clear()}
    try {
      //      var jsCode = church_to_js(code);
      //      jsCode = transform.probTransform(jsCode);
      //      var runResult = eval(jsCode),
      
      var runResult = evaluate(code,evalparams)
      
      var underlyingData
      
      if (typeof runResult == "function") {
        // otherwise, call the function with the current div as an argument
        underlyingData = runResult($results);
        //underlyingData = format_result(runResult($results));
      }
      else {
        //        runResult = format_result(runResult);
        // if we get back a string, just show the text
        underlyingData = runResult;
        runResult = format_result(runResult);
        $results.removeClass("error").text(runResult);
      } 

      resultData['forest_results'] =  JSON.stringify(underlyingData); 
      
    } catch (e) {
      
      var error = e.message;
      $results.addClass("error").text( error );
      
      if (e.stackarray != undefined) {
        $results.append("\nStack trace: " + e.stack );
        
        //        var errorlocation = e.stackarray[0]
        //        var start=errorlocation.start.split(":"), end=errorlocation.end.split(":")
        var start=e.start.split(":"), end=e.end.split(":")
        editor.errormark = editor.markText({line: Number(start[0])-1, ch: Number(start[1])-1},
                                           {line: Number(end[0])-1, ch: Number(end[1])},
                                           {className: "CodeMirrorError", clearOnEnter: true})
        //        mark.clear()
      }

      resultData['forest_errors'] = error;
    }

    // start trying to submit results
    // submitResult(resultData, editor);

  }};

var inject = function(domEl, options) {
  var attributes = getAttributes(domEl),
      text = options.text,
      defaultText = options.defaultText,
      selectedEngine = options.engine,
      exerciseName = options.exerciseName;
  
  // editor
  var editor = CodeMirror(
    function(el) {
      // var $ioContainer = $("<div class='io'></div");
      $(domEl).replaceWith(el);
    },
    {
      value: text,
      lineNumbers: false,
      matchBrackets: true,
      continueComments: "Enter",
      viewportMargin: Infinity,
      autoCloseBrackets: true
    });

  _(editor).extend(options);
  
  //fold ";;;fold:" parts:
  // var lastLine = editor.lastLine();
  // for(var i=0;i<=lastLine;i++) {
  //   var txt = editor.getLine(i),
  //       pos = txt.indexOf(";;;fold:");
  //   if (pos==0) {editor.foldCode(CodeMirror.Pos(i,pos),trippleCommentRangeFinder);}
  // }
  
  // results div
  var $results = $("<pre class='results'>");
  $results.css('display', 'none');

  // engine selector

  var engines = ["webchurch", "webchurch-opt", "cosh", "bher", "mit-church"],
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
    editor.setValue(defaultText);
    editor.$engineSelector.val(editor.defaultEngine);
    
    $results.hide().html('');

  });

  $resetButton.css('float', 'right');

  // run button
  var $runButton = $("<button class='run'>").html("Run");
  $runButton.click(function() {
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
      
      // asynchronously POST church code to /code/{exercise_name}
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

  var $codeControls = $("<div class='code-controls'>");
  // HT http://somerandomdude.com/work/open-iconic/#

  $codeControls.append(
    $runButton,
    $engineSelector[0],
    $resetButton[0]
  );

  $(editor.display.wrapper).after($codeControls);

  // add non-codemirror bits after codemirror
  $(editor.display.wrapper).attr("id", "ex-"+ exerciseName).after( $results );
  
  editor.$runButton = $runButton;
  editor.$engineSelector = $engineSelector;
  editor.$resetButton = $resetButton;
  editor.$results = $results;
  
};

// $(document).ready(function() {
//   $("pre:not(.norun)").map(function(index, item) {
//     var rawExerciseName = $(item).attr("data-exercise"),
//         defaultEngine = $(item).attr("data-engine") || 'webchurch',
//         defaultText = $(item).text(),
//         exerciseName;

//     if (typeof rawExerciseName == "undefined") {
//       exerciseName = [chapterName, index, md5(defaultEngine + defaultText)].join(".");
//     } else {
//       exerciseName = [chapterName, rawExerciseName].join(".");
//     }
    

//     // default options which get over-ridden
//     // if this box has an exerciseName
//     var editorOptions = {
//       exerciseName: exerciseName,
//       defaultText: defaultText,
//       boxNum: index,
//       text: defaultText,
//       defaultEngine: defaultEngine,
//       engine: defaultEngine
//     };
    
//     if (!loggedIn || !rawExerciseName) {
//       injectEditor(item, editorOptions); 
//     } else {
      
//       $.ajax({
//         url: "/code/" + exerciseName,
//         success: function(json) {
//           // overwrite defaults
//           _(editorOptions).extend({
//             text: json.code,
//             engine: json.engine
//           });

//           injectEditor(item, editorOptions);
//         },
//         error: function() {
//           console.log("failure loading exercise " + exerciseName + ", using default");
//           injectEditor(item, editorOptions);
//         }
//       });

      
//     }
//   });
// });



module.exports = {
  injector: inject
};
