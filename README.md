[![Build Status](https://travis-ci.org/probmods/webchurch.png?branch=master)](https://travis-ci.org/probmods/webchurch)

Dependencies
============
- nodejs (see `package.json` for npm dependencies)

Installation & usage
====================

- `git submodule update --init --recursive`. This initializes the submodules (currently, just `probabilistic-js`)
- `npm install`. This will create a `node_modules` folder and install node dependencies there.
- `./compile.sh`. This makes a single js file and creates some symlinks.
- Point your browser to `./online/index.html`. Or, use the command line: `node test/test_basic.js`

