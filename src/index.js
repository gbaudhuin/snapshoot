const http = require('http');
const config = require('./config');
const helper = require('./helper');
const shoot = require('./shoot');
const url = require('url')
const request = require('request')
const fs = require('fs-extra')

let server = http.createServer((req, res) => {
  let ip = helper.getIp(req)

  if (!helper.isIpAllowed(ip)) {
    return helper.fatalError(res, 403, 'Access forbidden')
  }

  // filtre l'url : pas de {}()"'`
  if (req.url.match(`[{}()"'\`]+`)) {
    return helper.fatalError(res, 404, 'Invalid request. Special characters not allowed.')
  }

  let uri = url.parse(req.url, true)
  let pathNameLower = uri.pathname.toLowerCase();
  if (uri.pathname.startsWith('/shoot/')) {
    let userUrl = decodeURIComponent(uri.pathname.substring(7))
    let userUri = uri.parse(userUrl, true)
    checkAndShoot(res, userUri)
  } else if (uri.pathname == '/') {
    fs.readFile('public/index.html', 'utf8', function(err, text) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/html');
      res.end(text);
    });
  } else { // fichiers
    let allowedExtensions = ['ico', 'gif', 'jpg', 'png'];
    let isAllowed = false;
    let extension = null;
    for (let ext of allowedExtensions) {
      if (pathNameLower.endsWith('.' + ext)) {
        extension = ext;
        isAllowed = true;
        break;
      }
    }

    if (!!isAllowed) {
      let filepath = './public' + uri.pathname; // les fichiers sont dans public
      if (fs.existsSync(filepath) === true) {
        var img = fs.readFileSync(filepath);
        res.writeHead(200, {'Content-Type': 'image/' + extension });
        res.end(img, 'binary');
      } else {
        console.log("404. Demande fichier inexistant : " + uri.pathname)
        return helper.fatalError(res, 404, 'Invalid request. Path is invalid.')
      }
    } else {
      console.log("404. Demande fichier inexistant : " + uri.pathname)
      return helper.fatalError(res, 404, 'Invalid request. Path is invalid.')
    }
  }
})
server.listen(3033)

let checkAndShoot = (res, shootUri) => {
  let href = decodeURI(shootUri.href)
  console.log('shoot ' + href)

  request({uri: href, jar: true}, (error, response, body) => {
    if (error) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Error : ' + error);
    } else {
      let data = shoot.shoot(shootUri, 1920, 1080);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      let ret = {
        status : data.status,
        data : data.date,
        url : "/" + data.shortpath
      }
      res.end(JSON.stringify(ret));
    }
  });
}