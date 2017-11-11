const path = require('path')
const fs = require('fs')
const ls = require('list-directory-contents')
const { endsWith } = require('lodash')

const { DIR_SEPARATOR } = require('./constants')
const incrementalBackup = require('./incrementalBackup')
const syncBackup = require('./syncBackup')
const { isConfigValid, getConfigsDir } = require('./utils')

const readConfig = (configName, logger) => {
    const fullPath = path.resolve(getConfigsDir(), configName)
    const config = require(fullPath)

    logger.debug(`Loaded: ${fullPath}`)

    if (!isConfigValid(config)) {
        return logger.error(`Config file not valid: ${fullPath} !!`)
    }

    const { srcDirectory } = config

    if (!fs.existsSync(srcDirectory)) {
        return logger.error(`Src directory does not exist: ${srcDirectory} !!`)
    }

    return config
}

const listFilesToUpload = (logger, srcDirectory) =>
    new Promise((resolve, reject) => {
        ls(srcDirectory, (err, tree) => {
            if (err) {
                logger.error(String(err))
                reject(err)
                return
            }

            const relativePaths = tree.map(item => item.replace(srcDirectory, ''))
            const filesOnly = relativePaths.filter(item => !endsWith(item, DIR_SEPARATOR))

            logger.debug(relativePaths)
            resolve(filesOnly)
        })
    })

const backup = async (configName, logger) => {
    const config = readConfig(configName, logger)

    if (!config) {
        return
    }

    const { srcDirectory } = config
    const filesPaths = await listFilesToUpload(logger, srcDirectory)

    switch (config.strategy) {
    case 'sync':
        syncBackup(logger, config, filesPaths)
        break
    default:
        incrementalBackup(logger, config, filesPaths)
    }
}

module.exports = backup
