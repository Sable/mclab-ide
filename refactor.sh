#!/bin/bash
set -e

USAGE="
usage: refactor.sh which path selection [args...]

which        Refactoring to perform, e.g. ExtractVariable
path         Path to file to refactor (e.g. myproject/f.m).
selection    Range of text to apply refactoring to.
             Format: startline,startcolumn-endline,endcolumn, e.g. 2,1-4,5
args         Any extra required params (e.g. newName for extract function)
"

function main {
  natlabjar=$HOME/code/java/mclab/languages/Natlab/Natlab.jar
  refactoringbin=$HOME/code/java/mclab-ide-support/build
  java -cp $natlabjar:$refactoringbin "mclab.ide.refactoring.$1Tool" "${@:2}"
}

main "$@"
