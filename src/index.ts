#!/usr/bin/env node
import 'colors'
import { main } from './cli'
import { handleError } from './errors'
import { parseArgv } from './utils/yargs'

main(parseArgv()).catch(handleError)
