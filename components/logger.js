/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

'use strict';

const fs = require('fs');
const util = require('util');
const child_process = require('child_process');
const path = require('path');
const strftime = require('strftime').utc();

require('colors');

class Logger {
	constructor(config) {
		this.levels = config.levels || {
			none: 99,
			trace: 0,
			debug: 1,
			log: 2,
			info: 3,
			warn: 4,
			error: 5,
			fatal: 6,
		};

		this.level_abbr = config.level_abbr || {
			trace: 'trc',
			debug: 'dbg',
			log: 'log',
			info: 'inf',
			warn: 'WRN',
			error: 'ERR',
			fatal: 'FTL',
		};

		this.filename = `${process.cwd()}/${config.filename || 'logs.log'}`;

		this.errorLevel = config.errorLevel || 'log';

		this.echo = config.echo;
	}

	bootstrap() {
		const logs = {};
		child_process.execSync(`mkdir -p ${path.dirname(this.filename)}`);
		const log_file = fs.createWriteStream(this.filename, {
			flags: 'a',
		});

		function snipFragileData(data) {
			Object.keys(data).forEach(key => {
				if (key.search(/passphrase|password/i) > -1) {
					data[key] = 'XXXXXXXXXX';
				}
			});
			return data;
		}

		Object.keys(this.levels).forEach(name => {
			logs[name] = (message, data) => {
				const logContext = {
					level: name,
					timestamp: strftime('%F %T', new Date()),
				};

				if (message instanceof Error) {
					logContext.message = message.stack;
				} else {
					logContext.message = message;
				}

				if (data && util.isObject(data)) {
					logContext.data = JSON.stringify(snipFragileData(data));
				} else {
					logContext.data = data;
				}

				logContext.symbol = this.level_abbr[logContext.level]
					? this.level_abbr[logContext.level]
					: '???';

				if (this.levels[this.errorLevel] <= this.levels[logContext.level]) {
					if (logContext.data) {
						log_file.write(
							util.format(
								'[%s] %s | %s - %s\n',
								logContext.symbol,
								logContext.timestamp,
								logContext.message,
								logContext.data
							)
						);
					} else {
						log_file.write(
							util.format(
								'[%s] %s | %s\n',
								logContext.symbol,
								logContext.timestamp,
								logContext.message
							)
						);
					}
				}

				if (
					this.echo &&
					this.levels[this.echo] <= this.levels[logContext.level]
				) {
					if (logContext.data) {
						console.info(
							`[${logContext.symbol.bgYellow.black}]`,
							logContext.timestamp.grey,
							'|',
							logContext.message,
							'-',
							logContext.data
						);
					} else {
						console.info(
							`[${logContext.symbol.bgYellow.black}]`,
							logContext.timestamp.grey,
							'|',
							logContext.message
						);
					}
				}
			};
		});

		return logs;
	}
}

function createLoggerComponent(config = {}) {
	return new Logger(config);
}

module.exports = {
	createLoggerComponent,
};
