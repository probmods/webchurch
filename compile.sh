echo "- Update probabilistic-js"
git submodule update --recursive

echo "- Symlinking probabilistic-js"
# symlink probabilistic-js/probabilistic into current directory
if [ ! -e probabilistic ]
then
ln -s probabilistic-js/probabilistic .
fi

echo "- Installing hooks"
cp hooks/* .git/hooks/

echo "- Browserifying"
browserify \
  -r ./church_builtins \
  -r ./evaluate \
  -r ./probabilistic/index \
  -r ./probabilistic/util \
  -r ./probabilistic/transform \
  > online/webchurch.js

echo "- Add webworkers stub"
cat online/webchurch.js ww-stub.js > online/webchurch-ww.js

echo "Done"
