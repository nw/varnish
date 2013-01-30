# Varnish

Varnish is a web accelerator. This library aims to make it easier to manage varnish. 

## README Contents
- [Features](#a1)
- [Installation](#a2)
- [Usage](#a3)
- [Api](#a4)
	- [Server](#a5)
	- [Admin](#a6)
	- [Stat](#a7)
	- [VCL](#a8)
	- [Top](#a9)
	- [Log](#a10)
- [License](#a11)

<a name="a1"/>
## Features

<a name="a2"/>
## Installation

```bash

npm install varnish
```

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
	.param('ban_lurker_sleep', 10);
	
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
// etc
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
## API

### get

Find a varnishd instance based on id or instance name (-n). A function can be passed as a filter. The first server matches wins.

```js

varnish.get(pid, callback);
varnish.get(name, callback); // -n referenced
varnish.get(fn, callback); // filter function

```

### discover

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


### create


<a name="a5"/>
## Server

Configuration options cannot be changed once a server has been initialized and has a pid. Attempts to change will be ignored.

	- pid: false
	- path: '/usr/local/sbin/varnishd'
	- running: false
	- child: false


### listen

```js

var cmd = server
	.listen(':9000')
	.listen('host.com:8888')
	.toString();
// cmd = '/usr/local/sbin/varnishd -a :9000,host.com:8888'
```


### backend

### compile

### debug

### foreground

### vcl

### group

### hash

### id

### shmlog

### name

### pidfile

### param

### secret

### storage

### management

### reverse

### ttl

### user

### version

### workers

### start

### kill

### admin

### stat

### log


<a name="a6"/>
## Admin

The admin console has be wrapped to return json objects of the text response.

callbacks for all these methods is as follows

```js

function(err, result, raw){
	
}
```

result only exists if err is `null`. raw is the string received over the admin port.


### connect

### send

### destroy

### ping

### status

### start

### stop

### list

### load

### use

### show

### inline

### discard

### settings

### set

### panic

### clear

### storage

### backend

### ban

<a name="a7"/>
## Stat

<a name="a8"/>
## VCL

A chain-able interface that allows vcl files to be written in javascript.

<a name="a9"/>
## Top

<a name="a10"/>
## Log

<a name="a11"/>
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





