[![Build Status](https://travis-ci.org/probmods/webchurch.png?branch=master)](https://travis-ci.org/probmods/webchurch)

# Setup

## With git (preferred method)

1. install node by choosing your installer from [the node homepage](http://nodejs.org/download/)
2. if necessary, install git by following the instructions [at the git homepage](http://git-scm.com/downloads)
3. on the command line, go to wherever you want your webchurch folder to live. On OS X, run:

~~~~
git clone https://github.com/probmods/webchurch.git
cd webchurch
git init (only if you are on Windows)
git submodule update --init --recursive
npm install
./compile.sh
~~~~

note that you only need to run `git init` on Windows.

to pull-in and work in a particular branch (say `box2d`):

lists all branches, local and remote to see what `box2d` is called on remote

	   git branch -a

setup local branch box2d to track remote branch box2d

	   git branch -b box2d remote/origin/box2d

switch to branch box2d

	   git checkout box2d

## Without git

(not good for getting updates, but useful if you can't/don't want to get git installed)

1. install node by choosing your installer from [this page](http://nodejs.org/download/)
2. click on the Download ZIP button on the right (or on [this link](https://github.com/probmods/webchurch/archive/master.zip))
3. unarchive the zip file and go to that directory (called `webchurch-master`)
4. click [this link](https://github.com/dritchie/probabilistic-js/archive/15641a6e5d1e4d070767333521cc98eb8ec752ce.zip) to get the version of probabilistic-js we're using. unarchive this file, rename it to `probabilistic-js`, and move it into the `webchurch-master` folder (replacing the version of `probabilistic-js` that's there by default)
5. in terminal, go to `webchurch-master` folder and run the following commands:

		npm install
		./compile.sh

# Dependencies
- [nodejs](http://nodejs.org/download/) v0.10.26 (see `package.json` for npm dependencies)

Some people have reported that v0.10.28 doesn't work but that switching to v0.10.26 does

- Python (at least on Windows, version must be > 2.5 and < 3.0)


# Usage

## In a web browser
You can run the browser-based version by pointing your browser to `online/index.html`. However, if you wish to use the `load` builtin for dynamically loading Church or Javascript libraries, you will need to access `online/index.html` from the `http://` protocol rather than the `file://` protocol. We provide a simple way to do this. First, run `npm run-script server` on the command line and then point your browser to `http://localhost:8080/online/index.html`


- Command line: 

## On the command line
`church [OPTIONS] [FILE]` will run the contents of `[FILE]`.

Available options are:

- `-p, --precompile`: Turn on pre-compilation (very experimental)
- `-a, --program-args [MESSAGE]`: Arguments to pass to program. MESSAGE is sent to Church is the `argstring` variable.
- `-t, --timed`: Print out timing information.
- `-d, --desugar-only`: Apply Church desugaring without execution.
- `-c, --compile-only`: Compile to Javascript without execution.
- `-e, --disable-church-errors`: Disable special Church error checking and show Javascript errors instead.
