var varnish = require('../')
  , async = require('async');

varnish.discover(function(err, servers){
  if(err) return console.log('discovery failed');
  
  async.map(servers, health, function(err, results){
    if(err) console.log('something is wrong');
    else console.log('everything looks good');
    console.log(results);
  });
  
  function health(server, cb){
    var admin = server.admin();
    admin.backend(function(err, resp){
      admin.destroy();
      if(err) return cb(err);
      
      var isHealthy = resp.every(function(backend){
        return (!!~backend.status.indexOf('Healthy'));
      });
      
      if(isHealthy) return cb(null);
      
      return cb(new Error('Not Healthy'), resp);
    });
  }
    
});