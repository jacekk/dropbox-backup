const path = require('path')
const fs = require('fs')
const { isEqual, endsWith } = require('lodash')

const CONFIGS_DIR = path.resolve(__dirname, '..', 'configs')
const CONFIG_KEYS = ['token', 'srcDirectory', 'destinationPath']

const configs = (logger) => {
    let files
    try {
        files = fs.readdirSync(CONFIGS_DIR)
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
        logger.warn('No valid configs!')
    } else {
        logger.info('Available configs:')
        mapped.forEach(item => {
            logger.info(` * ${item}`);
        })
    }
}

const isJsonFileValid = (filePath, logger) => {
    const fullPath = path.resolve(CONFIGS_DIR, filePath)
    let parsed

    try {
        parsed = JSON.parse(fs.readFileSync(fullPath))
    } catch (ex) {
        logger.debug(`${filePath} --> ${ex.message}`)
        return false
    }

    if (!isEqual(Object.keys(parsed), CONFIG_KEYS)) {
        logger.debug(`Not a valid JSON file: ${filePath}`)
        return false
    }

    logger.debug(`${filePath} --> ${parsed.srcDirectory} --> ${parsed.destinationPath || '[root]'}`)

    return true
}

module.exports = configs
