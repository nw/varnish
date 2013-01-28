var spawn = require('child_process').spawn
  , fs = require('fs')
  , ps = require('./util').ps
  , Admin = require('./admin')
  , Stat = require('./stat');


function Server(){
  this.config = {};
  this.pid = false;
  this.path = '/usr/local/sbin/varnishd'
  this.running = false;
  this.child = false;
  return this;
}

var opts = [
  {flag: '-a', method: 'listen', args: Infinity}
, {flag: '-b', method: 'backend', args: 1}
, {flag: '-C', method: 'compile', args: 0}
, {flag: '-d', method: 'debug', args: 0}
, {flag: '-F', method: 'foreground', args: 0}
, {flag: '-f', method: 'vcl', args: 1}
, {flag: '-g', method: 'group', args: 1}
, {flag: '-h', method: 'hash', args: 1}
, {flag: '-i', method: 'id', args: 1}
, {flag: '-l', method: 'shmlog', args: 1}
, {flag: '-n', method: 'name', args: 1}
, {flag: '-P', method: 'pidfile', args: 1}
, {flag: '-p', method: 'param', args: 1, multi: true}
, {flag: '-S', method: 'secret', args: 1}
, {flag: '-s', method: 'storage', args: 1, multi: true}
, {flag: '-T', method: 'management', args: 1}
, {flag: '-M', method: 'reverse', args: 1}
, {flag: '-t', method: 'ttl', args: 1}
, {flag: '-u', method: 'user', args: 1}
, {flag: '-V', method: 'version', args: 0}
, {flag: '-w', method: 'workers', args: 1} ];

// build lookup by flags
var flags = opts.reduce(function(prev, curr){
  prev[curr.flag] = curr;
  return prev;
}, {});


// build methods
opts.forEach(function(conf){
  var flag = conf.flag
    , method = conf.method
    , args = conf.args;
    
  Server.prototype[method] = function(arg1, arg2){
    if(this.running) return this;
    
    if(conf.multi){
      if(!this.config[flag]) this.config[flag] = {};
      this.config[flag][arg1] = arg2;
    } else if(args == Infinity){
      if(!this.config[flag]) this.config[flag] = [];
      this.config[flag].push(arg1);
    } else if(args == 0){
      this.config[flag] = "";
    } else {
      this.config[flag] = arg1;
    }
    
    return this;
  };
  
});



Server.prototype.toString = function(){
  
  var instance = [this.path];
  
  opts.forEach(function(opt){
    var flag = opt.flag
      , val = this.config[flag];
      
    if(typeof val === 'undefined') return;
    if(Array.isArray(val)) {
      instance.push(flag, val.join(','));
    } else if(typeof val == 'object'){
      Object.keys(val).forEach(function(key){
        if(typeof val[key] == 'undefined') instance.push(flag, key);
        else instance.push(flag, key+'='+val[key]);
      });
    } else if(val){
      instance.push(flag, val);
    } else {
      instance.push(flag);
    }
  }, this);
  
  return instance.join(" ");
  
};


Server.prototype.hydrate = function(psline){
  if(psline.pid){
    this.pid = psline.pid;
    this.child = psline.child;
  }
  
  if(psline.cmd) this.path = psline.cmd;
  if(psline.user) this.user(psline.user);
  if(psline.group) this.group(psline.group);
  if(psline.ppid) this.ppid = psline.ppid;

  
  var args = psline.args.split(/\s/g)
    , i;

  for(i=0; i< args.length; i++){
    var f = args[i];
    if(!f.match(/^-/)){
      console.log('error!!!!');
      return this;
    }
    
    var flag = flags[f];
    
    if(!flag.args){
      this[flag.method]();
    } else if(flag.multi){ 
      this[flag.method].apply(this, args[++i].split('='));
    } else if(flag.args == 1){
      this[flag.method](args[++i]);
    } else if(flag.args == Infinity){
      var next = args[++i];
      while(!next.match(/^-/)){
        this[flag.method](next);
        next = args[++i];
      }
      i -= 1;
    }
  
  } 
  
  if(this.pid) this.running = true;
  return this;
};

Server.prototype.admin = function(){
  var parts = this.config['-T'].split(':')
  return new Admin(parts[0], parts[1], {
    file: this.config['-S']
  });
};

Server.prototype.stat = function(options){
  options = options || {};
  if(this.config['-n']) options.name = this.config['-n'];
  return new Stat(options);
}

Server.prototype.start = function(fn){
  var self = this;
  
  var proc = 
  exec(this.toString(), function(err, stdout, stderr){
    if(err) return fn(err);
    if(stderr){
      console.log('stderr:', stderr.toString('utf-8'));
    }
    
    console.log("PID: ", proc.pid);
    
    fs.readFile(self.config['-P'], function(err, content){
      if(err) return fn(err);
      ps.get(content.toString(), function(err, result){
        if(err) return fn(err);
        self.hydrate(result);
        return fn(null, self);
      });
    });

  });
  return this;
};

Server.prototype.kill = function(fn){
  if(!this.running || !this.pid) return this;
  ps.kill(this.pid, fn);
  return this;
};


module.exports = Server;
