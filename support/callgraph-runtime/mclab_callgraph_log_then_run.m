function varargout = mclab_callgraph_log_then_run(s, f, varargin)
  var = inputname(2);
  if isempty(var) || evalin('caller', sprintf('isa(%s, ''function_handle'')', var))
    mclab_callgraph_log(s);
  end
  [varargout{1:nargout}] = f(varargin{:});
end
