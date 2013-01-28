var Server = require('../').Server;

describe('Varnish Server', function(){
  var server;
  
  beforeEach(function(){
    server = new Server();
    server.path = 'varnishd';
  });
  
  it('should exist', function(){
    server.should.be.instanceof(Server);
  });
  
  it('should allow chaining', function(){
    server
      .id('test-chain')
      .name('chaining')
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
      
    var cmd = "varnishd -a :9000,proxy:8383 -f /etc/varnish/default.vcl "
            + "-i test-chain -l 200M -n chaining -P /var/run/varnish/chaining.pid "
            + "-p ban_lurker_sleep=10 -S /hidden/file -s malloc -T localhost:4242 "
            + "-t 900 -w 2,500,300";
    server.toString().should.equal(cmd);
    
    
  });
  
  it('should handle listen properly (-a)', function(){
    var test = 'varnishd -a ';
    
    ['localhost:9000', 'host.com:9000', 'abc123.com:8931'].forEach(function(addr, idx, arr){
      server.listen(addr);
      server.toString().should.equal(test+arr.slice(0, idx+1).join(','));
    });
    
  });
  
  it('should handle backend (-b)', function(){
    var test = 'varnishd -b ';
    var host = "backend.firewall:3426";
    server.backend(host);
    server.toString().should.equal(test+host);
    host = "internal:6923";
    server.backend(host);
    server.toString().should.equal(test+host);
  });
  
  it('should only set the flag no val/prop on compile (-C)', function(){
    server.compile("some value");
    server.toString().should.equal('varnishd -C');
  });
  
  
  it('should only set the flag no val/prop on debug (-d)', function(){
    server.debug("some value");
    server.toString().should.equal('varnishd -d');
  });
  
  it('should only set the flag no val/prop on foreground (-F)', function(){
    server.foreground("some value");
    server.toString().should.equal('varnishd -F');
  });
  
  it('should set the default vcl (-f)', function(){
    server.vcl("/path/to/default.vcl");
    server.toString().should.equal('varnishd -f /path/to/default.vcl');
  });
  
  it('should set the group flag (-g)', function(){
    server.group("varnish");
    server.toString().should.equal('varnishd -g varnish');
  });
  
  it('should set the default hash (-h)', function(){
    server.hash("classic,16383");
    server.toString().should.equal('varnishd -h classic,16383');
    server.hash("critbit");
    server.toString().should.equal('varnishd -h critbit');
  });
  
  it('should set the identity (-i)', function(){
    server.id('varnish-unit-test');
    server.toString().should.equal('varnishd -i varnish-unit-test');
  });
  
  it('should set the shmlog properly (-l)', function(){
    server.shmlog("200M");
    server.toString().should.equal('varnishd -l 200M');
    server.shmlog("1G");
    server.toString().should.equal('varnishd -l 1G');
  });
  
  it('should set the name (-n)', function(){
    server.name('varnish-test');
    server.toString().should.equal('varnishd -n varnish-test');
  });
  
  it('should set the pid file (-P)', function(){
    server.pidfile('/var/run/varnish-test.pid');
    server.toString().should.equal('varnishd -P /var/run/varnish-test.pid');
  });
  
  it('should handle params properly (-p)', function(){
    server.param('ban_lurker_sleep', 10);
    server.toString().should.equal('varnishd -p ban_lurker_sleep=10');
    server.param('cli_buffer', 32000);
    server.toString().should.equal('varnishd -p ban_lurker_sleep=10 -p cli_buffer=32000');
  });
  
  it('should set the secret file (-S)', function(){
    server.secret('/hidden/secret');
    server.toString().should.equal('varnishd -S /hidden/secret');
  });
  
  it('should set the storage (-s)', function(){
    server.storage('malloc,420M');
    server.toString().should.equal('varnishd -s malloc,420M');
    server.storage('file,/file/path,40G,16M');
    server.toString().should.equal('varnishd -s malloc,420M -s file,/file/path,40G,16M');
    server.storage('file,/file/path,80%');
    server.toString().should.equal('varnishd -s malloc,420M -s file,/file/path,40G,16M -s file,/file/path,80%');
    server.storage('persistent,path,20G');
    server.toString().should.equal('varnishd -s malloc,420M -s file,/file/path,40G,16M -s file,/file/path,80% -s persistent,path,20G');
  });
  
  
  it('should handle management port (-T)', function(){
    var test = 'varnishd -T ';
    var host = "backend.firewall:3426";
    server.management(host);
    server.toString().should.equal(test+host);
    host = "internal:6923";
    server.management(host);
    server.toString().should.equal(test+host);
  });
  
  it('should handle reverse shell port (-M)', function(){
    var test = 'varnishd -M ';
    var host = "backend.firewall:3426";
    server.reverse(host);
    server.toString().should.equal(test+host);
    host = "internal:6923";
    server.reverse(host);
    server.toString().should.equal(test+host);
  });
  
  it('should handle setting ttl (-t)', function(){
    server.ttl(300);
    server.toString().should.equal('varnishd -t 300');
    server.ttl(600);
    server.toString().should.equal('varnishd -t 600');
  });
  
  it('should set the user flag (-u)', function(){
    server.user("varnish");
    server.toString().should.equal('varnishd -u varnish');
  });
  
  it('should only set the flag no val/prop on version (-V)', function(){
    server.version("some value");
    server.toString().should.equal('varnishd -V');
  });
  
  it('should set workers (-w)', function(){
    server.workers('2,500,300');
    server.toString().should.equal('varnishd -w 2,500,300');
    server.workers('40');
    server.toString().should.equal('varnishd -w 40');
  });
  

})

