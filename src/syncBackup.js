const Dropbox = require('dropbox')
const { trimStart, trimEnd } = require('lodash')
const sortPaths = require('sort-paths')

const {
    createRemoteDir,
    enqueueFilesRemoval,
    enqueueFilesUpload,
    isRemoteDirEmpty,
    listFilesInRemoteDir,
    listFoldersInRemoteDir,
    removeByFolderMeta,
} = require('./dropboxHelpers')
const {
    DIR_SEPARATOR,
} = require('./constants')
const {
    extendLocalPathsWithHashes,
} = require('./contentHashing')

const slashEnd = str => trimEnd(str, DIR_SEPARATOR) + DIR_SEPARATOR
const slashStart = str => DIR_SEPARATOR + trimStart(str, DIR_SEPARATOR)

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

const uploadNewFiles = (logger, locals, dbx, config) =>
    new Promise(resolve => {
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
            resolve()
        })
    })

const removeRemoteFiles = (logger, filesMeta, dbx) =>
    new Promise(resolve => {
        const numOfFiles = filesMeta.length
        const queue = enqueueFilesRemoval(logger, filesMeta, dbx)

        logger.debug(`Removing ${numOfFiles} files...`)
        queue.start((err) => {
            if (err) { // @todo does NOT work as expected :/
                return logger.error(String(err))
            }
            logger.info(`Finished removing ${numOfFiles} obsolete file(s).`)
            resolve()
        })
    })

const clearEmptyFolders = async (logger, dbx, config) => {
    logger.info(`Searching for empty folders ...`)

    const { destinationPath } = config
    const allFolders = await listFoldersInRemoteDir(logger, dbx, destinationPath)
    const allSorted = sortPaths(allFolders, item => item.path_lower, DIR_SEPARATOR).reverse()

    let emptyCounter = 0
    while (allSorted.length) {
        const last = allSorted.pop()
        const isEmpty = await isRemoteDirEmpty(logger, dbx, last)
        if (isEmpty) {
            await removeByFolderMeta(logger, dbx, last)
            emptyCounter += 1
        }
    }

    logger.info(`Removed ${emptyCounter} empty folders.`)
}

const syncBackup = async (logger, config, localPaths) => {
    const { destinationPath, srcDirectory, token } = config
    const dbx = new Dropbox({ accessToken: token })

    await createRemoteDir(logger, dbx, destinationPath)

    const hashedLocals = extendLocalPathsWithHashes(localPaths, srcDirectory)
    const remoteFiles = await listFilesInRemoteDir(logger, dbx, destinationPath)

    const toUpload = filterFilesToUpload(hashedLocals, remoteFiles, destinationPath)
    const toRemove = filterFilesToRemove(localPaths, remoteFiles, destinationPath)

    await uploadNewFiles(logger, toUpload, dbx, config)
    await removeRemoteFiles(logger, toRemove, dbx)
    await clearEmptyFolders(logger, dbx, config)
}

module.exports = syncBackup
