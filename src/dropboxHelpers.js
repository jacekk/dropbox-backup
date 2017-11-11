const path = require('path')
const fs = require('fs')
const createQueue = require('queue')

const { DIR_SEPARATOR } = require('./constants')

const QUEUE_OPTS = {
    concurrency: 2,
    timeout: 5 * 60e3, // 5 minutes
}

// @todo rewrite to a class with injectable logger, token and config

const filterFilesOnly = item => item['.tag'] === 'file'
const filterFoldersOnly = item => item['.tag'] === 'folder'

const listFilesInRemoteDir = async (logger, dbx, dirPath) => {
    let list = []

    try {
        const response = await dbx.filesListFolder({
            path: dirPath,
            recursive: true,
        })
        const filesOnly = response.entries
            .filter(filterFilesOnly)

        // http://dropbox.github.io/dropbox-sdk-js/global.html#FilesListFolderResult
        // @todo implement response.has_more === true

        logger.debug(response)
        list.push(...filesOnly)
        logger.info(`Listed files succesfully. Found: ${list.length}`)
    } catch (ex) {
        logger.error(JSON.stringify(ex.error))
    }

    return list
}

const listFoldersInRemoteDir = async (logger, dbx, dirPath) => {
    let list = []

    try {
        const response = await dbx.filesListFolder({
            path: dirPath,
            recursive: true,
        })

        const foldersOnly = response.entries
            .filter(filterFoldersOnly)
            .filter(item => item.path_lower !== dirPath)

        // http://dropbox.github.io/dropbox-sdk-js/global.html#FilesListFolderResult
        // @todo implement response.has_more === true

        logger.debug(response)
        list.push(...foldersOnly)
        logger.info(`Listed folders succesfully. Found: ${list.length}`)
    } catch (ex) {
        logger.error(JSON.stringify(ex.error))
    }

    return list
}

const isRemoteDirEmpty = async (logger, dbx, meta) => {
    let response
    try {
        response = await dbx.filesListFolder({
            path: meta.path_lower,
        })
        logger.debug(response)
    } catch (ex) {
        logger.debug(JSON.stringify(ex.error))
        return false
    }

    if (
        !response ||
        !response.entries ||
        !Array.isArray(response.entries)
    ) {
        return true
    }

    return response.entries.length === 0
}

const removeByFolderMeta = async (logger, dbx, meta) => {
    try {
        const result = await dbx.filesDeleteV2({ path: meta.path_lower })
        logger.debug(result)
    } catch (ex) {
        logger.error(JSON.stringify(ex.error))
    }
}

const enqueueFilesUpload = (logger, filesPaths, srcDirectory, remoteDir, dbx) => {
    const queue = createQueue(QUEUE_OPTS)

    filesPaths.forEach((filePath) => {
        queue.push(async () => {
            const srcPath = path.join(srcDirectory, filePath)
            const destPath = path.join(remoteDir, filePath)
            try {
                const uploadConfig = {
                    contents: fs.readFileSync(srcPath),
                    mode: 'overwrite',
                    path: destPath,
                }
                const result = await dbx.filesUpload(uploadConfig)
                logger.debug(result)
                return result
            } catch (ex) {
                logger.error(JSON.stringify(ex.error))
            }
        })
    })

    return queue
}

const enqueueFilesRemoval = (logger, filesMeta, dbx) => {
    const queue = createQueue(QUEUE_OPTS)

    filesMeta.forEach((fileMeta) => {
        queue.push(async () => {
            try {
                const result = await dbx.filesDeleteV2({ path: fileMeta.path_lower })
                logger.debug(result)
                return result
            } catch (ex) {
                logger.error(JSON.stringify(ex.error))
            }
        })
    })

    return queue
}

const checkIfPathExists = async (logger, dbx, remotePath) => {
    if (remotePath === DIR_SEPARATOR) {
        return true
    }
    try {
        const meta = await dbx.filesGetMetadata({ path: remotePath })
        logger.debug(meta)
        return true
    } catch (ex) {
        logger.debug(JSON.stringify(ex.error))
        return false
    }
}

const createRemoteDir = async (logger, dbx, remotePath) => {
    const pathMeta = await checkIfPathExists(logger, dbx, remotePath)

    if (pathMeta) {
        logger.info(`Directory exists: ${remotePath}`)
        return pathMeta
    }

    try {
        const newDir = await dbx.filesCreateFolder({ path: remotePath })

        logger.info(`Directory created succesfully: ${remotePath}`)
        logger.debug(newDir)

        return newDir
    } catch (ex) {
        logger.error(JSON.stringify(ex.error))
    }
}

module.exports = {
    createRemoteDir,
    enqueueFilesRemoval,
    enqueueFilesUpload,
    isRemoteDirEmpty,
    listFilesInRemoteDir,
    listFoldersInRemoteDir,
    removeByFolderMeta,
}
