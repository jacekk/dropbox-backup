#!/usr/bin/env node

const prog = require('caporal');

const package = require('./package.json');
const configs = require('./src/configs');
const backup = require('./src/backup');

prog
    .version(package.version)
    .description(package.description)
    .command('configs', 'Lists available configs.')
    .action((args, options, logger) => {
        configs(logger);
    })
    .command('backup', 'Uploads files into directory named after current date and time.')
    .argument('<config>', 'Name of a json file inside "configs" directory.')
    .action((args, options, logger) => {
        backup(args.config, logger);
    });

prog.parse(process.argv);
