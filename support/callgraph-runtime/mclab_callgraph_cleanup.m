function mclab_callgraph_cleanup
  global mclab_callgraph_fid;
  fclose(mclab_callgraph_fid);
end
