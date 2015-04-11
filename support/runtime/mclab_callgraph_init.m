function mclab_callgraph_init(logfile)
  global mclab_callgraph_fid
  mclab_callgraph_fid = fopen(logfile, 'a');
end
