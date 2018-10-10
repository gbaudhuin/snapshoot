const path = require('path')
const mkdirp = require('mkdirp')
const fs = require('fs-extra')
const emptyDir = require('empty-dir')
const puppeteer = require('puppeteer')
const md5 = require('md5')
const config = require('./config');

module.exports.imgFolder = 'public/img'

let getFilename = (url, width, height) => {
  let hash = md5(url)
  let filename = hash + '-' + width + 'x' + height + '.jpg'
  return filename
}

module.exports.getFilename = getFilename

let getDir = (snapshotFilename) => {
  const screenshotPath = snapshotFilename.substring(0, 2) + '/' + snapshotFilename.substring(2, 4)
  return screenshotPath
}

module.exports.getDir = getDir

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let browser = null
let browserLastPageDate = Date()
let list = []

module.exports.shoot = function (url, width, height) {
  if (width === undefined) width = 1920
  if (height === undefined) height = 1080
  const screenshotName = getFilename(url.href, width, height)
  const screenshotPath = config.imgdir + '/' + getDir(screenshotName) + '/' + screenshotName
  const screenshotShortPath = getDir(screenshotName) + '/' + screenshotName

  if (fs.existsSync(screenshotPath)) {
    let stat = fs.statSync(screenshotPath)
    return {path : screenshotPath, shortpath : screenshotShortPath, status : 'complete', date : stat.mtime}
  } else {
    for (let elt in list)
    {
      if (elt.url === url) return {path : screenshotPath, shortpath : screenshotShortPath, status : 'pending', date : null}
    }
  }
  list.push({url : url.href, screenshotPath})
  if (list.length === 1) {
    a()
  }
  return {path : screenshotPath, shortpath : screenshotShortPath, status : 'pending', date : null}
}

let a = async () => {
  if (list.length === 0) {
    return
  }

  let {url, screenshotPath} = list[0]
  const filepath = path.resolve(screenshotPath);
  let fulldir = path.dirname(filepath)

  mkdirp.sync(fulldir)
  if (process.platform === 'linux') {
    fs.chownSync(fulldir, 1001, 1001);// www.www
    fs.chmodSync(fulldir, '775');
  } 

  try {
    if (!browser) {
      browser = await puppeteer.launch() // lance un vrai process chromium, puis s'y connecte
    }
    browserLastPageDate = Date()
    const pageDesktop = await browser.newPage();
    await pageDesktop.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36')
    await pageDesktop.setViewport({width: 1280, height: 1024, isMobile: false, hasTouch: false})
    await pageDesktop.goto(url, {waitUntil: 'domcontentloaded', timeout: 300000})
    await timeout(250) // donne le temps à la page et à ses images de se charger

    await pageDesktop.screenshot({path: filepath})
    await pageDesktop.close()
    browserLastPageDate = Date() // date de dernière utilisation du browser. On veut laisser le browser en vie pour qq minutes pour minimiser le nb kill/launch et accelerer les snapshots consécutifs

    list.shift()
    if (list.length > 0) {
      a()
    }

    // lance un timer qui vérifie s'il ne faut pas killer le browser pour faire un peu de ménage
    setTimeout(() => {
      var d = new Date()
      var ms = d - browserLastPageDate
      if (browser && ms > 5 * 60 * 1000) { // il faut que le browser n'ai pas été utilisé depuis plus de 5 minutes (durée "A")
        browser.close()
        browser = null
      }
    }, 10 * 60 * 1000) // la valeur du timer doit être supérieure à la durée "A"
  } catch (e) {
    console.log('Screenshot error for ' + url, e)
    browser = null
    list.shift()
    if (list.length > 0) {
      a()
    }
  }
}