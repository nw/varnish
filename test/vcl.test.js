var Vcl = require('../').Vcl;

describe('VCL in Javascript', function(){
  var vcl;
  
  beforeEach(function(){
    vcl = new Vcl();
  });
  
  it('should exist', function(){
    vcl.should.be.instanceof(Vcl);
  });
  
  it('should allow comments', function(){
    //vcl.comment('this is a test');
    vcl.comment('this is a test');
    vcl.recv(function(){
      vcl.comment('nested inside a recv block');
    });
    
    var obj = vcl._stack.arr;
    
    obj[0][0].should.equal('comment')
    obj[0][1].should.equal('this is a test');
    obj[1][0].should.equal('recv');
    obj[1][1].should.be.a('object');

    obj[1][1][0].val[0].should.equal('comment');
    obj[1][1][0].val[1].should.equal('nested inside a recv block');
  })
  
  it('should allow dynamic arguments in recv', function(){
    
    vcl.recv(function(now, client, server, bereq, req, resp, beresp){
      now.should.have.property('val', 'now');
      
      client.should.have.property('ip')
      client.should.have.property('identity');
      
      server.should.have.property('ip');
      server.should.have.property('identity');
      server.should.have.property('port');
      
      bereq.should.have.property('url');
      bereq.should.have.property('proto');
      bereq.should.have.property('http');
      bereq.should.have.property('connect_timeout');
      bereq.should.have.property('first_byte_timeout');
      bereq.should.have.property('between_bytes_timeout');

      req.should.have.property('url');
      req.should.have.property('proto');
      req.should.have.property('backend')
      
      req.backend.should.be.a('function');
      
      req.should.have.property('http');
      req.should.have.property('xid');
      
    });
    
  })


});



