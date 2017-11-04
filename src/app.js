const prog = require('caporal')

const pkg = require('../package.json')

const configs = require('./configs')
const backup = require('./backup')

prog
    .version(pkg.version)
    .description(pkg.description)
    .command('configs', 'Lists available configs.')
    .action((args, options, logger) => {
        configs(logger)
    })
    .command('backup', 'Performes backup process based on given <config> argument.')
    .argument('<config>', 'Name of a json file inside "configs" directory.')
    .action((args, options, logger) => {
        backup(args.config, logger, options)
    })

prog.parse(process.argv)
