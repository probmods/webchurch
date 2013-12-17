[![Build Status](https://travis-ci.org/probmods/webchurch.png?branch=master)](https://travis-ci.org/probmods/webchurch)

Dependencies
============
- nodejs (see `package.json` for npm dependencies)

Installation
============

- `git submodule update --init --recursive`. This initializes the submodules (currently, just `probabilistic-js`)
- `npm install`. This will create a `node_modules` folder and install node dependencies there.
- `./compile.sh`. This makes a single js file and creates some symlinks.

Usage
=====

- Local online demo: Point your browser to `./online/index.html`
- Command line: from the webchurch directory, run `node test/run_sandbox.js`, which executes the contents of `test/sandbox.church`, or pass in a file name as an argument.