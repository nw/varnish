var fs = require('fs')
  , net = require('net')
  , crypto = require('crypto')
  , EventEmitter = require('events').EventEmitter
  , util = require('./util')
  

  // https://github.com/varnish/Varnish-Cache/blob/master/include/vcli.h
  , ExitCodes = {  
      100: 'Syntax Error'
    , 101: 'Unknown Request'
    , 102: 'Not Implemented'
    , 104: 'Too Few Parameters'
    , 105: 'Too Many Parameters'
    , 106: 'Bad Parameter'
    , 107: 'Authentication Required'
    , 200: 'OK'
    , 201: 'Truncated'
    , 300: "Can't Perform Operation"
    , 400: "Communication Error"
    , 500: "Close"
    
    // not implemented by varnishadm
    , 800: 'Response Parsing Error' };



/**
* Client for 'varnishadm'
* 
* Options:
* 
*   - `auth` {String||Buffer} content of secret file for varnish
*   - `file` if auth not present will load file contents.
*   - `reconnect` {Boolean} 
* 
* 
* @param {String} host
* @param {Int} port
* @param {Object} options
*
* @return {Client} instance 
*/ 
function Client(host, port, options){
  
    if(!this instanceof Client) 
      return new Client(host, port, options);
    
    this.options = util.merge({
      'reconnect': true
    , 'auth retries': 2
    , 'auto connect': true
    }, options);
    
    this.connecting = true;
    this.connected = false;
    this.authenticated = false;
    this.pending_response = false;
    
    this.host = host;
    this.port = port;
    this._queue = [];
    
    if(this.options['auto connect']){
      this.connect();
    }
}


Client.prototype.__proto__ = EventEmitter.prototype;


/**
*  Use when 'autoconnect' flag == false
*/
Client.prototype.connect = function(){
  if(this.server) return this;
  
  var self = this
    , server = this.server = net.createConnection(this.port, this.host);

  server.on('connect', function(){
    self.connecting = false;
  });

  server.on('data', function(data){
    self.data(data);
  });
  
  server.on('error', function(err){
    self.emit('error', err);
  });

  server.on('close', function(had_error){
    self.emit('close', had_error);
  });
  
  this.on('error', function(err){
    console.log(err);
  })
  
  return this;
}

/**
* Handles all requests from varnishadm
* 
* @private true
*/
Client.prototype.data = function(data){
  var code = parseInt(data.slice(0,3).toString());
  
  if(!this.connecting){
    this.connecting = true;
    this.emit('connect');
  }

  switch(code){
     // Authentication Needed
    case 107:
      this.auth(data.slice(13, 46));
      break;
    // OK (success)
    case 200:
      if(this.connecting){
        this.connected = true;
        this.connecting = false;
        this.authenticated = true;
        this.pending_response = {cmd: ['init']};
      }
      this.process(null, data);
      break;
    // Error - Failure - Not Implmented
    default:
      if(isNaN(code)) code = 800;
      this.process(new VarnishError(code, ExitCodes[code]), data);
  }
  
  return this;
}

/**
* Send command to varnishadm
* 
* @param {String} command
* @param {String} arg1 - optional
* @param {String} arg2 - optional
* @param {Function} callback
*/
Client.prototype.send = function(){
  var args = [].slice.apply(arguments)
    , fn  = args.pop();
            
  this._queue.push({ cmd: args, fn: fn });
  this.queue();
  return this;
}

/**
* @private true
*/
Client.prototype.queue = function(){
  if(!this.connected || this.pending_response || !this._queue.length) return;
  
  var req = this.pending_response = this._queue.shift();
  var cmd = req.cmd.join(" ") + "\n";
  this.server.write(req.cmd.join(" ") + "\n");
  return this;
}


/**
* @private true
*/
Client.prototype.process = function(err, data){
  var req = this.pending_response
    , resp = data.slice(13).toString();
  
  if(!req){
    this.emit('error', new Error("missing command reference"));
  } else {
    if(req.fn) req.fn(err, resp);
    this.pending_response = false;
  }
  
  this.queue();
}


