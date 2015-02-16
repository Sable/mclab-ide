# mclab-ide

This is a very rough, work-in-progress prototype of a MATLAB IDE powered by
the [McLab compiler toolkit][mclab]. It runs locally, with a browser-based
UI.

### Features

* Syntax checking
* Some basic support for layout-preserving refactorings
* Preliminary code-navigation features, e.g. jump-to-definition
* A MATLAB or Octave shell. (A MATLAB or Octave installation is required for
this to work).

### Installation

A `Vagrantfile` is provided, which provisions a Ubuntu 14.04 VM with
everything required (but not MATLAB; Octave is used instead). If you have
[vagrant][] installed, then running the app should be as simple as:

```
$ vagrant up
# This might take a while...
$ vagrant ssh -c "cd /vagrant && python3 run.py"
* Running on http://0.0.0.0:5000/
* Restarting with reloader
```

and navigating to `http://localhost:5000`.

### Manual installation

This has been tested on OS X (10.9) and various flavors of Linux. It hasn't
been tested on Windows -- feel free to try it out and let me know what issues
you run into. As preliminaries, you'll need:

* python 3.4.x (including development headers)
* pip
* jdk8
* ant
* npm
* MATLAB (recentish) or Octave (at least 3.8)
* libzmq (required by [python-matlab-bridge][] -- see its README for
instructions).

Once these are taken care of, you can run `bootstrap.sh`. Among other things
this installs some python packages, so you may want to run it inside a
virtualenv.

Finally, you'll want to place the `support/callgraph-runtime` directory
somewhere on the runtime path. There are various ways to do this. For MATLAB,
you can set the `MATLABPATH` environment variable, which is similar to the
system `PATH`. For Octave, you can put a call to `addpath` inside
`~/.octaverc`.

### License

Apache

[mclab]: http://www.sable.mcgill.ca/mclab
[python-matlab-bridge]: https://github.com/arokem/python-matlab-bridge
[vagrant]: http://www.vagrantup.com/
