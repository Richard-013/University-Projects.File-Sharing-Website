#!/usr/bin/env bash

set -e
echo --------------------------
echo Automated Acceptance Tests
echo --------------------------
echo Creating Screenshots Directory
mkdir -p screenshots
echo Screenshots Directory Created
echo Creating Trace Directory
mkdir -p trace
echo Trace Directory Created
echo Removing Previous Database Files
rm -rf *.db
echo Previous Database Files Removed
echo Remove Old Server Files
rm -rf files/uploads
echo Old Server Files Removed
echo Remove Download Test Files
rm -rf acceptance\ tests/downloads
echo Old Download Test Removed
echo Creating New Download Test Directory
mkdir -p acceptance\ tests/downloads
echo Download Test Directory Created
echo Starting Server and Running Tests
echo ------------------------------------
node index.js&
node_modules/.bin/jest --runInBand --detectOpenHandles acceptance\ tests/* # Normal Acceptance Test Running
#node_modules/.bin/jest --runInBand --detectOpenHandles --updateSnapshot acceptance\ tests/* # Update Snapshots
echo ------------------------------------
echo Tests Complete
read -p "Press Enter to Continue"
