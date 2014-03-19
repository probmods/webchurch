# echo "- Update probabilistic-js"
# git submodule update --recursive

echo "- Installing hooks"
if [ -d ".git" ]
then
    if [ -d ".git/hooks" ]
    then
        cp hooks/* .git/hooks/
    fi
fi

echo "- Browserifying"
# HT many responses on http://stackoverflow.com/q/16275325/351392
node node_modules/browserify/bin/cmd.js --fast \
  -r ./probabilistic-js \
  -r ./type-utils.js \
  -r ./viz \
  -r ./church_builtins \
  -r ./evaluate \
  -r ./editor \
  -r ./cm-brackets \
  -r ./cm-folding \
  -r ./cm-church \
  -r ./cm-comments \
  -o online/webchurch.js

echo "- Add webworkers stub"
cat online/webchurch.js ww-stub.js > online/webchurch-ww.js

echo "Done"
