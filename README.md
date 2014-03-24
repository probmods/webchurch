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

- Local online demo: Point your browser to `./online/index.html`. If you make changes to the webchurch source code, you can recompile the browser binary by running `compile.sh`.
- Command line: from the webchurch directory, run `church test/foo.church` to execute the contents of `test/foo.church`.
