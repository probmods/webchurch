/* global global, console, require, process */

global["evaluate"] = require('../evaluate.js').evaluate;

var log = function() {
  var array = Array.prototype.slice.call(arguments, 0);
  array.forEach(function(x) {
    console.log(x);
  }); 
};

var pc = process.argv.some(function(x){return x.match(/-pc/)});

//console.log("pc",pc)

// make a string appear red in terminal
// HT http://stackoverflow.com/a/17524301/351392
var red = function(str) {
  return "\033[31m" + str + ":\033[91m";
};

var evaluate = require("../evaluate.js").evaluate;
var church_builtins = require("../church_builtins.js");
var format_result = require("../evaluate.js").format_result;
var fs = require('fs');

var tests = [];

// parse tests from a .church file
function parseChurch(src) {
  var cases = src.split("\n\n");
  cases = cases.map(function(c) {
    c = c.trim();
    var lines = c.split("\n");
    var wantedOutput = lines.pop();
    var input = lines.join("\n"); 
    
    return {
      input: input,
      wantedOutput: wantedOutput
    }; 
  });
  return cases;
}

// parse tests from a .md file exported from probmods
// for now, just want things to run without errors
function parseMd(src) {
  var lines = src.split("\n");
  var inInput = false;
  var cases = [];

  for(var i = 0, ii = lines.length, inputLines = []; i < ii; i++) {
    var line = lines[i];

    if (line.match(/~~~~/) && !line.match(/test/)) {
      if (inInput) {
        inInput = false;
        var input = inputLines.join('\n');

        // don't run incomplete code (includes ...)
        // or physics code
        if (!input.match(/\.\.\.|runPhysics/)) {
          cases.push({ input: inputLines.join("\n")});
        }
        inputLines = []; 
      }
    }
    
    if (inInput) {
      inputLines.push(line);
    }
    
    if (line.match(/~~~~ {/) ) {
      if (line.match(/norun|mit-church/)) {
        inInput = false;
      } else {
        inInput = true;
      }
    }

  }

  return cases;
  
}

var parsers = {
  'md': parseMd,
  'church': parseChurch
};

// shims for probmods
global.hist = function(x) { return x };
global.multiviz = function(x) { return x };
global.density = function(x) { return x };
global.runPhysics = function(x) { return x };
global.animatePhysics = function(x) { return x };
global.scatter = function(x) { return x };
global['draw-rect'] = function(x) { return x };
global['raphael-js'] = function(x) { return x };
global['make-raphael'] = function(x) { return x };
global['lineplot'] = function(x) { return x };
global['lineplot-value'] = function(x) { return x };
global['_46_46_46'] = true; // for ...
global.worldWidth = 350;
global.worldHeight = 500;

function runTests(filename) {
  var src = fs.readFileSync(filename, 'utf8');
  var filenameSplit = filename.split(".");
  var fileExtension = filenameSplit[filenameSplit.length-1]; 
  var parser = parsers[fileExtension];

  var cases = parser(src);
  
  var numCases = cases.length;
  var numPassed = 0;

  // for each case, parse the last line as
  // the desired output
  var testResults = cases.map(function(c, index) {
    var input = c.input;
    var wantedOutput = c.wantedOutput;
    
    try {
      var actualOutput = format_result( evaluate(input) );
      if (typeof wantedOutput != 'undefined' && actualOutput != wantedOutput) {
        log(red("Test " + index + " failed"),
            //input,
            red("Wanted"),
            wantedOutput,
            red("Actual"),
            actualOutput,""
            );
      } else {
        numPassed++;
        //process.stdout.write(".");
      } 
    } catch(e) {
      log(red("Test " + index + " failed"),
          input,
          red('Exception'),
          e,'');
    }
    
    c.actualOutput = actualOutput;
    return c;
  });
  
  log("");
  var allPassed = (numPassed == numCases); 
  log("",
      "Passed " + numPassed + " / " + numCases + " tests",
      allPassed ? "Good" : "Bad" );

  process.exit(allPassed ? 0 : 1);
}

var srcfile = process.argv[process.argv.length-1];

runTests(srcfile);
// runTests("probmods/appendix-scheme.md");
// runTests("probmods/generative-models.md");
// runTests("probmods/conditioning.md");
// runTests("probmods/patterns-of-inference.md");
// runTests("probmods/observing-sequences.md");
// runTests("probmods/inference-about-inference.md");
// runTests("probmods/inference-process.md");
// runTests("probmods/learning-as-conditional-inference.md");
// runTests("probmods/hierarchical-models.md");
// runTests("probmods/occam's-razor.md");
// runTests("probmods/mixture-models.md");
// runTests("probmods/non-parametric-models.md");
// runTests("probmods/appendix-language.md");
// runTests("probmods/appendix-conjugate-exponential.md");




