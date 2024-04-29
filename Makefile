init:
	npm init -y
	npm install @google/clasp tslint -D
	npm install @types/google-apps-script -S
	npm install tslint typescript -g
	tslint --init

	# create src
	mkdir src
	mv appsscript.json src
	touch src/main.ts

	# replace rootDir in .clasp.json
	 sed -i '' -E 's/"rootDir":".+"/"rootDir":"src"/g' .clasp.json

	# finish
	@echo "Done! Now you can start coding in src/main.ts"