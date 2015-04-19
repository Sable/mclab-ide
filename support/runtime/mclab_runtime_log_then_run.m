function varargout = mclab_runtime_log_then_run(s, f, varargin)
  if isa(f, 'function_handle')
    mclab_runtime_log(s);
    info = functions(f);
    % empty in Octave, 'MATLAB built-in function' in MATLAB
    builtin = strcmp(info.type, 'simple') && ...
      (isempty(info.file) || strcmp(info.file, 'MATLAB built-in function'));
  else
    builtin = false;
  end

  if builtin
    mclab_runtime_log('builtin start');
  end
  % TODO(isbadawi): need evalin caller here?
  [varargout{1:nargout}] = f(varargin{:});
  if builtin
    mclab_runtime_log('builtin end');
  end
end
