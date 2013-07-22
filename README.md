probabilistic-js
================

Turning V8 Javascript into a probabilistic programming language.

V8's CallSite API (which I used for tracking execution traces) unfortunately doesn't provide a way to get a lexically-unique id for a function (i.e. an id for the function's code). Getting around this requires all function declarations/expressions that will be used in probabilistic programs to be wrapped in a decorator function `prob`. You can do this yourself, or you can use the utilities in `probabilistic/transform.js` to perform automatic source code transformation (Induces dependencies on [esprima](https://github.com/ariya/esprima) and [escodegen](https://github.com/Constellation/escodegen)).

Programs written in probabilistic-js can also be run in the browser via [Browserify](https://github.com/substack/node-browserify). The `webppl` directory contains the framework for a simple example (using the excellent [CodeMirror](http://codemirror.net/) widget). You'll need to browserify the `probabilistic`, `probabilistic/transform`, and `probabilistic/util` modules to get it working:

	node browserify -r ./probabilistic/index -r ./probabilistic/transform -r ./probabilistic/util > webppl/probabilistic.js

where `browserify` refers to `browserify/bin/cmd.js`. A running instance of this web demo can be found [here](http://graphics.stanford.edu/~dritchie/webppl).