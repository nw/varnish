

function Condition(l, o, r){
  this.l = l;
  this.o = o;
  this.r = r;
};

Condition.prototype.toJSON = function(){
  return ['condition', this.l, this.o, this.r];
};

module.exports = Condition;