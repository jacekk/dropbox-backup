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
    .command('backup', 'Uploads files into directory named after current date and time.')
    .argument('<config>', 'Name of a json file inside "configs" directory.')
    .option(
        '-s, --strategy <strategy>',
        'Defines the way backup is performed. One of: incremental, sync. More details in README.',
        ['incremental', 'sync'],
        'incremental'
    )
    .action((args, options, logger) => {
        backup(args.config, logger, options)
    })

prog.parse(process.argv)
