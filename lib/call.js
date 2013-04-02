var http = require('http'),
    https = require('https'),
    util = require('util');


module.exports = Call;

function Call(params, options, cb) {
    var self = this
    self.host = options.host || 'localhost';
    self.port = options.port || 80;
    self.secure = options.secure || false;
    self.defaultMethod = options.defaultMethod || 'GET';
    self.auth = options.auth || false;
    self.params = params || {};
    self.path = [options.pathPrefix || '', options.path || ''].join('');
    self.timeout = options.timeout || false;
}

util.inherits(Call, events.EventEmitter);

Call.prototype.call = function(cb) {
    var self = this
    var options = {
        path: this.path + this.params.path,
        method: this.params.method || this.defaultMethod,
        host: this.host,
        port: this.port
    }

    var client = (this.secure) ? https : http;
    var request = client.request(options);

    request.on('response', function(response) {
        var body = "";
        response.on('data', function(chunk) {
            body += chunk;
        });
        response.on('end', function() {
            if (cb) cb(null, body);
        });
        response.on('error', function(error) {
            if (cb) cb(error);
        })
    });

    if (self.timeout) {
        request.setTimeout(self.timeout, function() {
            if (cb) cb(new Error('timed out after ' + self.timeout + 'ms'));
        });
    }
    request.on('error', function(error) {
        if (cb) cb(error);
    })

    if (this.auth) {
        request.setHeader("Authorization", "Basic " + new Buffer(this.auth.username + ":" + this.auth.password).toString('base64'))
    }

    if (this.params.data) {
        if (typeof this.params.data != 'string') {
            this.params.data = JSON.stringify(this.params.data);
        }
        request.setHeader('Content-Type', 'application/json');
        request.setHeader('Content-Length', Buffer.byteLength(this.params.data, 'utf8'));
        request.end(this.params.data);
    } else {
        request.end('');
    }
}