var Condition = require('./condition');

function Type(val, str){
  this.val = val;
  this.str = !!str;
};


 [['is']
, ['not', '!']
, ['like', '~', true]
, ['eq', '==', true]
, ['ne', '!=', true]
, ['gt', '>', false]
, ['gte', '>=', false]
, ['lt', '<', false]
, ['lte', '<=', false]].forEach(function(condition){
  Type.prototype[condition[0]] = function(compare){
    var cond = new Condition(this);
    if(condition.length > 1) cond.o = condition[1];
    if(condition.length > 2) cond.r = _type(compare, condition[2]);
    return cond;
  };
  
});

Type.prototype.toJSON = function(){
  return ['type', this.val, this.str];
}

function _type(val, flag){
  return (val instanceof Type) ? val : new Type(val, flag);
};

function extend(a, b){
  for(var i in b) a[i] = b[i];
  return a;
};


module.exports = Type;