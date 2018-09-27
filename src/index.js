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

  if (uri.pathname.startsWith('/shoot/')) {
    let userUrl = decodeURI(uri.pathname.substring(7))
    let userUri = uri.parse(userUrl, true)
    checkAndShoot(res, userUri)
  } else if (uri.pathname.endsWith('.ico') || uri.pathname.endsWith('.gif') || uri.pathname.endsWith('.jpg') || uri.pathname.endsWith('.png')) {
    let filepath = './public' + uri.pathname;
    console.log("Envoi fichier " + filepath)
    if (fs.existsSync(filepath) === true){
      
      var img = fs.readFileSync(filepath);

      if (uri.pathname.endsWith('.ico')) res.writeHead(200, {'Content-Type': 'image/ico' });
      if (uri.pathname.endsWith('.gif')) res.writeHead(200, {'Content-Type': 'image/gif' });
      if (uri.pathname.endsWith('.jpg')) res.writeHead(200, {'Content-Type': 'image/jpg' });
      if (uri.pathname.endsWith('.png')) res.writeHead(200, {'Content-Type': 'image/png' });

      res.end(img, 'binary');
    } else {
      console.log("404. Demande fichier inexistant : " + filepath)
      return helper.fatalError(res, 404, 'Invalid request. Path is invalid.')
    }
  } else {
    fs.readFile('public/index.html', 'utf8', function(err, text) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/html');
      res.end(text);
    });
  }
})
server.listen(3033)

let checkAndShoot = (res, shootUri) => {
  let hostname = shootUri.hostname
  console.log('shoot ' + shootUri.href)

  request(shootUri.href, (error, response, body) => {
    if (error) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Error : ' + error);
    } else {
      let data = shoot.shoot(shootUri, 1920, 1080);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      data.url = data.path.substring(6) // enleve 'public'
      res.end(JSON.stringify(data));
    }
  });
}