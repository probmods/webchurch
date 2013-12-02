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
node node_modules/browserify/bin/cmd.js \
  -r ./church_builtins \
  -r ./evaluate \
  -r ./editor \
  -o online/webchurch.js

echo "- Add webworkers stub"
cat online/webchurch.js ww-stub.js > online/webchurch-ww.js

echo "Done"
