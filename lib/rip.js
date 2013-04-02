var request = require('request'),
	http = require('http'),
	https = require('https'),
	util = require('util'),
	url = require('url'),
	qs = require('querystring');

var PARAMS_PATTERN = /(:|\*)\w*/g;
var ERROR_MISSING_PARAMETER = "ERROR_MISSING_PARAMETER";


// usage e.g. NODE_DEBUG='http rip' node test/rip.js 
var debug;
if (process.env.NODE_DEBUG && /rip/.test(process.env.NODE_DEBUG)) {
	debug = function(x) {
		console.error('RIP: %s', x);
	};
} else {
	debug = function() {};
}

var rip = exports = module.exports = function(options) {
	return new RIP(options);
}

/**
 * RIP: RESTful Client constructor function.
 * @param {Object} opts: options, headers
 */

	function RIP(opts) {
		self = this;
		// store options
		if (!opts) opts = {};
		for (opt in opts) {
			this[opt] = opts[opt];
		}
		// set default options
		if (!this.options) this.options = {};
		if (!this.options.host) this.options.host = 'localhost';
		if (!this.options.port) this.options.port = 80;
		if (!this.options.prefix) this.options.prefix = '';
		if (!this.options.secure) this.options.secure = false;
		//if (!this.options.method) this.options.method = 'GET';
		//if (!this.options.auth) this.options.auth = 'user:password';

		// set default headers
		if (!this.headers) this.headers = {};
		if (!this.headers['User-Agent']) this.headers['User-Agent'] = 'https://github.com/intesso/rip';
		if (!this.headers['Content-Type']) this.headers['Content-Type'] = 'application/json';

		debug('opts: ' + JSON.stringify(this));
	}

RIP.prototype.define = function() {
	debug('method not implemented yet sorry');
}



RIP.prototype.call = function(args, fn) {
	var self = this;
	var opts = {};

	// copy options from arguments
	for (opt in args) {
		opts[opt] = args[opt];
	}

	// get options from this object if not provided via arguments (defaults)
	// merge recursively, but in practice it should not go deeper than two levels anyway (e.g. options.secure) , 
	// but only if the property is not part of the args.
	recursivePropertiesMerge(this, opts);
	debug('call opts: ' + JSON.stringify(opts));

	//consolidate opts.params and opts.querystring into opts.url
	var urlObj = mergeUrlOptions(opts);

	/*
	example urlObj:
	{
  "protocol": "http:",
  "slashes": true,
  "auth": "user:pass",
  "host": "127.0.0.9:80",
  "port": "80",
  "hostname": "127.0.0.9",
  "href": "http://user:pass@127.0.0.9:80/*p/:a/:t/:h?*query=string&:a=b#+hash",
  "hash": "#+hash",
  "search": "?*query=string&:a=b",
  "query": {
    "*query": "string",
    ":a": "b"
  },
	  "pathname": "/*p/:a/:t/:h",
	  "path": "/*p/:a/:t/:h?*query=string&:a=b"
	}
	 */

	// resolve path parameters
	var pathnameOriginal = urlObj.pathname;
	var pathnameResolved = resolveParams(pathnameOriginal, opts.params);
	pathnameResolved = (pathnameResolved) ? opts.prefix + pathnameResolved : opts.prefix + pathnameOriginal;

	// resolve query parameters
	var searchOriginal = urlObj.search;
	var searchResolved = "";
	var query = urlObj.query;
	if (query) {
		for (param in query) {
			var queryResolved = resolveParams(param, opts.params);
			if (queryResolved) {
				query[param] = queryResolved;
			}
		}
		searchResolved = "?" + qs.stringify(query);
	}

	// update urlObj path and query parameters
	var pathResolved = pathnameResolved + searchResolved;
	var pathOriginal = pathnameOriginal + searchOriginal;
	urlObj.pathname = pathnameResolved;
	urlObj.search = searchResolved;
	urlObj.path = pathResolved;
	urlObj.href = urlObj.href.replace(pathOriginal, pathResolved);

	// prepare http request
	var client = (opt.options.secure) ? https : http;
	var request = client.request(urlObj);

	// process http response
	request.on('response', function(response) {
		var body = '';
		response.on('data', function(chunk) {
			body += chunk;
		});
		response.on('end', function() {
			if (fn) fn(null, body);
		});
		response.on('error', function(error) {
			if (fn) fn(error);
		})
	});

	// http request error handling
	if (opt.options.timeout) {
		request.setTimeout(opt.options.timeout, function() {
			if (fn) fn(new Error('timed out after ' + opt.options.timeout + 'ms'));
		});
	}
	request.on('error', function(error) {
		if (fn) fn(error);
	})

	// send http request
	if (opt.data) {
		if (typeof opt.data != 'string') {
			opt.data = JSON.stringify(opt.data);
		}
		request.setHeader('Content-Length', Buffer.byteLength(opt.data, 'utf8'));
		request.end(opt.data);
	} else {
		request.end('');
	}
}

/**
 * Recursively merge two objects. Merge defaults into args properties if they don't exist in the args already.
 * @param  {Object} defaults
 * @param  {Object} args
 * @return {[type]}
 */

function recursivePropertiesMerge(defaults, args) {
	for (opt in defaults) {
		if (!args[opt]) {
			args[opt] = defaults[opt];
			debug('default: ' + defaults[opt]);
		} else if (typeof defaults[opt] == 'object') {
			recursivePropertiesMerge(defaults[opt], args[opt])
		}
	}
}


/**
 * url has got the highest priority
 * @param  {Object} opt RIP object
 * @return {Object} parsed and merged url Object. Parsed with url.parse.n
 */
function mergeUrlOptions(opt) {
	// parse url as well as querystring
	urlObj = url.parse(opt.url, true);
	// merge default options into urlObj
  recursivePropertiesMerge(opt.options, urlObj);
  if (opt.querystring) {
  	var querystring = {}
  	if(typeof opt.querystring == 'string') {
  	  querystring = qs.parse(opt.querystring);
  	} else {
  		querystring = opt.querystring;
  	}
  }

	// merge opt.querystring into urlObj.query
	recursivePropertiesMerge(querystring, urlObj.query);
	return urlObj;
}


function resolveParams(str, params) {
	// begins with * or : and ends where the word ends
	var result = str;
	var variables = str.match(PARAMS_PATTERN);
	if (!variables) return null;
	for (variable in variables) {
		var name = variable.substring(1);
		var type = variable.charAt(0);
		var mandatory = (type == ":");
		if(params[name]){
			result = result.replace(variable, params[name]);
		} else if (mandatory) {
			result = result.replace(variable, variable + "-" + ERROR_MISSING_PARAMETER);
		}
	}
	return result;
}

