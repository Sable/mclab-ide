function varargout = mclab_runtime_eval_wrapper(id, s)
  mclab_runtime_log(sprintf('%s: %s', id, s))
  [varargout{1:nargout}] = evalin('caller', s);
end
