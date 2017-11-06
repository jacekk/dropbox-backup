const path = require('path')
const Dropbox = require('dropbox')
const moment = require('moment')

const { enqueueFilesUpload, createRemoteDir } = require('./dropboxHelpers')

const UNIQUE_DIRECTORY_FORMAT = 'YYYYMMDD-HHmmss'

const incrementalBackup = async (logger, config, filesPaths) => {
    const { destinationPath, srcDirectory, token } = config
    const dbx = new Dropbox({ accessToken: token })
    const remoteDir = path.join(destinationPath, moment().format(UNIQUE_DIRECTORY_FORMAT))
    const createdDir = await createRemoteDir(logger, dbx, remoteDir)

    if (!createdDir) {
        logger.error(`Created dir does not exist: ${remoteDir}`)
        return
    }

    const queue = enqueueFilesUpload(logger, filesPaths, srcDirectory, remoteDir, dbx)
    const numOfFiles = filesPaths.length

    logger.debug(`Uploading ${numOfFiles} files...`)
    queue.start((err) => {
        if (err) { // @todo does NOT work as expected :/
            return logger.error(String(err))
        }
        logger.info(`Finished uploading ${numOfFiles} new file(s).`)
    })
}

module.exports = incrementalBackup
