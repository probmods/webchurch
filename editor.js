/* global require, CodeMirror, $ */

var evaluate = require('./evaluate').evaluate,
    format_result = require('./evaluate').format_result;

var d3 = require('d3');
var CodeMirror = require("codemirror");
require("./cm-church");
require("./cm-brackets");
require("./cm-comments");
require("./viz");

var Backbone = require('backbone');

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
runners['webchurch-opt'] = makewebchurchrunner({precompile: true});

runners['cosh'] = function() { }
runners['bher'] = function() { }
runners['mit-church'] = function() { }

function wrap(tag, content) {
    return _.template("<{{tag}}>{{content}}</{{tag}}>",
                      {tag: tag,
                       content: content
                      });
}

function makewebchurchrunner(engineOptions){
    if (engineOptions === undefined) {
        engineOptions = {}
    }
    return function(ed) {
        var cm = ed.get('cm');
        var code = ed.get('code');

        // make new $results div, which will replace
        // the old one stored in ed.display.$results
        $results = $("<div class='results'>");

        if (cm.errormark != undefined) {
            cm.errormark.clear();
        }

        ed.trigger('run.start');
        try {
            var runResult = evaluate(code, engineOptions);
            var underlyingData;

            // render all side effects
            sideEffects.forEach(function(e) {
                if (e.type == "string") {
                    $results.append( $("<pre>"+e.data+"</pre>") );
                }
                if (e.type == "svg") {
                    $results.append( $("<div></div>").append(e.data));
                }
                if (e.type == "table") {
                    var tableString = wrap("table", e.data.map(function(row) {
                        var cols = row.map(function(x) { return wrap('td', x); }).join("");
                        return wrap("tr", cols);
                    }).join("\n"));
                    $results.append( $(tableString) );
                }
                if (e.type == "function") {
                    e.data($results);
                }
            });
            
            underlyingData = runResult;
            runResult = format_result(runResult);
            if (!(runResult == "undefined")) {
                $results.append($("<pre>"+runResult+'</pre>'));
            } 
        } catch (e) {
            var error = e.message;
            $results
                .append( $("<p></p>")
                         .addClass('error')
                         .text(error) );
            if (e.stackarray != undefined) {
                var churchStack = $("<pre></pre>");
                churchStack.text(e.stackarray
                                 .map(function(x) { return _.template("{{text}}: {{start}}-{{end}}", x) })
                                 .join("\n"))
                $results.append( '<div><u>Church stack array:</u></div>', churchStack);
                var start=e.start.split(":"), end=e.end.split(":");
                cm.errormark = cm.markText({line: Number(start[0])-1, ch: Number(start[1])-1},
                                           {line: Number(end[0])-1, ch: Number(end[1])},
                                           {className: "CodeMirrorError", clearOnEnter: true});
            }
            var jsStack = $("<pre></pre>");
            jsStack.text(e.jsStack.join('\n'));
            $results.append('<div><u>JS stack:</u></div>', jsStack );
        } finally {
            ed.display.$results.replaceWith($results);
            ed.display.$results = $results;

            ed.trigger('run.finish');
        }
    };
};

var EditorModel = Backbone.Model.extend({
    initialize: function(options) {
        this.set('initialOptions', options);
    },
    defaults: {
        code: "",
        engine: "webchurch"
    },
    run: function() {
        var engine = runners[this.get('engine')];
        this.set('result', engine( this ));
    },
    supplant: function(domEl) {
        $(domEl).replaceWith(this.display.wrapper);
        // if we place the item ourselves, we have to call refresh() on the
        // codemirror instance HT http://stackoverflow.com/q/10575833/351392 
        this.get('cm').refresh();
    }
});

// return a backbone model
var inject = function(domEl, options) {
    options = _(options).defaults({
        code: $(domEl).text(),
        engine: "webchurch",
        exerciseName: "" 
    });

    var ed = new EditorModel(options);
    // if (options.engine != 'webchurch') {
    //   debugger;
    // }
    
    // editor
    var cm = CodeMirror(
        function(el) {
            // defer this - we might not want to display immediately...
            // (e.g., when we want to first fetch network results)
        },
        {
            value: options.code,
            lineNumbers: false,
            matchBrackets: true,
            continueComments: "Enter",
            viewportMargin: Infinity,
            autoCloseBrackets: true,
            mode: 'scheme'
        });

    ed.set('cm', cm);

    // when text in codemirror changes, update editormodel
    cm.on('change', function(cmInstance) {
        ed.set('code', cmInstance.getValue())
    });
    
    //fold ";;;fold:" parts:
    var lastLine = cm.lastLine();
    for(var i=0;i<=lastLine;i++) {
        var txt = cm.getLine(i),
            pos = txt.indexOf(";;;fold:");
        if (pos==0) {cm.foldCode(CodeMirror.Pos(i,pos),folding.tripleCommentRangeFinder);}
    }
    
    // results div
    var $results = $("<div class='results'>");
    $results.hide();

    // engine selector

    var engines = ["webchurch", "webchurch-opt"],
        engineSelectorString = "<select>\n" + _(engines).map(
            function(engine) {
                var tmpl = _.template('<option value="{{ engine }}" {{ selectedString }}> {{ engine }} </option>'),
                    str = tmpl({
                        engine: engine,
                        selectedString: engine == cm.engine ? "selected" : ""
                    });

                return str; 
            } 
        ).join("\n") + "\n</select>",
        $engineSelector = $(engineSelectorString);

    // when engine selector changes, update model
    $engineSelector.change(function(e) {
        ed.set('engine', $(this).val() );
    });

    // reset button
    var $resetButton = $("<button class='reset'>").html("Reset");
    $resetButton.click(function() {
        cm.setValue( ed.get('initialOptions').code );
        ed.$engineSelector.val( ed.get('initialOptions').engine ); 
        $results.hide.html('');
    });

    // run button
    var $runButton = $("<button class='run'>").html("Run");
    $runButton.click(function() {
        ed.display.$results.find('*').css('opacity','0.7');
        $runButton.attr('disabled','disabled');

        // NB: can't write just ed.run
        // because then "this" becomes window 
        // and i don't wanna bother with function binding
        setTimeout(function() { ed.run() }, 30);

        ed.on('run.finish', function() {
            $runButton.removeAttr('disabled');
        })
    }); 

    var $codeControls = $("<div class='code-controls'>");
    // HT http://somerandomdude.com/work/open-iconic/#

    $codeControls.append(
        // $resetButton[0],
        // $engineSelector[0],
        $runButton
    );

    var $cogMenu = $("<ul class='code-settings'></ul>");
    $cogMenu.append(
        "<li class='settings-icon'>&#x2630;</li>",
        $("<li></li>").append($engineSelector[0]),
        $("<li></li>").append($resetButton[0])
    );

    $(cm.display.wrapper).prepend($cogMenu);

    // create wrapper element for editor
    var wrapper = document.createElement('div');

    $(cm.display.wrapper).attr("id", "ex-" + options.exerciseName);
    
    // add code controls and results divs after codemirror 
    $(cm.display.wrapper).prepend($codeControls);

    $(wrapper)
        .append(cm.display.wrapper)
        .append($results); 

    ed.display = {
        wrapper: wrapper,
        $runButton: $runButton,
        $engineSelector: $engineSelector,
        $results: $results
    }

    
    return ed;
    
};

module.exports = {
    injector: inject
};
