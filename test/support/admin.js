
var Admin = require('../../').Admin
  , commands = require('./raw.fixture.json')
  , EventEmitter = require('events').EventEmitter;

function MockAdmin(){
  var args = [].slice.apply(arguments);
  Admin.apply(this, args);
  return this;
}

Admin.Server = function(port, host){
  return new MockServer(port, host);
}

MockAdmin.prototype.__proto__ = Admin.prototype;


module.exports = MockAdmin;


function MockServer(){
  var self = this;
  process.nextTick(function(){
    self.emit('connect');
  });
}

MockServer.prototype.__proto__ = EventEmitter.prototype;

MockServer.prototype.write = function(data){
  var cmd = data.slice(0,-1)
    , resp = commands[cmd];

  this.emit('data', _resp(200, resp));
}

function _resp(code, data){
  return code + "         \n" + data;
}



