var Admin = require('./admin')
  , Server = require('./server')
  , ps = require('./util/ps')
  , async = require('async');
  
exports.Admin = Admin;

exports.Server = Server;


exports.create = function(){
  return new Server();
}


/**
* Finds All running instances of varnish.
*/
exports.discover = function(fn){
  
  
  ps.find('varnishd', function(err, result){
    if(err) return fn(err);
    
    var reduced =
    result.reduce(function(prev, curr, idx, arr){
      if(prev[curr.args]){
        if(curr.pid == prev[curr.args].ppid){
          curr.child = prev[curr.args].pid;
          prev[curr.args] = curr;
        } else if(curr.ppid == prev[curr.args].pid){
          prev[curr.args].child = curr.pid;
        } else {
          prev[curr.args] = curr;
        }
      } else prev[curr.args] = curr;
      return prev;
    }, {});
    
    var servers = 
    Object.keys(reduced).map(function(key){
      var instance = reduced[key]
        , args = instance.args.split(/\s/g);
      return new Server().hydrate(instance);
    });
    
    return fn(null, servers);
    
  });
  
}
