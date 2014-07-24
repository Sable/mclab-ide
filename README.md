# mclab-ide

This is a very rough, work-in-progress prototype of a MATLAB IDE powered by
the [McLab compiler toolkit][mclab]. It runs locally, with a browser-based
UI.

### Features

* Syntax checking
* Some basic support for layout-preserving refactorings
* Preliminary code-navigation features, e.g. jump-to-definition
* A MATLAB shell -- presently, a MATLAB installation is required for this to
work, but support for alternative implementations (e.g. Octave) is upcoming.

### Installation

This has quite a few dependencies. An install script (`bootstrap.sh`) is
provided, but you first need some preliminaries:

* python 2.7.x
* JDK 8
* ant
* npm
* libzmq (required by [python-matlab-bridge][] -- see its README for
instructions)

Once these are taken care of, you can run `bootstrap.sh`. Among other things
this installs some python packages, so you may want to run it inside a
virtualenv.

### Running

There are two servers you need to bring up -- `python run.py`, and
`python support/app.py`.

### License

Apache

[mclab]: http://www.sable.mcgill.ca/mclab
[python-matlab-bridge]: https://github.com/arokem/python-matlab-bridge
