const path = require('path')
const fs = require('fs')
const { endsWith } = require('lodash')

const  { isJsonFileValid, getConfigsDir } = require('./utils')

const configs = (logger) => {
    let files

    try {
        files = fs.readdirSync(getConfigsDir())
    } catch (ex) {
        return logger.error(ex.message)
    }

    const filtered = files
        .filter(item => endsWith(item, '.json'))
        .filter(item => !endsWith(item, '.dist'))
        .filter(item => isJsonFileValid(item, logger))

    const mapped = filtered
        .map(item => path.basename(item, '.json'))

    if (!mapped.length) {
        logger.warn('No valid configs !!')
    } else {
        logger.info(mapped)
    }
}

module.exports = configs
