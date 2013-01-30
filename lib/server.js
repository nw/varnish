var exec = require('child_process').exec
  , fs = require('fs')
  , ps = require('./util').ps
  , Admin = require('./admin')
  , Stat = require('./stat')
  , util = require('./util')
  , os = require('os');


function Server(opts){
  opts = opts || {};
  this.config = opts.config || {};
  this.environment = opts.env || {}
  this.pid = opts.pid || false;
  this.path = opts.command || '/usr/local/sbin/varnishd'
  this.running = (opts.pid) ? true : false;
  this.child = opts.child || false;
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
, {flag: '-p', method: 'param', args: 1, multi: true, bug: true}
, {flag: '-S', method: 'secret', args: 1}
, {flag: '-s', method: 'storage', args: 1, multi: true}
, {flag: '-T', method: 'management', args: 1}
, {flag: '-M', method: 'reverse', args: 1}
, {flag: '-t', method: 'ttl', args: 1}
, {flag: '-u', method: 'user', args: 1}
, {flag: '-V', method: 'version', args: 0}
, {flag: '-w', method: 'workers', args: 1}];

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
    if(Array.isArray(val)) instance.push(flag, val.join(','));
    else if(typeof val == 'object')
      Object.keys(val).forEach(function(key){
        if(typeof val[key] == 'undefined') instance.push(flag, key);
        else instance.push(flag, key+'='+val[key]);
      });
    else if(val) instance.push(flag, val);
    else instance.push(flag);
    
  }, this);
  
  return instance.join(" ");
  
};

Server.prototype.args = function(args){
  var parsed = Server.parse(args);
  util.merge(this.environment, parsed.env);
  Object.keys(parsed.config).forEach(function(arg){
     if(!this.config[arg]) this.config[arg] = parsed.config[arg];
     else{
       if(Array.isArray(this.config[arg])) 
          this.config[arg] = this.config[arg].concat(parsed.config[arg]);
       else if(typeof this.config[arg] == 'object')
          util.merge(this.config[arg], parsed.config[arg]);
       else this.config[arg] = parsed.config[arg];
     }
  }, this);
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
  
  if(!this.config['-P']) this.pidfile(randomPidFile());
  if(!this.config['-n']) this.name(randomName());
  
  var cmd = this.toString();

  exec(cmd, function(err, stdout, stderr){
    if(err) return fn(err);
    if(stderr){
      console.log('stderr:', stderr.toString('utf-8'));
    }
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


Server.parse = function(argenv){
  var args = argenv.split(/\s/g)
    , config = {}
    , env = {};
  
  for(var i=0; i< args.length; i++){
    if(!args[i].match(/^-/)){
      var envparts = (" " + args.slice(i).join(' ')).split(/(\s[A-Z_]+?)=/g).splice(1);
      if(!(envparts % 2)){
        for(var k = 0; k < envparts.length; k += 2)
          env[envparts[k]] = envparts[k+1].trim();
      }
      return {config: config, env: env};
    }
    
    var conf = flags[args[i]]
      , flag = conf.flag
      , method = conf.method;

    if(!conf.args){
      config[flag] = "";
    } else if(conf.multi){
      var parts = args[++i].split('=');

      if(!config[flag]) config[flag] = {};

      if(parts.length == 1 && conf.bug){
        config[flag][args[i]] = args[++i];
      } else{
        config[flag][parts[0]] = parts[1];
      }
    } else if(conf.args == 1){
      config[flag] = args[++i];
    } else if(conf.args == Infinity){
      if(!config[flag]) config[flag] = [];
      var next = args[++i];
      while(!next.match(/^-/)){
        config[flag].push(next);
        next = args[++i];
      }
      i -= 1;
    }

  }
  
  return {config: config, env: env};
}


module.exports = Server;


function randomPidFile(){
  return [ os.tmpDir(),
          'nodejs',
          now.getYear(), now.getMonth(), now.getDate(),
          '-', process.pid, '-',
          (Math.random() * 0x100000000 + 1).toString(36),
          'varnish'].join('');
}

function randomName(){
  return 'varnish-'+(Math.random() * 0x100000000 + 1).toString(36) + Date.now();
}
