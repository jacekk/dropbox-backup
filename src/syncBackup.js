const Dropbox = require('dropbox')
const { trimStart, trimEnd } = require('lodash')

const {
    createRemoteDir,
    enqueueFilesRemoval,
    enqueueFilesUpload,
    listFilesInRemoteDir,
} = require('./dropboxHelpers')
const {
    extendLocalPathsWithHashes,
} = require('./contentHashing')

const slashEnd = str => trimEnd(str, '/') + '/'
const slashStart = str => '/' + trimStart(str, '/')

const filterFilesToUpload = (hashedLocals, remotesMeta, remoteDir) => {
    const remoteDirWithSlash = slashEnd(remoteDir)
    const hashedRemotes = remotesMeta.map(item => ({
        path: slashStart(item.path_lower.replace(remoteDirWithSlash, '')),
        hash: item.content_hash,
    }))

    return hashedLocals.filter(
        item => {
            const remoteItemFound = hashedRemotes.find(
                remoteItem => remoteItem.path === item.path
            )
            if (!remoteItemFound) {
                return true
            }
            return remoteItemFound.hash !== item.hash
        }
    )
}

const filterFilesToRemove = (locals, remotesMeta, remoteDir) => {
    const remoteDirWithSlash = slashEnd(remoteDir)
    return remotesMeta.filter(
        item => {
            const nameWithoutDir = slashStart(item.path_lower.replace(remoteDirWithSlash, ''))
            return !locals.includes(nameWithoutDir)
        }
    )
}

const uploadNewFiles = (logger, locals, dbx, config) => {
    const { srcDirectory, destinationPath } = config
    const numOfFiles = locals.length
    const localsPathsOnly = locals.map(item => item.path)
    const queue = enqueueFilesUpload(logger, localsPathsOnly, srcDirectory, destinationPath, dbx)

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
    const { destinationPath, srcDirectory, token } = config
    const dbx = new Dropbox({ accessToken: token })

    await createRemoteDir(logger, dbx, destinationPath)

    const hashedLocals = extendLocalPathsWithHashes(localPaths, srcDirectory)
    const remoteFiles = await listFilesInRemoteDir(logger, dbx, destinationPath)

    const toUpload = filterFilesToUpload(hashedLocals, remoteFiles, destinationPath)
    const toRemove = filterFilesToRemove(localPaths, remoteFiles, destinationPath)

    uploadNewFiles(logger, toUpload, dbx, config)
    removeRemoteFiles(logger, toRemove, dbx)
}

module.exports = syncBackup
