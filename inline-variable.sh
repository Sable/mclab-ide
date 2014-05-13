#!/bin/bash
set -e

USAGE="
usage: inline-variable.sh path selection

path         Path to file to refactor (e.g. myproject/f.m).
selection    Range of text to apply refactoring to.
             Format: startline,startcolumn-endline,endcolumn, e.g. 2,1-4,5
"

function main {
  path=$1
  selection=$2

  natlabjar=$HOME/code/java/mclab/languages/Natlab/Natlab.jar
  refactoringbin=$HOME/code/java/mclab-ide-support/bin
  java -cp $natlabjar:$refactoringbin mclab.ide.refactoring.InlineVariableTool $path $selection
}

if [ "$#" -ne "2" ]; then
  echo "$USAGE"
  exit 1
fi

main "$1" "$2"