/**
* @private true
*/
Client.prototype.auth = function(seed){
  var self = this
    , options = this.options;
  
  if(!options.file) {
    return verify(null, _checksum(seed, options.auth));
  }
  
  fs.readFile(options.file, function(err, content){
    var secret = (err) ? options.auth : content;
    verify(err, _checksum(seed, secret));
  });
  
  function verify(err, token){
    var cmd = ["auth", token];
    self.pending_response = {cmd: cmd, fn: function(){} };
    self.server.write(cmd.join(" ") + "\n")
  }
}


/**
* Ping backend
* 
* @param {Function} callback
* 
* @return {Error} error
* @return {Boolean}
*/
Client.prototype.ping = function(fn){
  return this.send("ping", err(fn, function(resp){
    return !!~resp.indexOf('PONG');
  }));
}


/**
* Check if child state == 'running'
* 
* @param {Function} callback
* 
* @return {Error} error
* @return {Boolean}
*/
Client.prototype.status = function(fn){
  return this.send("status", err(fn, function(resp){
    return !!~resp.indexOf('running');
  }));
}

/**
* Starts child process (sets state == 'running')
* 
* @param {Function} callback
* 
* @return {Error} error
* @return {Boolean}
*/
Client.prototype.start = function(fn){
  this.send("start", err(fn, function(resp){
    return true;
  }))
}

/**
* Stops child process (sets state == 'stopped')
* 
* @param {Function} callback
* 
* @return {Error} error
* @return {Boolean}
*/
Client.prototype.stop = function(fn){
  this.send('stop', err(fn, function(resp){
    return true;
  }))
}

/**
* Returns list of loaded vcl files
* 
* VCL {Object}
* 
*   - name {String} name of vcl
*   - num {String} ???
*   - status {String} 'active|available|boot'
* 
* @param {Function} callback
* 
* @return {Error} error
* @return {Array} vcl obj
*/
Client.prototype.list = function(fn){
  return this.send("vcl.list", err(fn, function(resp){
    var props = ['status', 'num', 'name']
    return resp.split(/\n/)
      .slice(0,-2)
      .map(function(line){
        return util.objectify(props, line.split(/\s{1,}/));
      });
  }));
}

/**
* Load a vcl from a file
* 
* @param {String} reference name for vcl (must be unique)
* @param {String} path to file (varnish must be able to access)
* @param {Function} callback
* 
* @return {Error} error
* @return {Boolean}
*/
Client.prototype.load = function(name, file, fn){
  return this.send("vcl.load", name, file, err(fn, function(resp){
    return true;
  }))
}


/**
* Make a vcl config active.
* 
* @param {String} reference name for vcl 
* @param {Function} callback
* 
* @return {Error} error
* @return {Boolean}
*/
Client.prototype.use = function(name, fn){
  return this.send("vcl.use", name, err(fn, function(resp){
    return true;
  }))
}


Client.prototype.show = function(name, fn){
  return this.send('vcl.show', name, err(fn, function(resp){
    return resp;
  }));
}

/**
* Make a vcl config active.
* 
* @param {String} reference name for vcl
* @param {Mixed} inline properly escaped vcl file string
* @param {Function} callback
* 
* @return {Error} error
* @return {Boolean}
*/
Client.prototype.inline = function(name, str, fn){
  return this.send('vcl.inline', name, str, err(fn, function(resp){
    return true;
  }))
}

/**
* Discard a loaded vcl
* 
* @param {String} reference name for vcl 
* @param {Function} callback
* 
* @return {Error} error
* @return {Boolean}
*/
Client.prototype.discard = function(name, fn){
  return this.send('vcl.discard', name, err(fn, function(resp){
    return true;
  }))
}


/**
* Get details on varnish configuration parameters
* 
* Param:
* 
*   - value: {String} current value
*   - unit: {String} the unit type varnish expects
*   - default: {String} default value
*   - description: {String} description
* 
* @param {String} name of parameter (optional)
* @param {Function} callback
* 
* @return {Error} error
* @return {Object} see Param
*/
Client.prototype.settings = function(param, fn){
  if(!fn && (fn = param)) param = null;
  return this.send('param.show -l', err(fn, function(resp){
    var settings = {};
    resp.split(/\n(?=[a-z])/).forEach(function(param){
      var lines = param.split(/\n/)
        
      if(!lines) return;
      
      var name = lines[0].slice(0,27).trim()
        , data = lines[0].slice(28).trim()
        , obj = util.merge(getParamValue(data), {default: data, desc: '' });
      
      lines.slice(2).forEach(function(line, num, arr){
        if(num >= arr.length-1) return;
        var data = line.slice(28).trim();
        obj.desc += (!data) ? "\n\n" : data + ((num == arr.length-2) ? "" : " ");
      });
      
      settings[name] = obj;
    });

    return (param) ? settings[param] : settings;
  }));
}


