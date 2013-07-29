browserify \
  -r ./church_to_js \
  -r ./church_builtins \
  -r ./probabilistic/index \
  -r ./probabilistic/util \
  -r ./probabilistic/transform \
  > online/webchurch.js
