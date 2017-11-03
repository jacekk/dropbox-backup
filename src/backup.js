const path = require('path')
const queue = require('queue')
const fs = require('fs')
const Dropbox = require('dropbox')
const moment = require('moment')

const  { isConfigValid, getConfigsDir } = require('./utils')

const UNIQUE_DIRECTORY_FORMAT = 'YYYYMMDD-HHmmss'
const QUEUE_OPTS = {
    concurrency: 2,
    timeout: 5 * 60e3, // 5 minutes
}

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

const createRemoteDir = async (logger, dbx, path) => {
    try {
        const newDir = await dbx.filesCreateFolder({ path })

        logger.info(`Directory created succesfully: ${path}`)
        logger.debug(newDir)

        return newDir
    } catch (ex) {
        logger.error(String(ex))
    }
}

const listFilesToUpload = (logger, srcDirectory) => {
    try {
        const files = fs.readdirSync(srcDirectory) // check nested directories
        logger.debug(files)

        return files
    } catch (ex) {
        logger.error(ex.message)
    }
}

const enqueueFiles = (logger, filesPaths, srcDirectory, remoteDir, dbx) => {
    const q = queue(QUEUE_OPTS)

    filesPaths.forEach((filePath) => {
        q.push(async () => {
            const srcPath = path.join(srcDirectory, filePath)
            const destPath = path.join(remoteDir, filePath)
            try {
                const uploadConfig = {
                    contents: fs.readFileSync(srcPath),
                    path: destPath,
                }
                const result = await dbx.filesUpload(uploadConfig)
                logger.debug(result)
                return result
            } catch (ex) {
                logger.error(String(ex))
                return ex // ReferenceError (or sth similar) blocks the queue; improve
            }
        })
    })

    return q
}

const backup = async (configName, logger, options) => {
    const config = readConfig(configName, logger)
    const { srcDirectory, destinationPath, token } = config
    const dbx = new Dropbox({ accessToken: token })
    const remoteDir = path.join(destinationPath, moment().format(UNIQUE_DIRECTORY_FORMAT))
    const filesPaths = listFilesToUpload(logger, srcDirectory)
    const numOfFiles = filesPaths.length

    if (!numOfFiles) {
        return logger.debug('No files to backup.')
    }

    switch (options.strategy) {
    case 'incremental':
        const newDir = await createRemoteDir(logger, dbx, remoteDir)
        if (!newDir) {
            return
        }

        const q = enqueueFiles(logger, filesPaths, srcDirectory, remoteDir, dbx)

        logger.debug(`Uploading ${numOfFiles} files...`)
        q.start((err) => {
            if (err) { // does NOT work as expected :/
                return logger.error(String(err))
            }
            logger.info(`Finished uploading ${numOfFiles} files.`)
        })
        break;
    case 'sync':
        logger.info('@todo sync strategy')
        break;
    }
}

module.exports = backup
