browserify : online/webchurch.js

# online/webchurch.js : src/*
# 	@node node_modules/browserify/bin/cmd.js --fast \
# 	    -r app/probabilistic-js \
# 	    -r app/type-utils \
# 	    -r app/viz \
# 	    -r app/church_builtins \
# 	    -r app/evaluate \
# 	    -r app/editor \
# 	    -r app/cm-brackets \
# 	    -r app/cm-folding \
# 	    -r app/cm-church \
# 	    -r app/cm-comments \
# 	    -r app/util \
# 	    -r d3 \
# 	    -o online/webchurch.js

online/webchurch.js : src/*
	@node node_modules/browserify/bin/cmd.js src/index.js -o online/webchurch.js

watchify :
	@node node_modules/watchify/bin/cmd.js src/index.js -v -o online/webchurch.js

minify : online/webchurch.js
	@./node_modules/uglify-js/bin/uglifyjs online/webchurch.js -o online/webchurch.min.js

docs : online/ref.html

online/ref.html : src/church_builtins.js
	@node make-docs.js > online/ref.html

node_modules : package.json
	@npm install

node_modules/app : node_modules
	@ln -s ../src node_modules/app

src/probabilistic-js :
	git subtree pull --prefix src/probabilistic-js probabilistic-js master --squash

all: .git/hooks src/probabilistic-js node_modules minify docs

.git/hooks : hooks
	@cp hooks/* .git/hooks/

clean :
	@rm -f online/webchurch.js online/webchurch.min.js online/ref.html

lint.log :
	gjslint --nojsdoc --max_line_length 99999 src/*.js > lint.log
