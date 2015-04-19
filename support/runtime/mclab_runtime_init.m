function mclab_runtime_init(logfile)
  global mclab_runtime_fid
  mclab_runtime_fid = fopen(logfile, 'a');
end