function getParamValue(data){
  var match = data.match(/^([^\[\(]+)(.+)?$/);
  return {
    value: match[1].trim()
  , unit: (match[2]) ? match[2].replace(/[\(\)\[\]]/g, '') : 'string'
  }
}


/**
* Set a parameter
* 
* @param {String} parameter name
* @param {string} new value
* @param {Function} callback
* 
* @return {Error} error
* @return {Boolean}
*/
Client.prototype.set = function(param, val, fn){
  return this.send('param.set', param, val, err(fn, function(resp){
    return true;
  }));
}

/**
* Check for latest panic
* 
* @param {Function} callback
* 
* @return {Error} error
* @return {Mixed}
*/
Client.prototype.panic = function(fn){
  return this.send('panic.show', err(fn, function(resp){
    var lines = resp.split(/\n/)
      , obj = {}
      , dump, ctx = {};
    
    obj.date = new Date(lines[0].slice(15));
    obj.type = (lines[1].indexOf(/from VCL/)) ? 'VCL' : 'Assert';
    obj.thread = lines[3].match(/\((.+?)\)/)[1];
    obj.ident = lines[4].split(" = ")[1].split(',');
    
    obj.backtrace = lines.slice(6).map(function(bt, idx){
      if(!dump){
        if(!!~bt.indexOf('=')){
          var addr = bt.match(/\= (.+?) \{/)[1];
          dump = lines.slice(idx+1);
          return [addr, ctx]; 
        } else return bt.split(": ");
      }
    }).filter(function(x){ return !!x; });

    return obj;
    
  }));
}

/**
* Clears the last panic
* 
* @param {Function} callback
* 
* @return {Error} error
* @return {Boolean}
*/
Client.prototype.clear = function(fn){
  return this.send('panic.clear', err(fn, function(resp){
    return true;
  }))
}

/**
* Get list of current storage w/ type
* 
* @param {Function} callback
* 
* @return {Error} error
* @return {Mixed} hash of stores
*/
Client.prototype.storage = function(fn){
  return this.send("storage.list", err(fn, function(resp){
    var obj = {};
    resp.split(/\n/).slice(1, -2)
      .forEach(function(line){
        var m = line.split('=');
        obj[m[0].trim()] = m[1].trim();
      });
    return obj;
  }));
}

/**
* List of all backend currently referenced in loaded VCLs
* 
* Backend:
* 
*   - name {String}
*   - host {String}
*   - port {String}
*   - refs {String} number of vcls pointing at backend
*   - admin {String}
*   - status {String}
*   - passed {String}
*   - window {String}
* 
* @param {Function} callback
* 
* @return {Error} error
* @return {Array} of Backends 
*/
Client.prototype.backend = function(fn){
  return this.send("backend.list", err(fn, function(resp){
    var props = ['name','host','port','refs','admin','status','passed','window']; 
    return resp
      .split(/\n/)
      .slice(1,-1)
      .map(function(line){
        var vals = line.split(/\s{1,}|\(|\)|,|\//)
                       .filter(function(item){ return !!item; });
        return util.objectify(props, vals);
      });
  }));
}


/**
* Ban urls/rules from cache
* 
* @param {String} url or rule
* @param {Function} callback
* 
* @return {Error} error
* @return {Boolean}
*/
Client.prototype.ban = function(rule, fn){
  
}


function VarnishError(code, msg){
  Error.call(this);
  Error.captureStackTrace(this, arguments.callee);
  this.code = code;
  this.message = msg;
  this.name = 'VarnishError';
}

VarnishError.prototype.__proto__ = Error.prototype;


function _checksum(seed, secret){
  var sha = crypto.createHash('sha256');
  sha.update(seed);
  sha.update(secret);
  sha.update(seed);
  return sha.digest('hex');
}

function err(callback, success){
  return function(err, resp){
    if(err) callback(err, null, resp);
    else callback(null, success(resp), resp);
  }
}

module.exports = Client;