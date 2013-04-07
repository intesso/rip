var request = require('request'),
	http = require('http'),
	https = require('https'),
	util = require('util'),
	url = require('url'),
	qs = require('querystring'),
	_ = require('underscore');

var PARAMS_PATTERN = /(:|\*)\w+/gm;
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
 * @param {Object} opts: {options, headers}
 */

	function RIP(opts) {
		var self = this;
		// store options
		if (!opts) var opts = {};
		for (var opt in opts) {
			this[opt] = opts[opt];
		}
		this.api = {};
		// set default options
		if (!this.options) this.options = {};
		if (!this.options.host) this.options.host = 'localhost';
		if (!this.options.port) this.options.port = 80;
		if (!this.options.prefix) this.options.prefix = '';
		if (!this.options.secure) this.options.secure = false;
		if (!this.options.method) this.options.method = 'GET';
		if (!this.options.resolveParamsIn) this.options.resolveParamsIn = ["url", "query", "data"];
		//if (!this.options.auth) this.options.auth = 'user:password';

		// set default headers
		if (!this.headers) this.headers = {};
		if (!this.headers['User-Agent']) this.headers['User-Agent'] = 'https://github.com/intesso/rip';
		if (!this.headers['Content-Type']) this.headers['Content-Type'] = 'application/json';

		debug('opts: ' + JSON.stringify(this));
	}
	/**
	 * Defines a RESTful function call.
	 * @param  {Object} opts {name, url, method, [query], [data], [docOriginal], [docApi]}
	 */
	RIP.prototype.define = function(opts) {
		var self = this;
		if (!opts || !opts.name) {
			return new Error("Missing argument: field name is missing.");
		}

		// get options from this object if not provided via arguments (defaults)
		// merge recursively, but in practice it should not go deeper than two levels anyway (e.g. options.secure) , 
		// but only if the property is not part of the args.
		opts.options = opts.options || {};
		opts.headers = opts.headers || {};
		recursivePropertiesMerge(this.options, opts.options);
		recursivePropertiesMerge(this.headers, opts.headers);

		//consolidate opts.params and opts.query into opts.url
		var urlObj = mergeUrlOptions(opts);

		opts.urlObj = urlObj;
		this.api[opts.name] = opts;

		/**
		 * Shortcut function for the call function, with predefined properties.
		 *
		 * @param  {Object}   params Key value pairs with parameters that should be replaced in: url, query or data.
		 * @param  {Object}   data   The data object to send
		 * @param  {Function} fn     Call back function
		 */
		this[opts.name] = function(params, data, fn) {
			this._call(opts, params, data, fn);
		}
	}

	/**
	 * RESTful call for functions that are defined already.
	 * @param  {Object}   opts   {options, headers, urlObj}
	 * @param  {Object}   params Key value pairs with parameters that should be replaced in: url, query or data.
	 * @param  {Object}   data   The data object to send
	 * @param  {Function} fn     Call back function
	 */
	RIP.prototype._call = function(options, params, data, fn) {
		var opts = {};
		for (var opt in options) {
			opts[opt] = _.clone(options[opt]);
		}
		var urlObj = opts.urlObj;
		opts.params = params;

		if (data && typeof data != 'function') {
			opts.data = data;
		} else if (data && typeof data == 'function') {
			fn = data;
		} else if (!data && !fn) {
			if (typeof params == 'function') {
				fn = params;
			} else {
				fn = null;
			}
		}
		console.log("_call", JSON.stringify(opts), JSON.stringify(params), data, fn);

		resolvePath(urlObj, opts);
		makeHttpRequest(urlObj, opts, fn);
	}

	/**
	 * RESTful function call. calls the endpoint directly, without a predefined function (define).
	 * @param  {Object}   args   {method, url, [query], [data], [params], [options], [headers]}
	 * @param  {Function} fn     Call back function
	 */
	RIP.prototype.call = function(args, fn) {
		var self = this;
		var opts = {};

		// copy options from arguments
		for (var opt in args) {
			opts[opt] = args[opt];
		}

		// get options from this object if not provided via arguments (defaults)
		// merge recursively, but in practice it should not go deeper than two levels anyway (e.g. options.secure) , 
		// but only if the property is not part of the args.
		opts.options = opts.options || {};
		opts.headers = opts.headers || {};
		recursivePropertiesMerge(this.options, opts.options);
		recursivePropertiesMerge(this.headers, opts.headers);

		//consolidate opts.params and opts.query into opts.url
		var urlObj = mergeUrlOptions(opts);
		resolvePath(urlObj, opts);
		makeHttpRequest(urlObj, opts, fn);
	}

	function makeHttpRequest(urlObj, opts, fn) {
		// prepare http request
		var client = (opts.options.secure) ? https : http;
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
		if (opts.options.timeout) {
			request.setTimeout(opts.options.timeout, function() {
				if (fn) fn(new Error('timed out after ' + opts.options.timeout + 'ms'));
			});
		}
		request.on('error', function(error) {
			if (fn) fn(error);
		})

		// send http request
		if (opts.data) {
			var data = '';
			if (typeof opts.data != 'string' && opts.headers['Content-Type'] == 'application/json') {
				opts.data = JSON.stringify(opts.data);
				if (opts.options.resolveParamsIn.indexOf("data") > -1) {
					data = resolveParams(opts.data, opts.params);
				}
				data = (data) ? data : opts.data;
			}
			request.setHeader('Content-Length', Buffer.byteLength(data, 'utf8'));
			request.end(data);
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
		for (var opts in defaults) {
			if (!args[opts]) {
				args[opts] = defaults[opts];
				debug('default: ' + defaults[opts]);
			} else if (typeof defaults[opts] == 'object') {
				recursivePropertiesMerge(defaults[opts], args[opts])
			}
		}
	}

	/**
	 * url has got the highest priority
	 * @param  {Object} opts RIP object
	 * @return {Object} parsed and merged url Object. Parsed with url.parse.n
	 */

	function mergeUrlOptions(opts) {
		// parse url as well as query
		var urlObj = url.parse(opts.url, true);
		// merge default options into urlObj
		recursivePropertiesMerge(opts.options, urlObj);
		urlObj.headers = {};
		recursivePropertiesMerge(opts.headers, urlObj.headers);
		if (opts.method) {
			urlObj.method = opts.method;
		}
		if (opts.query) {
			var query = {}
			if (typeof opts.query == 'string') {
				query = qs.parse(opts.query);
			} else {
				query = opts.query;
			}
		}

		// merge opts.query into urlObj.query
		recursivePropertiesMerge(query, urlObj.query);

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

		return urlObj;
	}

	/**
	 * Resolves the path and the query.
	 * @param  {Object} urlObj url object returned with url.parse()
	 * @param  {Object} opts   Options
	 */

	function resolvePath(urlObj, opts) {
		var resolveParamsIn = opts.options.resolveParamsIn;
		if (resolveParamsIn.indexOf('url') < 0 && resolveParamsIn.indexOf('query')) {
			return;
		}

		// resolve path parameters
		var pathnameOriginal = (urlObj.pathname) ? urlObj.pathname : '';
		var pathnameResolved = pathnameOriginal;
		if (opts.options.resolveParamsIn.indexOf('url') > -1) {
			pathnameResolved = resolveParams(pathnameOriginal, opts.params);
		}
		pathnameResolved = (pathnameResolved) ? pathnameResolved : pathnameOriginal;
		pathnameResolved = opts.options.prefix + pathnameResolved;

		// resolve query parameters
		var searchOriginal = (urlObj.search) ? urlObj.search : '';
		var searchResolved = searchOriginal;

		if (opts.options.resolveParamsIn.indexOf('query') > -1) {
			var query = urlObj.query;
			if (query && Object.keys(query).length) {
				for (var param in query) {
					// resolve key
					var queryResolved = resolveParams(param, opts.params);
					if (queryResolved) {
						query[param] = queryResolved;
					}
					// resolve values
					queryResolved = resolveParams(query[param], opts.params);
					if (queryResolved) {
						query[param] = queryResolved;
					}
				}
				searchResolved = '?' + qs.stringify(query);
			}
		}

		// update urlObj path and query parameters
		var pathResolved = pathnameResolved + searchResolved;
		var pathOriginal = pathnameOriginal + searchOriginal;
		urlObj.pathname = pathnameResolved;
		urlObj.search = searchResolved;
		urlObj.path = pathResolved;
		urlObj.href = urlObj.href.replace(pathOriginal, pathResolved);


	}

	/**
	 * Resolves the parameters in the str with the values in the params object hash.
	 * @param  {String} str    String containing parameters starting with : if mandatory or *.
	 * @param  {Object} params
	 * @return {String or null}        Returns the replaced string or null if there was nothing to replace.
	 */

	function resolveParams(str, params) {
		// begins with * or : and ends where the word ends
		var result = str;
		if (!params || !str || !str.length) return null;
		var variables = str.match(PARAMS_PATTERN);
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