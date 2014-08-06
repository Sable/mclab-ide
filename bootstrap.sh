#!/bin/bash
set -e

npm install
pip install -r requirements.txt
git submodule update --init
(cd support/mclab/languages/Natlab && ant jar)
(cd support/java && ant)
