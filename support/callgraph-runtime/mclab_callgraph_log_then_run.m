function varargout = mclab_callgraph_log_then_run(s, f, varargin)
  if isa(f, 'function_handle')
    mclab_callgraph_log(s);
    info = functions(f);
    % empty in Octave, 'MATLAB built-in function' in MATLAB
    builtin = strcmp(info.type, 'simple') && ...
      (isempty(info.file) || strcmp(info.file, 'MATLAB built-in function'));
  else
    builtin = false;
  end

  if builtin
    mclab_callgraph_log('builtin start');
  end
  [varargout{1:nargout}] = f(varargin{:});
  if builtin
    mclab_callgraph_log('builtin end');
  end
end
