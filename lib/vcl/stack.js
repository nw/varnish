


function Stack(){
  this.arr = [];
  this.path = [];
}

Stack.prototype = {
  
  nest: function(obj){
    var current = this.current();
     
    if(!current) return;

    current.val[1].push(obj.val);
    this.path.push(obj);
  },
  
  pop: function(){
    this.path.pop();
  },
  
  push: function(obj){
    var current = this.current();
    this.arr.push(obj.val);
    this.path.push(obj);
  },
  
  current: function(){
    var len = this.path.length;
    if(!len) return null;
    return this.path[len-1];
  },
  
  depth: function(){
    return this.path.length;
  },
  
  reset: function(){
    this.path = [];
  }
  
}


module.exports = Stack;