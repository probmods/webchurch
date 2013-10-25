# update probjs submodule
git submodule update --recursive

# symlink probabilistic-js/probabilistic into current directory
if [ ! -e probabilistic ]
then
ln -s probabilistic-js/probabilistic .
fi

# compile
browserify \
  -r ./church_builtins \
  -r ./evaluate \
  -r ./probabilistic/index \
  -r ./probabilistic/util \
  -r ./probabilistic/transform \
  > online/webchurch.js

# add webworkers stub for compiled webworkers version
cat online/webchurch.js ww-stub.js > online/webchurch-ww.js
