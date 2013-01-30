var varnish = require('../');

varnish.discover(function(err, servers){
  
  servers.forEach(function(server){
    var stat = server.stat({fields: ['client_conn', 'client_req', 'cache_hit']});
  
    stat.on('data', function(data){
      console.log(data);
    });
    
    stat.on('error', function(err){
      console.log(err);
    });
    
    stat.on('exit', function(){
      console.log('TOAST.... DONE.... GONE');
    });
    
    setTimeout(function(){
      console.log('killing')
      stat.kill();
    }, 10000);
    
  });
  
});