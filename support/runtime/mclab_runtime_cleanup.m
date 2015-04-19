function mclab_runtime_cleanup
  global mclab_runtime_fid;
  fclose(mclab_runtime_fid);
end
