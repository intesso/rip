var rip  = require('../index')({options: {host:'api.elasticsearch.com'}});
var rip2 = require('../index')({'duu': 'per'});


rip.define();
rip2.define();
rip.define();

var url = require('url')

// url test string from api description http://nodejs.org/docs/latest/api/url.html: 
// 'http://user:pass@host.com:8080/p/a/t/h?query=string#hash'
var urlObj = url.parse('http://user:pass@127.0.0.9:80/*p/:a/:t/:h?*query=string&:a=b#+hash', true);
console.log("urlObj " + JSON.stringify(urlObj));