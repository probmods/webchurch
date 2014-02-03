# echo "- Update probabilistic-js"
# git submodule update --recursive

echo "- Symlinking probabilistic-js"
# symlink probabilistic-js/probabilistic into current directory
if [ ! -e probabilistic ]
then
ln -s probabilistic-js/probabilistic .
fi

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
  -r ./probabilistic/index \
  -r ./probabilistic/util \
  -r ./probabilistic/transform \
  > online/webchurch.js

echo "- Add webworkers stub"
cat online/webchurch.js ww-stub.js > online/webchurch-ww.js

echo "Done"
