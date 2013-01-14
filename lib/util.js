
exports.merge = function(to, from){
    for (var i in from)
      if (from.hasOwnProperty(i)) 
        to[i] = from[i];
    return to;
}


exports.objectify = function(keys, vals){
  var obj = {};
  keys.forEach(function(key, i){
    obj[key] = vals[i];
  });
  return obj;
}