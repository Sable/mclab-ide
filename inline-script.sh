#!/bin/bash
set -e

USAGE="
usage: inline-script.sh path selection

path         Path to file to refactor (e.g. myproject/f.m).
"

function main {
  path=$1
  selection=$2

  natlabjar=$HOME/code/java/mclab/languages/Natlab/Natlab.jar
  refactoringbin=$HOME/code/java/mclab-ide-support/build
  java -cp $natlabjar:$refactoringbin mclab.ide.refactoring.InlineScriptTool $path 1,1-1,1
}

if [ "$#" -ne "1" ]; then
  echo "$USAGE"
  exit 1
fi

main "$1"
