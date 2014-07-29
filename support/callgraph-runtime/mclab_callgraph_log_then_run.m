function varargout = mclab_callgraph_log_then_run(s, f, varargin)
  mclab_callgraph_log(s);
  [varargout{1:nargout}] = f(varargin{:});
end
