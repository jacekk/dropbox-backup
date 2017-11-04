# dropbox-backup

### Description

Simple backup utility that uses Dropbox API as storage.

### Start

1. `git clone https://github.com/jacekk/dropbox-backup.git && cd dropbox-backup`
1. `yarn install`
1. `cp configs/sample.json.dist configs/my-scenario.json` and make all necessary changes.
1. `./run backup my-scenario`

Read [this](https://blogs.dropbox.com/developers/2014/05/generate-an-access-token-for-your-own-account/) to know how to generate access token for your Dropbox.

### Commands

* `./run configs` - lists available configs.
* `./run backup <config>` - performes backup process based on given file name inside `configs` directory.

### License

MIT
