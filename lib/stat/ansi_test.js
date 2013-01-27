var ANSI = require('../util').ANSI;

var ansi = new ANSI();

// virtual screen
var state = [];
for(var i =0; i < 15; i++) {
  state[i] = "";
  for(var k = 0; k < 100; k++) state[i] += " ";
};

// virtual cursor
var col = row = 0;
var cmd = null;


setInterval(function(){
  
  state.forEach(function(row,i){
    //data.replace(/(\r|\n|\u0007|\b0)/g,'')
    //console.log(i+1, row.replace(/(\r|\n|\u0007|\b0|\b)/g,''));
    console.log(i+1, row);
  });
  
}, 5000);


ansi.on('data', function(data){
  if(!cmd) return;
  
  var params = cmd[1];
  //console.log(cmd[0], params, data); // debug
  switch(cmd[0]){
  
    case 'J': // erases the screen down
      row = 0;
      col = 0;
      _write();
      break;
    case 'C': // cursor forward
      col += params[0];
      _write();
      break;
    case 'H': // cursor home // or set tab
      if(params.length == 2){
        row = params[0]-1;
        col = params[1]-1;
        var len = _write();
        col += len-1;
      }
      break;
    case 'B': // cursor down
      row += params[0];
      //CLEcol = 0;
      _write();
      break;
    // case 'r': // enable scrolling
    // case 'm': // set attributes
    // case 'h': // enable line wrap
    // case 'l': // disable line wrap
    // case 'c': // rest all terminal settings to default
    // case 'A': // cursor up
    // case 'D': // cursor backward or scroll down one line
    // case 'M': // scroll up one line
    // case 'f': // force cursor position
  }
  
  
  // this could be much cleaner
  function _write(){
    var reset = false;
    if(data.match(/(\n|\u0007)/)) return;
    if(data.match(/\r/)){
      data = data.replace(/\r/, '');
      reset = true;
    }
    data = data.replace(/[\b]/g, function(match, idx, str){ // backspaces grr
      col--;
      return ""; 
    });

    var cleaned = data; 
    state[row] = state[row].substr(0, col+1) + cleaned + state[row].substr(col+1+cleaned.length);
    if(reset) col = 0;
    return cleaned.length;
  }
  
});

ansi.on('command', function(ch, params, immediate){
  cmd = [ch, params, immediate]; // we don't act, we wait for a data event
});

// lets test
var spawn = require('child_process').spawn
  , stat = spawn('varnishstat',['-f' , 'client_conn,client_req,cache_hit']);
  
stat.stdout.on('data', function(data){
  ansi.parse(data.toString());
});
