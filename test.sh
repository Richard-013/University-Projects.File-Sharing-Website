#!/usr/bin/env bash

set -e
echo Beginning Automated Acceptance Tests
echo Creating Screenshots Directory
mkdir -p screenshots
echo Screenshots Directory Created
echo Creating Trace Directory
mkdir -p trace
echo Trace Directory Created
echo Removing Previous Database Files
rm -rf *.db
echo Previous Database Files Removed
echo Starting Server and Running Tests
node index.js&
node_modules/.bin/jest --runInBand --detectOpenHandles acceptance\ tests/* # Normal Acceptance Test Running
#node_modules/.bin/jest --runInBand --detectOpenHandles --updateSnapshot acceptance\ tests/* # Update Snapshots
read -p "Tests Complete\nPress Enter to Continue"
