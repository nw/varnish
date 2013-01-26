
var Type = require('./type');

var infinity = exports.infinity = Number.POSITIVE_INFINITY;

// see: https://www.varnish-cache.org/trac/wiki/VCL.BNF
// https://www.varnish-cache.org/trac/wiki/BackendConditionalRequests (stale_obj) - missing from spec
// syntax: https://www.varnish-cache.org/trac/browser/doc/sphinx/reference/vcl.rst?rev=db1a21ffba8f34776c0c971de80e29c7fd0766d6

// the possible states varnish is in
var STATE = exports.STATE = {};
['INIT','RECV','PIPE','PASS','HASH','MISS'
,'FETCH','HIT','ERROR','DELIVER','FINISH']
.forEach(function(state, idx){
  exports.STATE[state] = idx;
});

// restart !!! (missing)
// panic

Globals

(  STATE.INIT, [
  'now'
, 'server.hostname'
, 'server.identity'
, 'server.ip'
, 'server.port'
])

(  STATE.RECV, [
  'client.ip'
, 'client.identity'
, 'req.request'
, 'req.url'
, 'req.proto'
, 'req.backend' // (healthy)
, 'req.http'
, 'req.has_always_miss'
, 'req.has_ignore_busy'
, 'req.can_gzip'
, 'req.restarts'
, 'req.esi'
, 'req.res_level'
, 'req.grace'
, 'req.xid'
])

(
  STATE.PIPE, [
  'bereq.request'
, 'bereq.url'
, 'bereq.proto'
, 'bereq.http'
, 'bereq.connect_timeout'
])

(
  STATE.PASS, [
  'bereq.first_byte_timeout'
, 'bereq.between_bytes_timeout'
])

(
  STATE.FETCH, [
  "beresp.do_stream"
, "beresp.do_esi"
, "beresp.do_gzip"
, "beresp.do_gunzip"
, "beresp.proto"
, "beresp.status"
, "beresp.response"
, "beresp.ttl"
, "beresp.grace"
, "beresp.saintmode"
, "beresp.storage"
, "beresp.backend" // (name, ip, port)
, "beresp.http"
])

(
  STATE.HIT, [
, "obj.proto"
, "obj.status"
, "obj.response"
, "obj.ttl"
, "obj.lastuse"
, "obj.hits"
, "obj.grace"
, "obj.http"
, "req.hash"
])

(
  STATE.DELIVER, [
, "resp.proto"
, "resp.status"
, "resp.response"
, "resp.http"
]);

// assumes MAX = 0 and MIN = 0 and code = true
exports.blocks = {
  
  init: {
    state: STATE.init
  , events: ['ok']}
  
, recv: {
    state: STATE.RECV
  , events: ['error', 'pass', 'pipe', 'lookup']}
  
, pipe: {
    state: STATE.PIPE
  , events: ['error', 'pipe']}
  
, pass: {
    state: STATE.PASS
  , events: ['error', 'pass', 'restart']}
  
, hash: {
    state: STATE.HASH
  , events: ['hash']}
  
, miss: {
    state: STATE.MISS
  , events: ['error', 'pass', 'fetch']}
  
, fetch: {
    state: STATE.FETCH
  , events: ['deliver', 'error', 'hit_for_pass', 'restart']}
  
, hit: {
    state: STATE.HIT
  , events: ['deliver', 'error', 'pass', 'restart']}
  
, error: {
    state: STATE.ERROR
  , events: ['deliver', 'restart']}
  
, deliver: {
    state: STATE.DELIVER
  , events: ['deliver', 'error', 'restart']}
  
, finish: {
    state: STATE.FINISH
  , events: ['ok']}
  
, sub: {}

, include: { code: false }
, import: { code: false }
, backend: { code: false, max: 1 }
, probe: { code: false, max: 1 }
, acl: { code: false }
, director: { code: false }
 
, if: { min: 1, max: infinity }
, elseif: {min: 1, max: infinity }
, else: {min: 1, max: infinity }

};

//functions
exports.functions = 
[ ['hash_data', true]
, ['regsub', true, true, true]
, ['regsuball', true, true, true]
, ['ban', true]
, ['ban_url', true]];


//returns
exports.returns =
[ 'ok'
, 'error'
, 'pass'
, 'pipe'
, 'lookup'
, 'restart'
, 'hash'
, 'fetch'
, 'deliver'
, 'hit_for_pass'];


function Globals(){
  var state = arguments[0]
    , properties = arguments[1];
    
  properties.forEach(function(prop){
    var keys = prop.split('.')
      , ns = keys[0]
      , key = keys[1]
      , child = keys[2];
      
    if(key) exports[ns] = exports[ns] || {};
    else return exports[ns] = new Type(ns);

    if(child || key == 'http' || key == 'backend'){
       exports[ns][key] = function(prop){
         var name = [ns, key];
         if(prop) name.push(prop);
         return new Type(name.join('.'))
       }
    } else {
      return exports[ns][key] = new Type(keys.join('.'));
    }
    
  });

  return arguments.callee;
}
