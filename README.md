# dropbox-backup

### Description

Simple backup utility that uses Dropbox API as storage.

:warning: Currently under heavy development, so feel free to use, but at your own risk :wink:

### Start

1. `git clone https://github.com/jacekk/dropbox-backup.git && cd dropbox-backup`
1. `yarn install`
1. `cp configs/sample.json.dist configs/my-scenario.json` and make all necessary changes.
1. `./run backup my-scenario`

Read [this](https://blogs.dropbox.com/developers/2014/05/generate-an-access-token-for-your-own-account/) to know how to generate access token for your Dropbox.

### Commands

* `./run list` - lists available configs.
* `./run backup <config>` - performes backup process based on given file name inside `configs` directory.

### Roadmap/Ideas

* [x] incremental strategy
* [x] sync strategy
* [ ] incremental limit (to remove oldest)
* [x] hash compare for sync
* [x] clear empty folders on sync
* [ ] archive option
* [ ] password option for archives

### License

MIT
