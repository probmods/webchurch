# webchurch [![Build Status](https://travis-ci.org/probmods/webchurch.svg?branch=master)](https://travis-ci.org/probmods/webchurch)



## Dependencies
- [nodejs](http://nodejs.org/download/) v4.1+

## Installing

On the command line, type:

```sh
npm install -g webchurch
```

(If this fails, try `sudo npm install -g webchurch`)

## Usage

### Command line
`church [OPTIONS] [FILE]` will run the contents of `[FILE]`.

Available options:

- `-p, --precompile`: Turn on pre-compilation (very experimental)
- `-a, --program-args [MESSAGE]`: Arguments to pass to program. MESSAGE is sent to Church is the `argstring` variable.
- `-s, --seed [SEED]`: Set the seed for the random number generator.
- `-t, --timed`: Print out timing information.
- `-d, --desugar-only`: Apply Church desugaring without execution.
- `-c, --compile-only`: Compile to Javascript without execution.
- `-e, --disable-church-errors`: Disable special Church error checking and show Javascript errors instead.

### In a web browser
First, compile webchurch.js:

```sh
make online/webchurch.js
```

Then open `online/index.html` in your browser.
If you wish to use the `load` builtin for dynamically loading Church or Javascript libraries, you will need to access this page from the `http://` protocol rather than the `file://` protocol.

To do this, run `npm run server` on the command line and then point your browser to `http://localhost:8080/online/index.html`


# dev notes

Updating probabilistic-js subtree:

```sh
git subtree pull --prefix src/probabilistic-js probabilistic-js master --squash
```
