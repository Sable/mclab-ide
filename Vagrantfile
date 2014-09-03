# -*- mode: ruby -*-
# vi: set ft=ruby :

$script = <<SCRIPT
# jdk8
add-apt-repository ppa:webupd8team/java -y
apt-get update
# this accepts the license noninteractively
echo oracle-java8-installer shared/accepted-oracle-license-v1-1 select true | debconf-set-selections
apt-get install oracle-java8-installer -y
ln -s /usr/lib/jvm/java-8-oracle /usr/lib/jvm/default-java

# zmq (version in apt is out of date)
apt-get install g++ -y
wget http://download.zeromq.org/zeromq-4.0.4.tar.gz
tar -xzf zeromq-4.0.4.tar.gz
(cd zeromq-4.0.4 && ./configure && make && make install && ldconfig)
echo "export LD_LIBRARY_PATH=/usr/local/lib" >> .bashrc

apt-get install octave liboctave-dev -y
apt-get install ant npm python3-pip git -y
ln -s /usr/bin/nodejs /usr/bin/node

# app
function pip { pip3 "$@"; }
export -f pip
(cd /vagrant && ./bootstrap.sh)
mkdir messenger
wget https://raw.githubusercontent.com/arokem/python-matlab-bridge/master/messenger/src/messenger.c
mkoctfile --mex -lzmq -o messenger/messenger.mex messenger.c
echo "addpath('/vagrant/support/callgraph-runtime', '-begin')" > .octaverc
echo "addpath('~/messenger', '-begin')" >> .octaverc
SCRIPT

VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  config.vm.box = "ubuntu/trusty64"
  config.vm.network "forwarded_port", guest: 5000, host: 5000
  config.vm.provision :shell, inline: $script
end
