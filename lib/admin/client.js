var fs = require('fs')
  , net = require('net')
  , crypto = require('crypto')
  , EventEmitter = require('events').EventEmitter
  , merge = require('../util').merge
  
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
*   - `reconnect
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
    
    this.settings = merge({
      'auto connect': true
    , 'auth retries': 2
    }, options);
    
    this.connecting = true;
    this.connected = false;
    this.authenticated = false;
    this.pending_response = false;
    
    this.host = host;
    this.port = port;
    this._queue = [];
    
    if(this.settings['auto connect']){
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
    
  });

  server.on('close', function(had_error){

  });
  
  this.on('error', function(err){
    console.log(err);
  })
  
  return this;
}

/**
* Handles all requests from varnishadm
* 
* @api Private
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
      }
      this.process(null, data);
      break;
    // Error - Failure - Not Implmented
    default:
      if(isNaN(code)) code = 800;
      this.process(code, data);
  }
  
  return this;
}

/**
* Send command to varnishadm
* 
* @param {String} command
* @param {String} arg1 (optional)
* @param {String} arg2 (optional)
*/
Client.prototype.send = function(){
  var args = [].slice.apply(arguments)
    , fn = (typeof args[args.length-1] == 'function') ? args.pop() : function(){};
    
  this._queue.push({cmd: args, fn: fn});
  this.queue();
  return this;
}

/**
* @api Private
*/
Client.prototype.queue = function(){
  if(!this.connected || this.pending_response || !this._queue.length) return;
  
  var req = this.pending_response = this._queue.shift();
  var cmd = req.cmd.join(" ") + "\n";
  this.server.write(req.cmd.join(" ") + "\n");
  return this;
}


/**
* @api Private
*/
Client.prototype.process = function(err, data){
  var req = this.pending_response
    , resp = data.slice(13).toString();
  
  if(!req){
    this.emit('error', new Error("missing command reference"));
  } else {
    req.fn(err, resp);
    this.pending_response = false;
  }
  
  this.queue();
}


/**
* @api Private
*/
Client.prototype.auth = function(seed){
  var self = this
    , options = this.settings;
  
  if(!options.file) {
    return verify(null, _checksum(seed, options.auth));
  }
  
  fs.readFile(options.file, function(err, content){
    var secret = (err) ? options.auth : content;
    verify(err, _checksum(seed, secret));
  });
  
  function verify(err, token){
    self.server.write(["auth", token].join(" ") + "\n")
  }
}


function _checksum(seed, secret){
  var sha = crypto.createHash('sha256');
  sha.update(seed);
  sha.update(secret);
  sha.update(seed);
  return sha.digest('hex');
}


module.exports = Client;