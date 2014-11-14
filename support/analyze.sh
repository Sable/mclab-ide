#!/bin/bash
set -e

USAGE="
usage: analyze project-dir

project-dir     Top level project directory to search.
"

function main {
  if [ "$#" -ne "1" ] || [ ! -d "$1" ]; then
    echo "$USAGE"
    exit 1
  fi

  this_dir=$(cd "$(dirname "$0")" && pwd)
  classpath=$this_dir/mclab/languages/Natlab/Natlab.jar:$this_dir/java/build
  java -cp $classpath mclab.ide.eval.RedundantEvalDetector "$1"
}

main "$@"
