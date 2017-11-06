const path = require('path')
const fs = require('fs')
const createQueue = require('queue')
const Dropbox = require('dropbox')
const moment = require('moment')

const { createRemoteDir } = require('./dropboxHelpers')

const UNIQUE_DIRECTORY_FORMAT = 'YYYYMMDD-HHmmss'
const QUEUE_OPTS = {
    concurrency: 2,
    timeout: 5 * 60e3, // 5 minutes
}

const enqueueFiles = (logger, filesPaths, srcDirectory, remoteDir, dbx) => {
    const queue = createQueue(QUEUE_OPTS)

    filesPaths.forEach((filePath) => {
        queue.push(async () => {
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

    return queue
}

const incrementalBackup = async (logger, config, filesPaths) => {
    const { destinationPath, srcDirectory, token } = config
    const dbx = new Dropbox({ accessToken: token })
    const remoteDir = path.join(destinationPath, moment().format(UNIQUE_DIRECTORY_FORMAT))
    const newDir = await createRemoteDir(logger, dbx, remoteDir)

    if (!newDir) {
        return
    }

    const queue = enqueueFiles(logger, filesPaths, srcDirectory, remoteDir, dbx)
    const numOfFiles = filesPaths.length

    logger.debug(`Uploading ${numOfFiles} files...`)
    queue.start((err) => {
        if (err) { // does NOT work as expected :/
            return logger.error(String(err))
        }
        logger.info(`Finished uploading ${numOfFiles} files.`)
    })
}

module.exports = incrementalBackup
