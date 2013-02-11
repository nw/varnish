# Varnish

varnish.js is a library to help with the management of varnish servers.

_from:_ [varnish-cache.org](https://www.varnish-cache.org/)

```
Varnish is a web accelerator. You install it in front of your web application and it will speed it up significantly. 
```

__Note:__ This library only targets Varnish 3.x and above. For clarity on the feature please refer to the [documentation](https://www.varnish-cache.org/docs/3.0/)

## README Contents
- [Features](#a1)
- [Installation](#a2)
- [Usage](#a3)
- [Api](#a4)
	- [Server](#a5)
	- [Admin](#a6)
	- [VCL](#a7)
	- [Stat](#a8)
	- [Top](#a9)
	- [Log](#a10)
- [Resources](#a11)
- [License](#a12)

<a name="a1"/>
## Features

<a name="a2"/>
## Installation

```bash

npm install varnish
```
You don't need varnish on the same machine or even at all to use this package. In order to run the integration tests you will need varnish running locally. Check out the [documentation and installation](https://www.varnish-cache.org/docs).

<a name="a3"/>
## Usage

```js

var varnish = require('varnish');
```

**Discover**

```js

varnish.discover(function(err, servers){
	servers.forEach(function(server){
		console.log(server.pid);
	});
});
```

**Create**

```js

var server = varnish.create();

server
	.id('test')
	.name('mine')
	.storage('malloc')
	.shmlog("200M")
	.workers('2,500,300')
	.pidfile('/var/run/varnish/chaining.pid')
	.secret('/hidden/file')
	.listen(':9000')
	.listen('proxy:8383')
	.management('localhost:4242')
	.vcl('/etc/varnish/default.vcl')
	.ttl(900)
	.param('max_restarts', 10);
	
server.start(function(err, server){
	console.log(server.pid);
});
```

**Manage**

```js

var admin = server.admin();

admin
	.ping()
	.start()
	.stop()
	.backend()
	.use()
	.kill();
```

**Analyse**

```js

var stats = server.stats({fields: ['client_conn', 'client_req', 'cache_hit']});

stats.on('data', function(json){
	json.timestamp
	json.cache_hit.value;
	json.cache_hit.persec;
	json.description
});

stats.kill();
```

**Configure**

```js

var vcl = varnish.vcl();

vcl.recv(function(resp, req){
  var header = req.http("Accept-Encoding");
  this.if(req.url.like("\.(jpg|png|gif|gz|tgz|bz2|tbz|mp3|ogg)$"))
    .comment("No point in compressing these")
    .unset(header)
  .elseif(header.like('gzip'))
    .set(header, "gzip")
  .elseif(header.like("deflate"))
    .set(header, "deflate")
  .else()
    .comment("unknown algorithm")
    .unset(header);
});

admin.inline('refname', vcl, function(err){
	if(err) return next(err);
	admin.use('refname', function(err){
		
	});
});
	
```
<a name="a4"/>
## Varnish

### varnish.get()

Find a varnishd instance based on id or instance name (-n). A function can be passed as a filter. The first server matches wins.

```js

varnish.get(pid, callback);
varnish.get(name, callback); // -n referenced
varnish.get(fn, callback); // filter function

```

### varnish.discover()

```js

varnish.discover();
varnish.discover({filter: fn});
varnish.discover({filter: [fn,fn]})
```

filters receive a process obj.

  - `pid`: pid
  - `ppid`: Parent pid
  - `user`: user
  - `command`: command running
  - `args`: string of args passed to command


### varnish.create()


<a name="a5"/>
## Server()

A helper class for wrapping the generation of command line options to create a varnishd instance. For more clarity on the options to pass please refer to the [varnishd documentation](https://www.varnish-cache.org/docs/3.0/reference/varnishd.html). 

Configuration options cannot be changed once a server has been initialized and has a pid. Attempts to change will be ignored.

  - pid: false
  - path: '/usr/local/sbin/varnishd'
  - running: false
  - child: false


### Server.listen(host)

Listen for client requests on the specified address and port. The address can be a host name (“localhost”), an IPv4 dotted-quad (“127.0.0.1”), or an IPv6 address enclosed in square brackets (“[::1]”). If address is not specified, varnishd will listen on all available IPv4 and IPv6 interfaces. If port is not specified, the default HTTP port as listed in /etc/services is used. Multiple listening addresses and ports can be specified.

```js

var cmd = server
	.listen(':9000')
	.listen('host.com:8888')
	.toString();
// cmd = '/usr/local/sbin/varnishd -a :9000,host.com:8888'
```


### Server.backend(host)

Use the specified host as backend server. If port is not specified, the default is 8080

```js

var cmd = server
	.backend('backend.com')
	.toString();
// cmd = '/usr/local/sbin/varnishd -b backend.com'
```

### Server.compile()

Print VCL code compiled to C language and exit. Specify the VCL file to compile with the -f option (`Server.vcl`).

### Server.debug()

Enables debugging mode: The parent process runs in the foreground with a CLI connection on stdin/stdout, and the child process must be started explicitly with a CLI command. Terminating the parent process will also terminate the child.

```js

var cmd = server
	.debug()
	.toString();
// cmd = '/usr/local/sbin/varnishd -d'
```

### Server.foreground()

Run in the foreground.

```js

var cmd = server
	.foreground()
	.toString();
// cmd = '/usr/local/sbin/varnishd -F'
```

### Server.vcl(vclString || Vcl instance)

Use the specified VCL configuration file instead of the builtin default. See vcl for details on VCL syntax. When no configuration is supplied varnishd will not start the cache process.

### Server.group(group)

Specifies the name of an unprivileged group to which the child process should switch before it starts accepting connections. This is a shortcut for specifying the group run-time parameter.

### Server.hash()

Specifies the hash algorithm.

  - simple_list: A simple doubly-linked list. Not recommended for production use.
  - classic[,buckets]: A standard hash table. This is the default. The hash key is the CRC32 of the object's URL modulo the size of the hash table. Each table entry points to a list of elements which share the same hash key. The buckets parameter specifies the number of entries in the hash table. The default is 16383.
  - critbit: A self-scaling tree structure. The default hash algorithm in 2.1. In comparison to a more traditional B tree the critbit tree is almost completely lockless.

### Server.id()

Specify the identity of the varnish server. This can be accessed using server.identity from VCL

### Server.shmlog()

Specify size of shmlog file. Scaling suffixes like 'k', 'm' can be used up to (e)tabytes. Default is 80 Megabytes. Specifying less than 8 Megabytes is unwise.

### Server.name()

Specify a name for this instance. Amonst other things, this name is used to construct the name of the directory in which varnishd keeps temporary files and persistent state. If the specified name begins with a forward slash, it is interpreted as the absolute path to the directory which should be used for this purpose.

### Server.pidfile()

Write the process's PID to the specified file.

### Server.param()

Set the parameter specified by param to the specified value. See Run-Time Parameters for a list of parameters. This option can be used multiple times to specify multiple parameters.

### Server.secret()

Path to a file containing a secret used for authorizing access to the management port.

### Server.storage()

Use the specified storage backend. See Storage Types for a list of supported storage types. This option can be used multiple times to specify multiple storage files. You can name the different backends. Varnish will then reference that backend with the given name in logs, statistics, etc.

### Server.management()

Offer a management interface on the specified address and port. See Management Interface for a list of management commands.

### Server.reverse()

Connect to this port and offer the command line interface. Think of it as a reverse shell. When running with -M and there is no backend defined the child process (the cache) will not start initially.

### Server.ttl()

Specifies a hard minimum time to live for cached documents. This is a shortcut for specifying the default_ttl run-time parameter.

### Server.user()

Specifies the name of an unprivileged user to which the child process should switch before it starts accepting connections. This is a shortcut for specifying the user run- time parameter.

If specifying both a user and a group, the user should be specified first.

### Server.version()

Display the version number and exit.

### Server.workers()

Start at least min but no more than max worker threads with the specified idle timeout. This is a shortcut for specifying the thread_pool_min, thread_pool_max and thread_pool_timeout run-time parameters.

If only one number is specified, thread_pool_min and thread_pool_max are both set to this number, and thread_pool_timeout has no effect.

### Server.start()

### Server.kill()

### Server.admin()

### Server.stat()

### Server.log()


<a name="a6"/>
## Admin(host, port, options)

  Admin client for `varnishadm`


```js

var varnish = require('varnish')
  , admin = new varnish.Admin(host, port, options);
```
  
  __Options__:
  
- `name` {String} name of the instance to connect to
- `auth` {String||Buffer} content of secret file for varnish
- `file` if auth not present will load file contents.
- `auto connect` {Boolean}

Using the `Server` class you can also create an `Admin` instance.

```js

var admin = server.admin();
```

The nice thing about creating it from the server is all properties set that apply to the admin class will be passed through automatically if the server has already been initialized and is running.



### Events

- `connect`: when a socket connection has been established with the management port.
- `authenticated`: when the authentication challenge from management port has been responded to correctly.
- `close`: when connection to the admin port has been closed.
- `error`: any network related error.

### Errors

__Command Errors__

All errors that occur talking directly to the admin port will be handled in a callback and will not emit an `error` event.

`error instanceof Error` in addition they have the a `code` property.

- 100: 'Syntax Error'
- 101: 'Unknown Request'
- 102: 'Not Implemented'
- 104: 'Too Few Parameters'
- 105: 'Too Many Parameters'
- 106: 'Bad Parameter'
- 107: 'Authentication Required'
- 200: 'OK'
- 201: 'Truncated'
- 300: "Can't Perform Operation"
- 400: "Communication Error"
- 500: "Close"

_not implemented by varnishadm_
- 800: 'Response Parsing Error'


### Admin.connect()

  Use when `autoconnect` flag == false


### Admin.send(command, arg1, arg2, Function)

  Send command to `varnishadm`. This is talking to the socket directly.

```js

admin.send('help', function(err, resp){
	
});

admin.send('vcl.load', 'dosattack', '/path/to/file/');
admin.send('vcl.use dosattack');
```

resp in all cases will be a string of the complete response from the admin.


### __Command Wrappers__

The following methods wrap the send command and parse the output of the response for you. As a result all callbacks passed to these method will receive three parameters.

- `error` {Error} object or `null`
- `resp` parsed {Object} if `error == null`
- `raw` the string response from the socket.


### Admin.ping(callback)

  Ping backend

```js

admin.ping(function(err, pong){
	if(!pong) // we have problems
})
```

### Admin.status(callback)

  Check if child state == 'running'

```js

admin.status(function(err, running){
	if(!running) // we need to start it
})
```

### Admin.start(callback)

  Starts child process (sets state == 'running')

```js

admin.start(function(err){
	// started if no error
});
```

### Admin.stop(callback)

  Stops child process (sets state == 'stopped')

```js

admin.stop(function(err){
	// stopped if no error
});
```

### Admin.list(callback)

  Returns list of loaded vcl files
  
  VCL {Object}
  
- name {String} name of vcl
- num {String} ???
- status {String} 'active|available|boot'

```js

admin.list(function(err, list){

console.log(list);	
/*
 [ {
     "status": "available",
     "num": "0",
     "name": "old"
   },
   {
     "status": "active",
     "num": "7",
     "name": "super_cache"
   }
 ] */
});
```

### Admin.load(reference, path, callback)

  Load a vcl from a file

### Admin.use(reference, callback)

  Make a vcl config active.

### Admin.inline(reference, inline, callback)

  Make a vcl config active.

### Admin.discard(reference, callback)

  Discard a loaded vcl

### Admin.settings(name, callback)

  Get details on varnish configuration parameters
  
  __Param__:
  
- value: {String} current value
- unit: {String} the unit type varnish expects
- default: {String} default value
- description: {String} description

	_Sample List_
	
`acceptor_sleep_decay`, `acceptor_sleep_incr`, `acceptor_sleep_max`, `auto_restart`, `ban_dups`, `ban_lurker_sleep`, `between_bytes_timeout`, `cc_command`, `cli_buffer`, `cli_timeout`, `clock_skew`, `connect_timeout`, `critbit_cooloff`, `default_grace`, `default_keep`, `default_ttl`, `diag_bitmap`, `esi_syntax`, `expiry_sleep`, `fetch_chunksize`, `fetch_maxchunksize`, `first_byte_timeout`, `group`, `gzip_level`, `gzip_memlevel`, `gzip_stack_buffer`, `gzip_tmp_space`, `gzip_window`, `http_gzip_support`, `http_max_hdr`, `http_range_support`, `http_req_hdr_len`, `http_req_size`, `http_resp_hdr_len`, `http_resp_size`, `idle_send_timeout`, `listen_address`, `listen_depth`, `log_hashstring`, `log_local_address`, `lru_interval`, `max_esi_depth`, `max_restarts`, `nuke_limit`, `pcre_match_limit`, `pcre_match_limit_recursion`, `ping_interval`, `pipe_timeout`, `prefer_ipv6`, `queue_max`, `rush_exponent`, `saintmode_threshold`, `send_timeout`, `sess_timeout`, `sess_workspace`, `session_linger`, `session_max`, `shm_reclen`, `shm_workspace`, `shortlived`, `syslog_cli_traffic`, `thread_pool_add_delay`, `thread_pool_add_threshold`, `thread_pool_fail_delay`, `thread_pool_max`, `thread_pool_min`, `thread_pool_purge_delay`, `thread_pool_stack`, `thread_pool_timeout`, `thread_pool_workspace`, `thread_pools`, `thread_stats_rate`, `user`, `vcc_err_unref`, `vcl_dir`, `vcl_trace`, `vmod_dir`, `waiter`


```js
{
  auto_restart: {
    value: 'on',
    unit: 'bool',
    default: 'on [bool]',
    desc: 'Restart child process automatically if it dies.'
  },
  cli_buffer: {
    value: '8192',
    unit: 'bytes',
    default: '8192 [bytes]',
    desc: 'Size of buffer for CLI input. You may need to increase this if you have big VCL files and use the vcl.inline CLI command. NB: Must be specified with -p to have effect.'
  },
  cli_timeout: {
    value: '10',
    unit: 'seconds',
    default: '10 [seconds]',
    desc: 'Timeout for the childs replies to CLI requests from the master.'
  }
}
```

### Admin.set(parameter, new, callback)

  Set a parameter

### Admin.panic(callback)

  Check for latest panic

### Admin.clear(callback)

  Clears the last panic

### Admin.storage(callback)

  Get list of current storage w/ type

```js

admin.storage(function(err, devices){
	console.log(devices);
	/* {
    "storage.Transient": "malloc",
    "storage.s0": "malloc"
  } */
})

```

### Admin.backend(callback)

  List of all backend currently referenced in loaded VCLs
  
  __Backend__:

- name {String}
- host {String}
- port {String}
- refs {String} number of vcls pointing at backend
- admin {String}
- status {String}
- passed {String}
- window {String}

```js

app.backend(function(err, backends){
	console.log(backends);
	
	 /* [
    {
      "name": "prod",
      "host": "108.166.39.30",
      "port": "80",
      "refs": "1",
      "admin": "probe",
      "status": "Sick",
      "passed": "1",
      "window": "5"
    },
    {
      "name": "api",
      "host": "198.61.245.73",
      "port": "80",
      "refs": "6",
      "admin": "probe",
      "status": "Healthy",
      "passed": "5",
      "window": "5"
    }
  ] */
	
})

```

### Admin.ban(url, callback)

  Ban urls/rules from cache

<a name="a7"/>
## VCL()

A chain-able interface that allows vcl files to be written in javascript.




<a name="a8"/>
## Stat


  Stats client for `varnishstat`


```js

var varnish = require('varnish')
  , stat = new varnish.Stat(options);
```

  __Options__:

- `fields` {Array} array of varnish fields to collect stats on
- `every` sample rate in `second` units.
- `name` instance of varnish to listen for


### Events

- `data`: stats object
  - timestamp: {Date} object normalized to current timezone.
  - fields: each field passed in options will be available. Each will have the following properties.
    - `value`: the current value of the field
    - `persec`: the normalized value over the last sec
    - `description`: description about the field
- `exit`: when connection to stats has been closed.
- `error`: any data received on stderr. This is not an `Error` object. It is a `Buffer`.


### Stat.list(callback) _static_

```js

Stat.list(function(err, list){
  console.log(list);
  /*
  {
    client_conn: "Client connections accepted"
  , client_drop: "Connection dropped, no sess/wrk"
  , client_req: "Client requests recieved"
  , cache_hit: "Cache hits"
  // truncated 
  }
  */
})

```

__List of fields__

  _truncated_

```
Field name                     Description
----------                     -----------
client_conn                    Client connections accepted
client_drop                    Connection dropped, no sess/wrk
client_req                     Client requests received
cache_hit                      Cache hits
cache_hitpass                  Cache hits for pass
cache_miss                     Cache misses
backend_conn                   Backend conn. success
backend_unhealthy              Backend conn. not attempted
backend_busy                   Backend conn. too many
backend_fail                   Backend conn. failures
backend_reuse                  Backend conn. reuses
backend_toolate                Backend conn. was closed
backend_recycle                Backend conn. recycles
backend_retry                  Backend conn. retry
s_bodybytes                    Total body bytes
sess_closed                    Session Closed
sess_pipeline                  Session Pipeline
sess_readahead                 Session Read Ahead
sess_linger                    Session Linger
n_vcl                          N vcl total
n_vcl_avail                    N vcl available
n_vcl_discard                  N vcl discarded
n_ban                          N total active bans
n_ban_gone                     N total gone bans
n_ban_add                      N new bans added
n_ban_retire                   N old bans deleted
uptime                         Client uptime
vmods                          Loaded VMODs
n_gzip                         Gzip operations
n_gunzip                       Gunzip operations
LCK.sms.creat                  Created locks
LCK.sms.destroy                Destroyed locks
LCK.sms.locks                  Lock Operations

..... and many more
```



<a name="a9"/>
## Top

<a name="a10"/>
## Log

<a name="a11"/>
## Resources


<a name="a12"/>
## Licence

(The MIT License)

Copyright (c) 2013 Nathan White <nw@nwhite.net>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.





