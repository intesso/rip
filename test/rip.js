var assert = require('assert');

describe('url.parse()', function() {
	it('should parse the url with params correctly', function() {
		var url = require('url')

		// url test string from api description http://nodejs.org/docs/latest/api/url.html: 
		// 'http://user:pass@host.com:8080/p/a/t/h?query=string#hash'
		var urlObj = url.parse('http://user:pass@127.0.0.9:80/*p/:a/:t/:h?*query=string&:a=b#hash', true);
		console.log('urlObj ' + JSON.stringify(urlObj));
		assert(urlObj, 'urlObj exists');
		assert(typeof urlObj.query == 'object');
		assert.equal('/*p/:a/:t/:h', urlObj.pathname);
		assert.equal('/*p/:a/:t/:h?*query=string&:a=b', urlObj.path);
		assert.equal('?*query=string&:a=b', urlObj.search);
		assert.equal('b', urlObj.query[':a']);
		assert.equal('string', urlObj.query['*query']);
	});
});

describe('rip instatiation', function() {
	it('should instantiate two independent rip objects', function() {

		var rip = require('../index')({
			options: {
				host: 'api.elasticsearch.com',
				port: 443
			}
		});
		var rip2 = require('../index')({
			'duu': 'per'
		});

		assert.ok(rip.options.host);
		assert.equal('api.elasticsearch.com', rip.options.host);
		assert.equal(443, rip.options.port);

		assert.equal('localhost', rip2.options.host);
		assert.equal('per', rip2.duu);
		assert.equal(80, rip2.options.port);
	});
});

describe('rip.call()', function() {
	it('should show basic elasticsearch information', function(done) {
		var rip = require('../index')({
			options: {
				port: 9200
			}
		})
		rip.call({
			method: "GET",
			url: ""
		}, function(err, result) {
			console.log("call result: " + result);
			result = JSON.parse(result);
			assert.equal(true, result.ok);
			assert.equal(200, result.status);
			done();
		})
	});

	it('should show indices information', function(done) {
		var rip = require('../index')()
		rip.call({
			url: "http://localhost:9200/_status"
		}, function(err, result) {
			console.log("call result: " + result);
			result = JSON.parse(result);
			assert.equal(true, result.ok);
			assert(result.indices);
			done();
		})
	});

	// it('should add an index, if not yet existent', function(done) {
	// 	var rip = require('../index')()
	// 	rip.call({
	// 		url: "http://localhost:9200/:index/",
	// 		method: "PUT",
	// 		params: {index:"rip"}
	// 	}, function(err, result) {
	// 		console.log("call result: " + result);
	// 		result = JSON.parse(result);
	// 		assert.equal(true, result.ok);
	// 		done();
	// 	})
	// });

	it('should add an element of a type to an index and it should be found afterwards', function(done) {
		var async = require('async');

		// call the function with different signatures.
		async.series([

		// it('should add an element of a type to the index'

		function(callback) {
			var rip = require('../index')()
			rip.call({
				url: "http://localhost:9200/:index/:type/:id",
				method: "PUT",
				params: {
					index: "rip",
					type: "user",
					id: 1
				},
				data: {
					user: "andi",
					created: "a while ago"
				}

			}, function(err, result) {
				console.log("call result: " + result);
				result = JSON.parse(result);
				assert.equal(true, result.ok);
				assert.equal("rip", result._index);
				assert.equal("user", result._type);
				assert.equal(1, result._id);
				callback();
			});
		},

		// it('should find the user andi'


		function(callback) {
			setTimeout(
			function() {
				var rip = require('../index')()
				rip.call({
					url: "http://localhost:9200/rip/user/_search?q=user:user&pretty=true",
					params: {
						user: ":andi"
					}
				}, function(err, result) {
					console.log("call result: " + result);
					result = JSON.parse(result);
					assert(result.hits.total > 0);
					callback();
				});
			}, 1000);
		},

		// it('should find the user andi via query'

		function(callback) {
			var rip = require('../index')()
			rip.call({
				url: "http://localhost:9200/rip/user/_search",
				query: {
					q: "user:user",
					pretty: true
				},
				params: {
					user: ":andi"
				}
			}, function(err, result) {
				console.log("call result via query: " + result);
				result = JSON.parse(result);
				assert(result.hits.total > 0);
				callback();
			})
		},

		// it('should find the user andi via query'

		function(callback) {
			var rip = require('../index')()
			rip.call({
				url: "http://localhost:9200/rip/user/_search",
				query: {
					q: "user:user",
					pretty: true
				},
				params: {
					user: ":andi"
				}
			}, function(err, result) {
				console.log("call result via query: " + result);
				result = JSON.parse(result);
				assert(result.hits.total > 0);
				callback();
			})
		},

		// it('should find the user andi via data query'

		function(callback) {
			var rip = require('../index')()
			rip.call({
				url: "http://localhost:9200/rip/user/_search?pretty=true",
				data: {
					"query": {
						"term": {
							"user": ":user"
						}
					}
				},
				params: {
					user: "andi"
				}
			}, function(err, result) {
				console.log("call result search andi: " + result);
				result = JSON.parse(result);
				assert(result.hits.total > 0);
				callback();
			});
		}],
		// async callback

		function(err, results) {
			// results is now equal to ['one', 'two']
			assert.equal(results.length, 5);
			done();
		});
	});



	it('should replace the params in the data object', function() {
		var opts = {
			data: {
				"query": {
					"term": {
						"user": ":user"
					}
				}
			},
			params: {
				user: "bobby"
			}
		}


		var PARAMS_PATTERN = /(:|\*)\w+/gm;
		var ERROR_MISSING_PARAMETER = "ERROR_MISSING_PARAMETER";

		var d = JSON.stringify(opts.data);
		console.log("DATA: ", d, opts.params);
		console.log("MATCH: ", d.match(PARAMS_PATTERN));
		console.log("EXEC: ", PARAMS_PATTERN.exec(d));
		var data = resolveParams(d, opts.params);

		console.log("RESOLVED_DATA ", data);
		assert(data);
		assert(data.indexOf("bobby") > -1);


		function resolveParams(str, params) {
			// begins with * or : and ends where the word ends
			var result = str;
			if (!params || !str || !str.length) return null;
			var variables = str.match(PARAMS_PATTERN);
			console.log("VARIABLES ", variables, str, typeof str);
			if (!variables) return null;
			for (var i in variables) {
				var name = variables[i].substring(1);
				var type = variables[i].charAt(0);
				var mandatory = (type == ':');
				if (params[name]) {
					result = result.replace(variables[i], params[name]);
				} else if (mandatory) {
					result = result.replace(variables[i], variables[i] + '-' + ERROR_MISSING_PARAMETER);
				}
			}
			return result;
		}

	});

});

