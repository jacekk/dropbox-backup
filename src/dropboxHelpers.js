const filterFilesOnly = item => item['.tag'] === 'file'

const listFilesInRemoteDir = async (logger, dbx, path) => {
    let response
    let list = []

    try {
        response = await dbx.filesListFolder({
            path,
            recursive: true,
        })

        const filesOnly = response.entries.filter(filterFilesOnly)

        // http://dropbox.github.io/dropbox-sdk-js/global.html#FilesListFolderResult
        // @todo implement response.has_more === true

        logger.debug(response)
        list.push(...filesOnly)
        logger.info(`Directory listed files succesfully. Found: ${list.length}`)
    } catch (ex) {
        logger.error(JSON.stringify(ex.error))
    }

    return list
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

module.exports = {
    createRemoteDir,
    listFilesInRemoteDir,
}
