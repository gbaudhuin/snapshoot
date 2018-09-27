const os = require('os')
const fs = require('fs')

const configRaw = fs.readFileSync('./config.json')
let config = JSON.parse(configRaw)

const hostname = os.hostname()
if (/[0-9a-z]+\.ip[-0-9]+\.net/.test(hostname)) { // prod : ns519635.ip-158-69-55.net
  config.prod.env = 'prod'
  module.exports = config.prod
} else {
  config.prod.env = 'dev'
  module.exports = config.dev
}