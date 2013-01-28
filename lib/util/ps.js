var exec = require('child_process').exec


function ps(opts, fn){
  var args = (Array.isArray(opts.args)) ? opts.args.join(' ') : opts.args;

  exec('ps '+ args, function(err, stdout, stderr){
    if(err || stderr) return fn(err || stderr.toString('utf-8'));
    
    var result = parseOutput(stdout.toString('utf-8').trim() || false, opts.format);
    
    if(opts.filter){
      if(Array.isArray(opts.filter)){
        result = result.filter(function(item){
          return opts.filter.every(function(fn){
            return fn(item);
          });
        });
      }
      else result = result.filter(opts.filter);
    }
    
    fn(null, result);
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
  options.format = options.format || ['pid', 'ppid', 'user', 'command']
  options.args = options.args || ['-ax'];
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


/**
 * Parse the stdout into readable object.
 * @param {String} output
 * @param {String[]} format
 */
function parseOutput( output, format ) {
  if (!output) return output;
//console.log(output, format);
  var cmdIdx
    , lines = output.split( '\n' ).splice( 1 );
  
  if((cmdIdx = format.indexOf('comm')) >= 0) 
    format[cmdIdx] = 'command';
  else if((cmdIdx = format.indexOf('command')) >= 0)
    format.splice(cmdIdx + 1, 0, 'args');


  return lines.map( function( line ) {
    var processInfo = {}
      , processInfoArr = line.trim().split( /\s+/ );

    processInfoArr.forEach(function( i, idx ){
      var type = format[ idx ] || 'args';

      if( type == 'args' ){
        if( typeof processInfo[ type ] != 'undefined' ) 
          processInfo[ type ] += ' ' + i;
        else 
          processInfo[ type ] = i;
      } else {
        processInfo[ type ] = i;
      }
    });
    
    return processInfo;
  });
}

function parseFormat(format) {
  if (typeof format === 'string') format = format.split(' ');

  return format.map(function(item) { 
    return '-o ' + item; 
  }).join(' ');
}

