# echo "- Update probabilistic-js"
# git submodule update --recursive

echo "- Update npm packages"
npm install

echo "- Install hooks"
if [ -d ".git" ]
then
    if [ -d ".git/hooks" ]
    then
        cp hooks/* .git/hooks/
    fi
fi

echo "- Browserify"
# HT many responses on http://stackoverflow.com/q/16275325/351392
node node_modules/browserify/bin/cmd.js --fast \
    -r app/probabilistic-js \
    -r app/type-utils.js \
    -r app/viz \
    -r app/church_builtins \
    -r app/evaluate \
    -r app/editor \
    -r app/cm-brackets \
    -r app/cm-folding \
    -r app/cm-church \
    -r app/cm-comments \
    -r app/util.js \
    -r d3 \
    -o online/webchurch.js

# echo "- Add webworkers stub"
# cat online/webchurch.js ww-stub.js > online/webchurch-ww.js

echo "- Minify"
./node_modules/uglify-js/bin/uglifyjs online/webchurch.js -o online/webchurch.min.js

echo "- Make docs"
node make-docs.js > online/ref.html

echo "Done"
