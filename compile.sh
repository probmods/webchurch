# move probabilistic-js/probabilistic into current directory
cp -r probabilistic-js/probabilistic .

# compile
browserify \
  -r ./church_builtins \
  -r ./evaluate \
  -r ./probabilistic/index \
  -r ./probabilistic/util \
  -r ./probabilistic/transform \
  > online/webchurch.js

# remove probabilistic directory
rm -rf probabilistic

cat online/webchurch.js ww-stub.js > online/webchurch-ww.js