// it('should work too', function(done) {
// 	var url = require('url')

// 	// url test string from api description http://nodejs.org/docs/latest/api/url.html: 
// 	// 'http://user:pass@host.com:8080/p/a/t/h?query=string#hash'
// 	var urlObj = url.parse('/', true);


// 	var rip = require('../index')({
// 		options: {
// 			port: 9200,
// 			method: "GET"
// 		}
// 	})
// 	recursivePropertiesMerge(rip.options, urlObj);
// 	urlObj.headers = {};
// 	recursivePropertiesMerge(rip.headers, urlObj.headers);

// 	console.log("urlObj with / " + JSON.stringify(urlObj));

// 	var http = require('http');
// 	var request = http.request(urlObj);

// 	// process http response
// 	request.on('response', function(response) {
// 		var body = '';
// 		response.on('data', function(chunk) {
// 			body += chunk;
// 		});
// 		response.on('end', function() {
// 			console.log ("http call result " + body );
// 			done();
// 		});
// 		response.on('error', function(error) {
// 			if (fn) fn(error);
// 		})
// 	});
// 	request.end('');



// 	function recursivePropertiesMerge(defaults, args) {
// 		for (var opts in defaults) {
// 			if (!args[opts]) {
// 				args[opts] = defaults[opts];
// 				console.log('default ' + opts + ':' + defaults[opts]);
// 			} else if (typeof defaults[opts] == 'object') {
// 				recursivePropertiesMerge(defaults[opts], args[opts])
// 			}
// 		}
// 	}
// });


describe('rip.define()', function() {
	it('should define the function correctly and it should be callable', function(done) {
		var rip = require('../index')({
			options: {
				port: 9200
			}
		})
		rip.define({
			name: "getStatus",
			method: "GET",
			url: "/_status?pretty=true",
			docOriginal: "http://www.elasticsearch.org/guide/reference/api/admin-indices-status/",
			docApi: ""
		});
		assert(rip.getStatus);
		assert(typeof rip.getStatus == 'function');
		assert(rip.api.getStatus);
		assert(rip.api.getStatus.name);
		assert(rip.api.getStatus.urlObj);
		assert.equal(rip.api.getStatus.urlObj.pathname, "/_status");

		var async = require('async');

		// call the function with different signatures.
		async.parallel([

		function(callback) {
			rip.getStatus({}, function(err, result) {
				result = JSON.parse(result);
				console.log("getStatus RESULT: ", result);
				assert(result.indices.rip);
				callback();
			})
		},

		function(callback) {
			rip.getStatus(null, null, function(err, result) {
				result = JSON.parse(result);
				console.log("getStatus RESULT: ", result);
				assert(result.indices.rip);
				callback();
			})
		},

		function(callback) {
			rip.getStatus(function(err, result) {
				result = JSON.parse(result);
				console.log("getStatus RESULT: ", result);
				assert(result.indices.rip);
				callback();
			})
		},


		],
		// async callback

		function(err, results) {
			// results is now equal to ['one', 'two']
			assert(results.length == 3);
			done();
		});

	});
});


describe('rip.define()', function() {
	it('should define the function correctly and it should be callable', function(done) {
		var rip = require('../index')({
			options: {
				port: 9200
			}
		})
		rip.define({
			name: "insertEntry",
			url: "/:index/:type/:id",
			method: "PUT",
			data: {
				user: "andi",
				created: "a while ago"
			}
		});
		var async = require('async');

		// call the function with different signatures.
		async.series([

		function(callback) {
			rip.insertEntry({
				index: "rip",
				type: "user",
				id: 1
			}, {
				user: "andy",
				created: "in the past"
			}, function(err, result) {
				result = JSON.parse(result);
				console.log("getStatus RESULT: ", result);
				assert.equal(true, result.ok);
				assert.equal("rip", result._index);
				assert.equal(1, result._id);
				callback();
			})
		},

		function(callback) {
			rip.insertEntry({
				index: "rip",
				type: "user",
				id: 2
			}, {
				user: "iris",
				created: "just now"
			}, function(err, result) {
				result = JSON.parse(result);
				console.log("getStatus RESULT: ", result);
				assert.equal(true, result.ok);
				assert.equal("rip", result._index);
				assert.equal(2, result._id);
				callback();
			})
		}],
		// async callback

		function(err, results) {
			// results is now equal to ['one', 'two']
			assert.equal(results.length, 2);
			done();
		});


	});
});