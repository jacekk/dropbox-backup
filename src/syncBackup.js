const Dropbox = require('dropbox')
const { trimEnd } = require('lodash')

const { listFilesInRemoteDir } = require('./dropboxHelpers')

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

const uploadNewFiles = (toUpload, logger) => {
    logger.info(toUpload)
    logger.info('@todo upload above files')
}

const removeRemoteFiles = (toRemove, logger, remoteDir) => {
    logger.info(toRemove.map(
        item => item.path_lower.replace(
            slashEnd(remoteDir), ''
        )
    ))
    logger.info('@todo remove above files from remote')
}

const syncBackup = async (logger, config, localPaths) => {
    const { destinationPath, /*srcDirectory,*/ token } = config
    const dbx = new Dropbox({ accessToken: token })
    // @todo make sure remote dir exists
    const remoteFiles = await listFilesInRemoteDir(logger, dbx, destinationPath)
    const toUpload = filterFilesToUpload(localPaths, remoteFiles, destinationPath)
    const toRemove = filterFilesToRemove(localPaths, remoteFiles, destinationPath)

    uploadNewFiles(toUpload, logger)
    removeRemoteFiles(toRemove, logger, destinationPath)
}

module.exports = syncBackup
