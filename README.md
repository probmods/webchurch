[![Build Status](https://travis-ci.org/probmods/webchurch.png?branch=master)](https://travis-ci.org/probmods/webchurch)

webchurch setup WITH git (preferred method)
============
for those who do want to install git (or already have it installed)
1. install node by choosing your installer from [this page](http://nodejs.org/download/)
2. install git (if neccessary) by following the instructions [here](http://git-scm.com/downloads)
2. `git clone https://github.com/probmods/webchurch.git`
2. `git submodule update --init --recursive`
5. `npm install`
6. `./compile.sh`
7. run in the terminal: `./church NAME_OF_YOUR_CHURCH_FILE`

webchurch setup WITHOUT git (not good for getting updates, but useful if you can't/don't want to get git installed)
============
1. install node by choosing your installer from [this page](http://nodejs.org/download/)
2. click on the Download ZIP button on the right (or on [this link](https://github.com/probmods/webchurch/archive/master.zip))
3. unarchive the zip file and go to that directory (called `webchurch-master`)
4. click [this link](https://github.com/dritchie/probabilistic-js/archive/15641a6e5d1e4d070767333521cc98eb8ec752ce.zip) to get the version of probabilistic-js we're using. unarchive this file, rename it to `probabilistic-js`, and move it into the `webchurch-master` folder (replacing the version of `probabilistic-js` that's there by default)
5. `npm install`
6. `./compile.sh`
7. run in the terminal: `./church NAME_OF_YOUR_CHURCH_FILE`

Dependencies
============
- [nodejs](http://nodejs.org/download/) (see `package.json` for npm dependencies)


Installation
============

- `git submodule update --init --recursive`. This initializes the submodules (currently, just `probabilistic-js`)
- `npm install`. This will create a `node_modules` folder and install node dependencies there.
- `./compile.sh`. This makes a single js file and creates some symlinks.

Usage
=====

- Local online demo: Point your browser to `./online/index.html`. If you make changes to the webchurch source code, you can recompile the browser binary by running `compile.sh`.
- Command line: from the webchurch directory, run `church test/foo.church` to execute the contents of `test/foo.church`.

Command line arguments
======================

- -p, --precompile: Turn on pre-compilation.
- -a, --program-args [MESSAGE]: Arguments to pass to program. MESSAGE is sent to Church is the `argstring` variable.
- -t, --timed: Print out timing information.
- -d, --desugar-only: Apply Church desugaring without execution.
- -c, --compile-only: Compile to Javascript without execution.
- -e, --disable-church-errors: Disable special Church error checking and show Javascript errors instead.