var querystring= require('querystring'),
REQUEST= require('request');

exports.OAuth2= function(clientId, clientSecret, baseSite, authorizePath, accessTokenPath) {
  this._clientId= clientId;
  this._clientSecret= clientSecret;
  this._baseSite= baseSite;
  this._authorizeUrl= authorizePath || "/oauth/authorize";
  this._accessTokenUrl= accessTokenPath || "/oauth/access_token";
  this._accessTokenName= "access_token";
  this._request = REQUEST.defaults({ proxy: process.env.http_proxy || process.env.https_proxy || null });
}

// This 'hack' method is required for sites that don't use
// 'access_token' as the name of the access token (for requests).
// ( http://tools.ietf.org/html/draft-ietf-oauth-v2-16#section-7 )
// it isn't clear what the correct value should be atm, so allowing
// for specific (temporary?) override for now.
exports.OAuth2.prototype.setAccessTokenName= function ( name ) {
  this._accessTokenName= name;
}

exports.OAuth2.prototype._getAccessTokenUrl= function() {
  return this._baseSite + this._accessTokenUrl;
}

exports.OAuth2.prototype.getAuthorizeUrl= function( params ) {
  var params= params || {};
  params['client_id'] = this._clientId;
  params['type'] = 'web_server';
  return this._baseSite + this._authorizeUrl + "?" + querystring.stringify(params);
}

exports.OAuth2.prototype.getOAuthAccessToken= function(code, params, callback) {
  var params= params || {};
  params['client_id'] = this._clientId;
  params['client_secret'] = this._clientSecret;
  params['type']= 'web_server';
  var codeParam = (params.grant_type === 'refresh_token') ? 'refresh_token' : 'code';
  params[codeParam]= code;

    var reqOptions = {
	uri: this._getAccessTokenUrl(),
	form: params
    };
    this._request.post(reqOptions, function(err, res, body) {
	var results;
	if(err) {
	    callback(err);
	} else {
	    try {
		// As of http://tools.ietf.org/html/draft-ietf-oauth-v2-07
		// responses should be in JSON
		results= JSON.parse( body );
	    }
	    catch(e) {
		// .... However both Facebook + Github currently use rev05 of the spec
		// and neither seem to specify a content-type correctly in their response headers :(
		// clients of these services will suffer a *minor* performance cost of the exception
		// being thrown
		results= querystring.parse( body );
	    }
	    callback(null, results.access_token, results.refresh_token, results);
	}
    });
}

exports.OAuth2.prototype.get= function(url, access_token, callback) {
    var params = {};
    params[this._accessTokenName] = access_token;
    var options = {uri:url, qs: params};
    this._request.get(options, function(err, res, body) {
	callback(err, body, res);
    });
}

// deprecated
exports.OAuth2.prototype.getProtectedResource = exports.OAuth2.prototype.get;
