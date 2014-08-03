#!/bin/bash
set -e

USAGE="
usage: callgraph.sh project-dir entry-point

project-dir     Top level project directory to instrument.
entry-point     MATLAB expression to start evaluating.
backend         Backend to use, either 'matlab' or 'octave'
"

function main {
  current_dir=$(pwd)
  this_dir=$(cd "$(dirname "$0")" && pwd)

  project_dir=$1
  target_dir=$2
  log_file=$3
  entry_point=$4
  backend=$5

  natlabjar=$this_dir/mclab/languages/Natlab/Natlab.jar
  callgraphbin=$this_dir/java/build
  java -cp $natlabjar:$callgraphbin mclab.ide.callgraph.Instrument $project_dir $target_dir

  echo -e "function mclab_callgraph_entry_point\n$entry_point\nend" > $target_dir/mclab_callgraph_entry_point.m
  cd $target_dir
  if [ "$backend" = "matlab" ]; then
    matlab >/dev/null -nojvm -r "mclab_callgraph_init('$log_file'); mclab_callgraph_entry_point(); exit"
  else
    octave 2>&1 >/dev/null --eval "mclab_callgraph_init('$log_file'); mclab_callgraph_entry_point(); exit"
  fi
  cd $current_dir
  cat $log_file
}

if [ "$#" -ne "3" ]; then
  echo "$USAGE"
  exit 1
fi

project_dir=$1
entry_point=$2
backend=$3

if [[ ! -d "$project_dir" ]] || [[ ! "$backend" =~ ^(matlab|octave)$ ]]; then
  echo "$USAGE"
  exit 1
fi

log_file=$(mktemp -t $(basename $0))
target_dir=$(mktemp -dt $(basename $0))

main "$project_dir" "$target_dir" "$log_file" "$entry_point" "$backend"
