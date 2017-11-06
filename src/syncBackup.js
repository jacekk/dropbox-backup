const Dropbox = require('dropbox')
const { trimEnd } = require('lodash')

const {
    createRemoteDir,
    enqueueFilesRemoval,
    enqueueFilesUpload,
    listFilesInRemoteDir,
} = require('./dropboxHelpers')

const slashEnd = str => trimEnd(str, '/') + '/'

const filterFilesToUpload = (local, remote, remoteDir) => {
    const remoteDirWithSlash = slashEnd(remoteDir)
    const remoteOnlyNames = remote.map(item => item.path_lower.replace(remoteDirWithSlash, ''))
    return local.filter(
        item => !remoteOnlyNames.includes(item)
    )
}

const filterFilesToRemove = (local, remote, remoteDir) => {
    const remoteDirWithSlash = slashEnd(remoteDir)
    return remote.filter(
        item => {
            const nameWithoutDir = item.path_lower.replace(remoteDirWithSlash, '')
            return !local.includes(nameWithoutDir)
        }
    )
}

const uploadNewFiles = (logger, filesPaths, dbx, config) => {
    const { srcDirectory, destinationPath } = config
    const numOfFiles = filesPaths.length
    const queue = enqueueFilesUpload(logger, filesPaths, srcDirectory, destinationPath, dbx)

    logger.debug(`Uploading ${numOfFiles} files...`)
    queue.start((err) => {
        if (err) { // @todo does NOT work as expected :/
            return logger.error(String(err))
        }
        logger.info(`Finished uploading ${numOfFiles} new file(s).`)
    })
}

const removeRemoteFiles = (logger, filesMeta, dbx) => {
    const numOfFiles = filesMeta.length
    const queue = enqueueFilesRemoval(logger, filesMeta, dbx)

    logger.debug(`Removing ${numOfFiles} files...`)
    queue.start((err) => {
        if (err) { // @todo does NOT work as expected :/
            return logger.error(String(err))
        }
        logger.info(`Finished removing ${numOfFiles} obsolete file(s).`)
    })
}

const syncBackup = async (logger, config, localPaths) => {
    const { destinationPath, token } = config
    const dbx = new Dropbox({ accessToken: token })

    await createRemoteDir(logger, dbx, destinationPath)

    const remoteFiles = await listFilesInRemoteDir(logger, dbx, destinationPath)
    const toUpload = filterFilesToUpload(localPaths, remoteFiles, destinationPath)
    const toRemove = filterFilesToRemove(localPaths, remoteFiles, destinationPath)

    uploadNewFiles(logger, toUpload, dbx, config)
    removeRemoteFiles(logger, toRemove, dbx)
}

module.exports = syncBackup
