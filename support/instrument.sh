#!/bin/bash
set -e

USAGE="
usage: instrument.sh project-dir target-dir

project-dir     Top level project directory to instrument.
target-dir      Directory in which to place instrumented code.
"

function main {
  if [ "$#" -ne "2" ] || [ ! -d "$1" ] || [ ! -d "$2" ]; then
    echo "$USAGE"
    exit 1
  fi

  this_dir=$(cd "$(dirname "$0")" && pwd)
  classpath=$this_dir/mclab/languages/Natlab/McLabCore.jar:$this_dir/java/build
  java -cp $classpath mclab.ide.callgraph.Instrument "$1" "$2"
}

main "$@"
