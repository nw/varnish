
exports.merge = function(to, from){
    for (var i in from)
      if (from.hasOwnProperty(i)) 
        to[i] = from[i];
    return to;
}
