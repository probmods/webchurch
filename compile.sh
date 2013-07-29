browserify \
  -r ./church_to_js \
  -r ./church_builtins \
  -r ./probabilistic-js/probabilistic/index \
  -r ./probabilistic-js/probabilistic/util \
  -r ./probabilistic-js/probabilistic/transform \
  -r ./probabilistic-js/probabilistic/marginalize \
  > online/web_church.js
