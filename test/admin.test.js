var Admin = require('./support/admin');

var varnish = new Admin('127.0.0.1', 7779, { 
  file: '/nw/sec.ret' 
, 'auto connect': false });


describe('Varnish Admin', function(){
  
  it('should exist', function(){
    Admin.should.be.a('function')
  });
  
  it('should be instanceof', function(){
    varnish.should.be.instanceof(Admin);
  });
  
  it('should connect', function(done){
    // varnish.on('connect', function(){
    //   done();
    // });
    varnish.connect();
    varnish.connected = true;
    varnish.connecting = false;
    varnish.authenticated = true;
    done();
  });
  
  it('should parse ping', function(done){
    varnish.ping(function(err, resp, raw){
      resp.should.be.true;
      done();
    });
  });
  
  it('should parse start', function(done){
    varnish.start(function(err, resp, raw){
      resp.should.be.true;
      done();
    });
  });
  
  it('should parse stop', function(done){
    varnish.stop(function(err, resp, raw){
      resp.should.be.true;
      done();
    });
  });
  
  
  it('should parse status', function(done){
    varnish.status(function(err, resp, raw){
      resp.should.be.true;
      done();
    });
  });
  
  
  it('should parse vcl.list', function(done){
    varnish.list(function(err, resp, raw){
      resp.should.be.an.instanceof(Array);
      resp.length.should.equal(7);
      resp[0].status.should.equal('available');
      done();
    });
  });
  
  
  it('should parse storage.list', function(done){
    varnish.storage(function(err, resp, raw){
      resp.should.be.a('object');
      Object.keys(resp).length.should.equal(2)
      resp["storage.s0"].should.equal("malloc");
      done();
    });
  });
  
  it('should parse backend.list', function(done){
    varnish.backend(function(err, resp, raw){
      resp.should.be.an.instanceof(Array);
      resp.length.should.equal(3);
      resp[0].status.should.equal('Healthy');
      resp[0].name.should.equal('tcs');
      resp[0].port.should.equal('80');
      resp[0].window.should.equal('5');
      done();
    });
  });
  
  
});
