#!/bin/bash
set -e

npm install -g less bower
pip install -r requirements.txt
(cd ide/static && bower install)
git submodule init
git submodule update
(cd support/mclab/languages/Natlab && ant jar)
(cd support/java && ant)
