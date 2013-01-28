## Varnish

### Install

```js
	npm install varnish
```
	
### Usage

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


### Servers


```js
	var admin = server.admin();
	var stats = server.stats();
```

#### Admin

#### Stats

### VCL

### Top

### Log

### Security

### Licence






