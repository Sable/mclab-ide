#!/bin/bash
set -e

USAGE="
usage: callgraph.sh --project-dir=dir --entry-point=expr [--target-dir=dir]

--project-dir DIR      Top level project directory to instrument.
                       Required.
--entry-point EXPR     MATLAB expression to start evaluating.
                       Required.
--target-dir DIR       Directory in which to place instrumented code.
                       Defaults to '\$project-dir_instrumented'
"

function main {
  current_dir=$(pwd)

  project_dir=$1
  target_dir=$2
  log_file=$3
  entry_point=$4

  natlabjar=$HOME/code/java/mclab/languages/Natlab/Natlab.jar
  java -cp $natlabjar:bin mclab.ide.callgraph.Instrument $project_dir $target_dir

  cd $target_dir
  matlab >/dev/null -nojvm -r "mclab_callgraph_init('$log_file'); $entry_point; exit"
  cd $current_dir
  cat $log_file
}



function getarg {
  echo "$1" | cut -d= -f2
}

project_dir=''
target_dir=''
entry_point=''

while test $# != 0; do
  case "$1" in
  --project-dir*)
    project_dir=$(getarg "$1")
    ;;
  --target-dir*)
    target_dir=$(getarg "$1")
    ;;
  --entry-point*)
    entry_point=$(getarg "$1")
    ;;
  *)
    echo "unrecognized argument: $1"
    echo "$USAGE"
    exit 1
    ;;
  esac
  shift
done

if [ -z "$project_dir" ] || [ -z "$entry_point" ]; then
  echo "$USAGE"
  exit 1
fi

if [ -z "$target_dir" ]; then
  target_dir="$project_dir""_instrumented"
fi

log_file=$(mktemp -t "$0")

main "$project_dir" "$target_dir" "$log_file" "$entry_point"
