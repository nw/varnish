var sys = require("sys");
 
var ANSI = (function() {
  sys.inherits(ANSI, require("events").EventEmitter);
  
  function ANSI() {
    this.state = "plain";
    this.reset();
  }
  
  ANSI.prototype.reset = function() {
    this.params = [];
    this.param = null; // null coerces to 0 when used in arithmetic
    this.intermediate = [];
  };
  
  ANSI.prototype.parse = function(str) {
    var end = str.length;
    var i = 0;
    
    var left = this.state === "plain" ? i : end;
    var right = end;
    
    var ch, nextESC;
    while (i < end) {
      ch = str[i];
      
      switch (this.state) {
        // Plain, normal text
        case "plain":
          nextESC = str.indexOf("\u001b", i);
          if (nextESC === -1) {
            i = end;
          } else {
            right = i = nextESC;
            this.state = "esc";
          }
          break;
        
        // An ESC has been detected - begin processing ANSI sequence
        case "esc":
          if (ch === "[") {
            this.state = "params";
          } else {
            this.state = "plain";
          }
          break;
        
        // Capture a parameter
        case "params":
          if ("0" <= ch && ch <= "9") {
            this.param = (this.param * 10) + (ch - 0);
            break;
          } else {
            this.params.push(this.param);
            this.param = null;
            
            this.state = "param-end";
            // NOTE: FALL-THROUGH
          }
        
        // Check if there are any more parameters
        // This label isn't strictly neccesary, but it's self-documenting.
        case "param-end":
          if (ch === ";") {
            this.state = "params";
            break;
          } else {
            this.state = "intermediate";
            // NOTE: FALL-THROUGH
          }
        
        // Capture intermediate databytes
        case "intermediate":
          if (" " <= ch && ch <= "/") {
            this.intermediate.push(ch);
            break;
          } else {
            this.state = "final";
            // NOTE: FALL-THROUGH
          }
        
        // Capture the command type
        // This label isn't strictly necessary, but it's self-documenting.
        case "final":
          if ("@" <= ch && ch <= "~") {
            if (left < right) {
              this.emit("data", str.slice(left, right));
            }
            this.emit("command", ch, this.params, this.intermediate.join(""));
            left = i + 1;
          }
          
          this.state = "plain";
          this.reset();
          
          right = end;
          break;
      }
      
      i += 1;
    }
    
    if (left < right) {
      this.emit("data", str.slice(left, right));
    }
  };
  
  return ANSI;
})();
 
module.exports = ANSI;
