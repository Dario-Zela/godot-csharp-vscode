SOLUTION_DIR="./GodotDebugSession/"

GODOT_DEBUG_SESSION="./dist/GodotDebugSession/GodotDebugSession.exe"

all: package
	@echo "vsix created"

package: build
	./node_modules/.bin/vsce package

publish: build
	./node_modules/.bin/vsce publish

build: tsc
	@echo "build finished"


tsc:
	./node_modules/.bin/tsc -p ./
	./node_modules/.bin/webpack --mode production

tsc-debug:
	./node_modules/.bin/tsc -p ./
	./node_modules/.bin/webpack --mode development


clean:
	msbuild /t:Clean $(SOLUTION_DIR)/GodotDebugSession.sln
