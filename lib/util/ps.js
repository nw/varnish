var exec = require('child_process').exec
  , os = require('os')
  , util = require('./');


function ps(opts, fn){
  var args = (Array.isArray(opts.args)) ? opts.args.join(' ') : opts.args;

  exec('ps '+ args, function(err, stdout, stderr){
    if(err || stderr) return fn(err || stderr.toString('utf-8'));
    
    var output = stdout.toString('utf-8').trim();
    if(!output) return fn(null, []);
    
    var lines = output.split( '\n' ).splice( 1 ).map(function(line, idx){
      var parts = line.trim().split(/\s+/);
      var obj = util.objectify(opts.format, parts.splice(0, opts.format.length));
      obj.args = parts.join(' ');
      return obj;
    });
    
    if(opts.filter){
      if(!Array.isArray(opts.filter)) opts.filter = [opts.filter];
      lines = lines.filter(function(item){
        return opts.filter.every(function(fn){
          return fn(item);
        });
      });
    }

    return fn(null, lines);
  });
}


exports.get = function(pid, options, callback){
  if(typeof options == 'function'){
    callback = options;
    options = null;
  }
  var options = options || {};
  options.format = options.format || ['pid', 'ppid', 'user', 'command']
  options.args = ['-p', pid, parseFormat(options.format)];
  
  ps(options, function(err, result){
    if(err) return callback(err);
    return callback(null, result[0]);
  });
  
};

exports.find = function(cmd, options, callback){
  if(typeof options == 'function'){
    callback = options;
    options = null;
  }
  var options = options || {};
  options.format = options.format || ['pid', 'ppid', 'user', 'command'];
  var envFlag = (os.platform() == 'darwin') ? '-axE' : '-axe';
  options.args = options.args || [envFlag];
  options.args.push(parseFormat(options.format));
  
  if(typeof options.filter == 'function') options.filter = [options.filter];
  else if(!Array.isArray(options.filter)) options.filter = [];
  
  var regex = new RegExp(cmd);
  options.filter.push(function(item){
    return regex.test(item.command);
  });
  
  ps(options, callback);
};


/**
 * Kill process
 * @param pid
 * @param next
 */
exports.kill = function( pid, next ){
  exec('kill ' + pid, function( err, stdout, stderr) {
    if (err || stderr) return next(err || stderr.toString( 'utf-8' ));
    next( null, stdout.toString('utf-8') );
  });
};



function parseFormat(format) {
  if (typeof format === 'string') format = format.split(' ');

  return format.map(function(item) { 
    return '-o ' + item; 
  }).join(' ');
}

