#!/bin/bash

npm install
npm rebuild node-sass

pushd src/ServiceWorker/FilesGenerator
npm install
popd

grunt

((dotnet /app/Vidyano.Web2.Runner.dll > /vidyano/web2-runner-log.txt) &)