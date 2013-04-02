rip
===

Helper lib to create light RESTful clients with node.js that keeps the original API in place.

... Work in progress ...

[![Build Status](https://travis-ci.org/intesso/rip.png)](https://travis-ci.org/intesso/rip)

/*

API Development:

// url segments that start with a colon (:) get replaced with the matching params property 
// * at the end of the property or an url segment means: optional property
// params, querystring and data properties can be object literals or string in the form of querystring: http://nodejs.org/api/querystring.html

// rip.define is a API definition function
rip.define({
	// options
	options : {}
	headers : {}

	// function names
	method: "GET",
	alias: "" || ['getIndex', 'index'],
	url: "/:index/*type?pretty=true&query=true",
	
	// key:values
	params: "" || {}
	querystring: "" || {},
	data: "" || {},
	
	// description
	docOriginal: "www.orig.com",
	docApi: "www.rip.org",
})

// rip.call can be used to make an ad hoc RESTful call to an endpoint that wasn't defined with the define function.
rip.call("same as define, but without alias, ")

// same as RIP(options), but allow the options to change at a later point in time.

rip.setOptions()

self.host = options.host || 'localhost';
self.port = options.port || 80;
self.prefix = options.prefix || '';
self.secure = options.secure || false;
self.method = options.method || 'GET';
self.auth = options.auth || false;

headers // htttp header fields like Content-Type, Accept-Charset ect. 
options // options like host, port, secure ect.

url // url with parameter placeholders
querystring // stuff after the ? in the url
data // the POST, PUT data

params // parameters that will be used to replace the parameter placeholders inside the url, querystring or data object.



// params can be set in the function call or can be set as default in the rip.params property.
// If a function call is missing a specific params, it will be looked up in the params property (default value).

rip.params.ip = "192.168.1.19";
rip.clearparams()


rip.header

rip.options


+ 1..n
? 0..1
* 0..n

How it works:

every rip.function call adds REST functions that can be called directly.
It adds a function for the url and the aliases.

 */