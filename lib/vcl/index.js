
var global = require('./global')
  , Type = require('./type')
  , Stack = require('./stack');

module.exports = Vcl;

function Vcl(){

//     indentation: 4
//  , nlafterblock: 2

  this._stack = new Stack();
  this._fn = {};
  this._context = [];

  this.info = global;

  var self = this;
  this.return = {};
  ['ok','error','pass','pipe','lookup','restart'
  ,'hash','fetch','deliver','hit_for_pass'].forEach(function(ret){
    self.return[ret] = function(code, msg){
      if(ret == 'error') self._addCode('return', 'error', code, msg);
      else self._addCode('return', ret);
      self.end();
      return self;
    }
  });
  
};

Vcl.prototype.load = function(){
  
};


Vcl.prototype.render = function(){
  
};


// stack class or context builder is needed

Object.keys(global.blocks).forEach(function(block){
  
  // needs to move inside of function
  // this is only needed for subs which inherit the current stack
  var settings = extend({
      min: 0
    , max: 0
    , code: true
    , state: 0
    , events: ['ok']}, global.blocks[block]);
  
  Vcl.prototype[block] = function(){
    var args = [].slice.apply(arguments)
      , depth = this._stack.depth()
      , scope = {state: settings, val: [block, [], []]};

    // this sucks
    if(settings.max == global.infinity){
      if(depth < settings.min) 
        return this.warn("logic branches need to be in subroutines");
        
      this['_'+block].call(this, scope, args);
      
    } else {
      
      if(depth > settings.max){
        if(settings.code) {
          this._stack.reset();
        } else return this.warn("block: ", block, "above max depth"); 
      }

      this._stack.push(scope);
      this['_'+block].apply(this, args);
      this._stack.pop();
    }
    
    return this;
  }
  
});

[  'init', 'recv', 'pipe', 'pass', 'hash','miss'
, 'fetch', 'hit', 'error', 'deliver', 'finish', 'sub'].forEach(function(event){
  Vcl.prototype['_'+event] = function(fn){
    applyArgs(fn, this.info, this);
  }
});

[ 'if', 'elseif', 'else'].forEach(function(branch){
  Vcl.prototype['_'+branch] = function(scope, args){
    
    if(!this._branching && branch != 'if'){
      var current = this._stack.current()
        , type = current.val[0];
      if(type == 'if' || type == 'elseif'){
        this._stack.pop();
        this._stack.nest(scope);
        this._branching = true;
      } else return this.warn("logic statements must start with if");
    }
      
    
    if(branch == 'if'){ 
      this._stack.nest(scope);
      this._branching = true;
    }
    else{ 
      this._stack.push(scope);
      this._branching = true;
    }
    
    if(branch != 'else')
      args.forEach(function(arg){
        this.and(arg);
      }, this);

    return this;
  }
});

Vcl.prototype.fi =
Vcl.prototype.end = function(){
  this._stack.pop();
  return this;
}


Vcl.prototype.state = function(){
  var current = this._stack.current();
  return current || {state: global.STATE.init, events: ['ok']};
};

Vcl.prototype.warn = function(){
  console.log([].slice.apply(arguments).join(" "));
  return this;
};


Vcl.prototype.comment = function(comment){
  // handle if it is a string on an array
  // also handle display depending on nesting
  console.log("comment: ", comment);
  
  this._addCode('comment', comment);
  
  return this;
}

Vcl.prototype.include = function(name){
  this._add({type: 'include', val: _type(name, true) });
  return this;
};

Vcl.prototype.import = function(name){
  this._add({type: 'import', val: _type(name, true) });
  return this;
};

Vcl.prototype.probe = function(name, probe){
  
};

Vcl.prototype.backend = function(name, backend){
  
};

Vcl.prototype.acl = function(name, include){
  
};

Vcl.prototype.director = function(name, type, director){
  
};



// METHODS FOR CODE BLOCKS

/*
  all need to:
  
  * if not in a code block warn and exit
  * if branching close the branch and mark code = true
*/
Vcl.prototype.call = function(name){
  this._addCode({type: 'call', val: _type(name, false) });
  return this;
};


Vcl.prototype.set = function(key, val){
  this._addCode('set', _type(key, false), _type(val, true));
  return this;
};

Vcl.prototype.unset = 
Vcl.prototype.remove = function(key){
  this._addCode('unset', _type(key, false));
  return this;
};

global.functions.forEach(function(func){
    
  Vcl.prototype[func[0]] = function(){
    var args = arguments
      , props = func.slice(1)
          .map(function(type, i){ return _type(args, type); });
    props.unshift('func', func[0]);
    this._addCode.apply(this, props);
    return this;
  }
    
});
  

Vcl.prototype.synthetic = function(str){
  // is only valid inside the 'error' block
  if(!this._context || this._context.type != 'error'){
    // error
  }
  this._add({type: 'synthetic', val: _type(key, true)});
  return this;
};


Vcl.prototype.do = function(fn){
  
};

Vcl.prototype.and = function(condition){
  this._addCondition(['and', condition]);
  return this;
};


Vcl.prototype.group = function(){
  
};

Vcl.prototype.or = function(condition){
  this._addCondition(['or', condition]);
  return this;
};

Vcl.prototype._addCode = function(){
  var len = this._stack.depth()
    , current = this._stack.current()
    , args = [].slice.apply(arguments);
  
  if(!len){
    this._branching = false;
    return this.warn("can't add code. no context"); /* error */ 
  }
  
  var type = this._stack.current().val[0];
  if(!~['if','elseif','else'].indexOf(type)) this._branching = false;
  
  if(current.state.code) current.val[1].push(args);
  else this.warn("not a code block");
}

Vcl.prototype._addCondition = function(obj){
  var len = this._stack.depth()
    , current = this._stack.current();
    
  if(this._branching) current.val[2].push(obj);
  else this.warn("you need a logic branch for a condition");
}




// Utils


function _type(val, flag){
  return (val instanceof Type) ? val : new Type(val, flag);
};


function applyArgs(fn, obj, scope, m){
  var args = (m = fn.toString().match(/^function.*?\((.+?)\)/)) 
        ? m[1].split(/[, ]+/).map(function(p){ return obj[p]; }) : [];       
  fn.apply(scope || null, args);
};

function extend(a, b){
  for(var i in b) a[i] = b[i];
  return a;
};


