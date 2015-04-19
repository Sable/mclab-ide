#!/bin/bash
set -e

USAGE="
usage: instrument.sh kind project-dir target-dir

kind            Either 'callgraph' or 'eval'
project-dir     Top level project directory to instrument.
target-dir      Directory in which to place instrumented code.
"

function main {
  if [ "$#" -ne "3" ] || [ ! -d "$2" ] || [ ! -d "$3" ] || [[ ! $1 =~ ^(callgraph|eval)$ ]]; then
    echo "$USAGE"
    exit 1
  fi

  this_dir=$(cd "$(dirname "$0")" && pwd)
  classpath=$this_dir/mclab/languages/Natlab/Natlab.jar:$this_dir/java/build
  java -cp $classpath mclab.ide.$1.Instrument "$2" "$3"
}

main "$@"
