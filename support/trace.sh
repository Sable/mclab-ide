#!/bin/bash
set -e

USAGE="
usage: callgraph.sh project-dir entry-point

project-dir     Top level project directory to instrument.
entry-point     MATLAB expression to start evaluating.
"

function main {
  current_dir=$(pwd)

  project_dir=$1
  target_dir=$2
  log_file=$3
  entry_point=$4

  natlabjar=$HOME/code/java/mclab/languages/Natlab/Natlab.jar
  callgraphbin=java/build
  java -cp $natlabjar:$callgraphbin mclab.ide.callgraph.Instrument $project_dir $target_dir

  echo -e "function mclab_callgraph_entry_point\n$entry_point\nend" > $target_dir/mclab_callgraph_entry_point.m
  cd $target_dir
  matlab >/dev/null -nojvm -r "mclab_callgraph_init('$log_file'); mclab_callgraph_entry_point(); exit"
  cd $current_dir
  cat $log_file
}

if [ "$#" -ne "2" ] || [ ! -d "$1" ]; then
  echo "$USAGE"
  exit 1
fi

project_dir=$1
entry_point=$2

log_file=$(mktemp -t $(basename $0))
target_dir=$(mktemp -dt $(basename $0))

main "$project_dir" "$target_dir" "$log_file" "$entry_point"
