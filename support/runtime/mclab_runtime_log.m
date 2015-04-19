function mclab_runtime_log(s)
  global mclab_runtime_fid;
  fprintf(mclab_runtime_fid, '%s\n', s);
end
