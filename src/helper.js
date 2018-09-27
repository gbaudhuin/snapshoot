const url = require('url')
const querystring = require('querystring')
const config = require('./config')

module.exports.fatalError = function (response, httpCode, errorMessage) {
  response.writeHead(httpCode, {'Content-Type': 'application/json'})
  let ret = {success: false, error: errorMessage}
  response.end(JSON.stringify(ret))
  return
}

module.exports.getIp = function (req) {
  let ip =  req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress

  if (req.headers['x-forwarded-for']) { // if the server is behind a proxy
    ip = req.headers['x-forwarded-for'].split(',').pop()
  }

  return ip.split(':').pop()
}

module.exports.isIpAllowed = function (ip) {
  for (let allowedIp of config.whitelist) {
    if (allowedIp === ip) {
      return true
    }
  }
  return false
}

/**
 * Retourne le domaine canonique, avec le protocol et évenutellement le port s'il est spécial
 * @param {string} rawUrl url brute
 * @returns {string} url filtree
 */
module.exports.getCanonicalDomain = function (rawUrl) {
  let ret = null
  rawUrl = querystring.unescape(rawUrl) // urldecode
  if (!(rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))) {
    if (rawUrl.indexOf('://') !== -1) { // syntax error
      return null
    }

    // https est le protocole par défaut à moins que le port 80 ou 8080 ne soit mentionné
    if (rawUrl.indexOf(':80') !== -1 || rawUrl.indexOf(':8080') !== -1) {
      rawUrl = 'http://' + rawUrl
    } else {
      rawUrl = 'https://' + rawUrl
    }
  }
  let uri = url.parse(rawUrl, false)

  if (!uri || !uri.hostname) {
    return null
  }

  let port = ''
  let origin = uri.protocol + '//'
  if (uri.protocol === 'https:') {
    origin = 'https://'
    if (uri.port && uri.port !== '443') {
      port = ':' + uri.port
    }
  } else {
    origin = 'http://'
    if (uri.port && uri.port !== '80') {
      port = ':' + uri.port
    }
  }
  let hostname = uri.hostname

  ret = origin + hostname + port

  // enleve le slash de fin (pas forcement la norme, mais plus pratique/userfriendly pour whatsbehind)
  if (ret.endsWith('/')) {
    ret = ret.substr(0, ret.length - 1)
  }
  return ret
}