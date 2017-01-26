# -*- mode: ruby -*-
# vi: set ft=ruby :

def add_pkg_source(ppa)
  ["add-apt-repository ppa:#{ppa} -y", 'apt-get update']
end

def accept_oracle_license
  'echo oracle-java8-installer shared/accepted-oracle-license-v1-1 select true | debconf-set-selections'
end

def install_pkgs(packages)
  "apt-get install #{packages.join(' ')} -y"
end

def symlink(source, dest)
  "ln -s #{source} #{dest}"
end

def write_file(filename, contents)
  "echo \"#{contents}\" > #{filename}"
end

def install_jdk8
  [
    add_pkg_source('webupd8team/java'),
    accept_oracle_license,
    install_pkgs(['oracle-java8-installer']),
    symlink('/usr/lib/jvm/java-8-oracle', '/usr/lib/jvm/default-java')
  ]
end

def install_system_dependencies
  [
    install_jdk8,
    install_pkgs(%w{libzmq3 libzmq3-dev octave ant npm python3-pip git}),
    symlink('/usr/bin/nodejs', '/usr/bin/node')
  ]
end

def using_pip3
  ['function pip { pip3 "$@"; }', 'export -f pip']
end

def install_app_dependencies
  [using_pip3, '(cd /vagrant && ./bootstrap.sh)']
end

def adjust_octave_runtime_path
  write_file('.octaverc',
             "addpath('/vagrant/support/runtime', '-begin')")
end

def apply_liboctinterp_hack
  liboctinterp = '/usr/lib/x86_64-linux-gnu/liboctinterp.so'
  symlink(liboctinterp + '.2', liboctinterp + '.3')
end

def install_app
  [
    install_system_dependencies,
    install_app_dependencies,
    adjust_octave_runtime_path,
    apply_liboctinterp_hack
  ].flatten.join("\n") + "\n"
end

VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  config.vm.box = "ubuntu/trusty64"
  config.vm.network "forwarded_port", guest: 5000, host: 5000
  config.vm.provision :shell, inline: install_app
end
