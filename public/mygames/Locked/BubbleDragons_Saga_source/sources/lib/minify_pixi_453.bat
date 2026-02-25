@echo minify PIXI 435pjb source
cd ..
node node_modules\uglify-js\bin\uglifyjs ^
lib\pixi_453pjb.js ^
-o lib\pixi_453pjb.min.js ^
--source-map ^
--max-line-len 2048 ^
--reserved-names PIXI ^
--screw-ie8 ^
--lift-vars ^
--reserve-domprops
cd lib
