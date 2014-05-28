#!/bin/bash
set -e

USAGE="
usage: extract-function.sh path selection newname

path         Path to file to refactor (e.g. myproject/f.m).
selection    Range of text to apply refactoring to.
             Format: startline,startcolumn-endline,endcolumn, e.g. 2,1-4,5
newname      Name of the new function.
"

function main {
  path=$1
  selection=$2
  newname=$3

  natlabjar=$HOME/code/java/mclab/languages/Natlab/Natlab.jar
  refactoringbin=$HOME/code/java/mclab-ide-support/build
  java -cp $natlabjar:$refactoringbin mclab.ide.refactoring.ExtractFunctionTool $path $selection $newname
}

if [ "$#" -ne "3" ]; then
  echo "$USAGE"
  exit 1
fi

main "$1" "$2" "$3"
