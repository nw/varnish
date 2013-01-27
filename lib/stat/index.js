
var spawn = require('child_process').spawn
  , EventEmitter = require('events').EventEmitter;
  
//  , stat = spawn('varnishstat',['-w', '1', '-1', '-j', '-f' , 'client_conn,client_req,cache_hit']);


function Stat(options){
  this.fields = (options.fields) ? options.fields.join(',') : null;
  this.every = (options.every) ? options.every : 1
  
  var args = ['-w', this.every, '-1', '-j'];
  if(this.fields) args.push('-f', this.fields);
  
  this.process = spawn('varnishstat', args);
  
  var self = this;
  this.process.stdout.on('data', function(data){
    self.data(data);
  });
  
  this.process.stderr.on('data', function(data){
    self.emit('error', data);
  });
  
  this.process.on('exit', function(){
    self.emit('exit');
  })
}

Stat.prototype.__proto__ = EventEmitter.prototype;

Stat.prototype.data = function(data){
  var json = JSON.parse(data.toString());
  var ts = new Date(json.timestamp);
  ts.setMinutes( ts.getTimezoneOffset() + ts.getMinutes() ); // normalize timezone
  json.timestamp = ts; // make it a data object not a string;
  
  if(!this.last) this.last = json; // we need to defer until we can get metrics. ready in this.every*2.
  else {
    Object.keys(json).forEach(function(key){
      if(key == 'timestamp') return;
      json[key].persec = (json[key].value - this.last[key].value) / this.every;
    }, this);
    this.last = json;
    this.emit('data', json);
  }
};

Stat.prototype.kill = function(){
  this.process.kill();
}



var stats = new Stat({fields: ['client_conn', 'client_req', 'cache_hit']});

stats.on('data', function(data){
  console.log(data);
});

stats.on('error', function(err){
  console.log(err);
});

stats.on('exit', function(){
  console.log('TOAST.... DONE.... GONE');
});

setTimeout(function(){
  console.log('killing')
  stats.kill();
}, 10000);





