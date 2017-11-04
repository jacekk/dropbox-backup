const path = require('path')
const fs = require('fs')
const { isEqual } = require('lodash')

const CONFIG_KEYS = [
    'destinationPath',
    'srcDirectory',
    'strategy',
    'token',
]

const getConfigsDir = () => path.resolve(__dirname, '..', 'configs')

const isConfigValid = config =>
    isEqual(Object.keys(config).sort(), CONFIG_KEYS.sort())

const isJsonFileValid = (filePath, logger) => {
    const fullPath = path.resolve(getConfigsDir(), filePath)
    let parsed

    try {
        parsed = JSON.parse(fs.readFileSync(fullPath))
    } catch (ex) {
        logger.debug(`${filePath} --> ${ex.message}`)
        return false
    }

    if (!isConfigValid(parsed)) {
        logger.debug(`Not a valid JSON file: ${filePath}`)
        return false
    }

    logger.debug(`${filePath} --> ${parsed.srcDirectory} --> ${parsed.destinationPath || '[root]'}`)

    return true
}

module.exports = {
    getConfigsDir,
    isConfigValid,
    isJsonFileValid,
}
