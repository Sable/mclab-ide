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
  this_dir=$(cd "$(dirname "$0")" && pwd)
  natlabjar=$this_dir/mclab/languages/Natlab/Natlab.jar
  refactoringbin=$this_dir/java/build
  java -cp $natlabjar:$refactoringbin "mclab.ide.refactoring.$1Tool" "${@:2}"
}

main "$@"
