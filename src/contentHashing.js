const path = require('path')
const fs = require('fs')

const dropboxContentHasher = require('./dropboxContentHasher')

const extendLocalPathsWithHashes = (paths, srcDirectory) =>
    paths.map((localPath) => {
        const hasher = dropboxContentHasher.create()
        const fullPath = path.join(srcDirectory, localPath)
        const fileContent = fs.readFileSync(fullPath)

        hasher.update(fileContent)

        return {
            path: localPath,
            hash: hasher.digest('hex'),
        }
    })

module.exports = {
    extendLocalPathsWithHashes,
}
