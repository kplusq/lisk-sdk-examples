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

const assert = require('assert');
const {
	TransferTransaction,
	SecondSignatureTransaction,
	DelegateTransaction,
	VoteTransaction,
	MultisignatureTransaction,
} = require('@liskhq/lisk-transactions');
const randomstring = require('randomstring');
const _ = require('lodash');
const Controller = require('./controller');
const version = require('../version');
const validator = require('./validator');
const configurator = require('./default_configurator');
const { genesisBlockSchema, constantsSchema } = require('./schema');

const { createLoggerComponent } = require('../components/logger');

const ChainModule = require('../modules/chain');
const HttpAPIModule = require('../modules/http_api');
const NetworkModule = require('../modules/network');

// Private __private used because private keyword is restricted
const __private = {
	modules: new WeakMap(),
	transactions: new WeakMap(),
};

const registerProcessHooks = app => {
	process.title = `${app.label}`;

	process.on('uncaughtException', err => {
		// Handle error safely
		app.logger.error('System error: uncaughtException :', {
			message: err.message,
			stack: err.stack,
		});
		app.shutdown(1, err.message);
	});

	process.on('unhandledRejection', err => {
		// Handle error safely
		app.logger.fatal('System error: unhandledRejection :', {
			message: err.message,
			stack: err.stack,
		});
		app.shutdown(1, err.message);
	});

	process.once('SIGTERM', () => app.shutdown(1));

	process.once('SIGINT', () => app.shutdown(1));

	process.once('cleanup', (error, code) => app.shutdown(code, error));

	process.once('exit', (error, code) => app.shutdown(code, error));
};

/**
 * Application class to start the block chain instance
 *
 * @class
 * @memberof framework.controller
 * @requires assert
 * @requires Controller
 * @requires module.defaults
 * @requires validator
 * @requires schema/application
 * @requires components/logger
 * @requires components/storage
 */
class Application {
	/**
	 * Create the application object
	 *
	 * @example
	 *    const app = new Application(myGenesisBlock)
	 * @example
	 *    const app = new Application(myGenesisBlock, {app: {label: 'myApp'}})
	 *
	 * @param {Object} genesisBlock - Genesis block object
	 * @param {Object} [config] - Main configuration object
	 * @param {string} [config.app.label] - Label of the application
	 * @param {Object} [config.app.genesisConfig] - Configuration for applicationState
	 * @param {string} [config.app.version] - Version of the application
	 * @param {string} [config.app.minVersion] - Minimum compatible version on the network
	 * @param {string} [config.app.protocolVersion] - Compatible protocol version application is using
	 * @param {string} [config.app.lastCommitId] - Last commit id coming from application repository
	 * @param {string} [config.app.buildVersion] - Build version of the application
	 * @param {Object} [config.components] - Configurations for components
	 * @param {Object} [config.components.logger] - Configuration for logger component
	 * @param {Object} [config.components.cache] - Configuration for cache component
	 * @param {Object} [config.components.storage] - Configuration for storage component
	 * @param {Object} [config.modules] - Configurations for modules
	 *
	 * @throws Framework.errors.SchemaValidationError
	 */
	constructor(genesisBlock, config = {}) {
		validator.validate(genesisBlockSchema, genesisBlock);

		// Don't change the object parameters provided
		let appConfig = _.cloneDeep(config);

		if (!_.has(appConfig, 'app.label')) {
			_.set(appConfig, 'app.label', `lisk-${genesisBlock.payloadHash}`);
		}

		if (!_.has(appConfig, 'components.logger.logFileName')) {
			_.set(
				appConfig,
				'components.logger.logFileName',
				`${process.cwd()}/logs/${appConfig.app.label}/lisk.log`
			);
		}

		appConfig = configurator.getConfig(appConfig, {
			failOnInvalidArg: process.env.NODE_ENV !== 'test',
		});

		// These constants are readonly we are loading up their default values
		// In additional validating those values so any wrongly changed value
		// by us can be catch on application startup
		const constants = validator.parseEnvArgAndValidate(constantsSchema, {});

		// app.genesisConfig are actually old constants
		// we are merging these here to refactor the underlying code in other iteration
		this.constants = { ...constants, ...appConfig.app.genesisConfig };
		this.genesisBlock = genesisBlock;
		this.config = appConfig;
		this.controller = null;

		// TODO: This should be removed after https://github.com/LiskHQ/lisk/pull/2980
		global.constants = this.constants;

		this.logger = createLoggerComponent(this.config.components.logger);

		__private.modules.set(this, {});
		__private.transactions.set(this, {});

		const { TRANSACTION_TYPES } = constants;

		this.registerTransaction(TRANSACTION_TYPES.SEND, TransferTransaction);
		this.registerTransaction(
			TRANSACTION_TYPES.SIGNATURE,
			SecondSignatureTransaction
		);
		this.registerTransaction(TRANSACTION_TYPES.DELEGATE, DelegateTransaction);
		this.registerTransaction(TRANSACTION_TYPES.VOTE, VoteTransaction);
		this.registerTransaction(
			TRANSACTION_TYPES.MULTI,
			MultisignatureTransaction
		);

		this.registerModule(ChainModule, {
			forging: {
				force: true,
				delegates: [
					{
						encryptedPassphrase: 'iterations=1&salt=476d4299531718af8c88156aab0bb7d6&cipherText=663dde611776d87029ec188dc616d96d813ecabcef62ed0ad05ffe30528f5462c8d499db943ba2ded55c3b7c506815d8db1c2d4c35121e1d27e740dc41f6c405ce8ab8e3120b23f546d8b35823a30639&iv=1a83940b72adc57ec060a648&tag=b5b1e6c6e225c428a4473735bc8f1fc9&version=1',
						publicKey: '9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					},
					{
						encryptedPassphrase: 'iterations=1&salt=fd0f3c5267f321001b30bd75839bdf98&cipherText=9a32f838bb3d9849e841455e5b4ac799ca39fcda2ff4b2f868113cba6487690546416b1e9f606df80e720a3cc12f12fe44968d6c96c3ba76fc6ef66ef5b00bcf52f808d15bf6714a4b89841f&iv=3d422f7cbe6f282f85fe6672&tag=6d07b5b1a11acb263627b783227a4196&version=1',
						publicKey: '141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
					},
					{
						encryptedPassphrase: 'iterations=1&salt=406a1a836699a0e0995a340cf8c68e89&cipherText=9b071ed3623a3a144b146d7e7ceebb28edd6da42590b339fe5a455b79beb2c25b87eb6194f73d8e57c39721295de2af7dfac972952d1b5c963cca14f4fa6cce68cb72cdae51f16131db0bcd5fa3e&iv=9d1c1763e7b5d53bf2ae230b&tag=ef84e213896a68742435dab2ea91523a&version=1',
						publicKey: '3ff32442bb6da7d60c1b7752b24e6467813c9b698e0f278d48c43580da972135',
					},
					{
						encryptedPassphrase: 'iterations=1&salt=6c4891b587ba61542ef4975c94a34c7d&cipherText=9ef6b1c252a7f901b889dc7bfd5a0a65d4529bb79629d3066e20c9a5835c229ee731158ee1299739aafd0634ca71c297086e83d81e16384efbc02b6ca0d5bf6d211a4ebc27c8815159&iv=5eab1ce106ac14f67d0b5295&tag=d7274cab49cc7eae9f7c55a32cc3d822&version=1',
						publicKey: '5d28e992b80172f38d3a2f9592cad740fd18d3c2e187745cd5f7badf285ed819',
					},
				],
				defaultPassword: 'elephant tree paris dragon chair galaxy',
			},
			registeredTransactions: this.getTransactions(),
		});
		this.registerModule(NetworkModule);
		this.registerModule(HttpAPIModule);
		this.overrideModuleOptions(HttpAPIModule.alias, {
			loadAsChildProcess: true,
		});
	}

	/**
	 * Register module with the application
	 *
	 * @param {Object} moduleKlass - Module specification
	 *  @see {@link '../modules/README.md'}
	 * @param {Object} [options] - Modules configuration object. Provided options will override `moduleKlass.defaults` to generate final configuration used for the module
	 * @param {string} [alias] - Will use this alias or fallback to `moduleKlass.alias`
	 */
	registerModule(moduleKlass, options = {}, alias = undefined) {
		assert(moduleKlass, 'ModuleSpec is required');
		assert(
			typeof options === 'object',
			'Module options must be provided or set to empty object.'
		);
		assert(alias || moduleKlass.alias, 'Module alias must be provided.');
		const moduleAlias = alias || moduleKlass.alias;
		assert(
			!Object.keys(this.getModules()).includes(moduleAlias),
			`A module with alias "${moduleAlias}" already registered.`
		);

		const modules = this.getModules();
		modules[moduleAlias] = moduleKlass;
		this.config.modules[moduleAlias] = Object.assign(
			this.config.modules[moduleAlias] || {},
			options
		);
		__private.modules.set(this, modules);
	}

	/**
	 * Override the module's configuration
	 *
	 * @param {string} alias - Alias of module used during registration
	 * @param {Object} options - Override configurations, these will override existing configurations.
	 */
	overrideModuleOptions(alias, options) {
		const modules = this.getModules();
		assert(
			Object.keys(modules).includes(alias),
			`No module ${alias} is registered`
		);
		this.config.modules[alias] = Object.assign(
			{},
			this.config.modules[alias],
			options
		);
	}

	/**
	 * Register a transaction
	 *
	 * @param {number} transactionType - Unique integer that identifies the transaction type
	 * @param {constructor} Transaction - Implementation of @liskhq/lisk-transactions/base_transaction
	 */
	registerTransaction(transactionType, Transaction, options = {}) {
		// TODO: Validate the transaction is properly inherited from base class
		assert(
			Number.isInteger(transactionType),
			'Transaction type is required as an integer'
		);
		assert(
			!Object.keys(this.getTransactions()).includes(transactionType.toString()),
			`A transaction type "${transactionType}" is already registered.`
		);
		assert(Transaction, 'Transaction implementation is required');

		if (options.matcher) {
			Object.defineProperty(Transaction.prototype, 'matcher', {
				get: () => options.matcher,
			});
		}

		const transactions = this.getTransactions();
		transactions[transactionType] = Object.freeze(Transaction);
		__private.transactions.set(this, transactions);
	}

	/**
	 * Get list of all transactions registered with the application
	 *
	 * @return {Object}
	 */
	getTransactions() {
		return __private.transactions.get(this);
	}

	/**
	 * Get one transaction for provided type
	 *
	 * @param {number} transactionType - Unique integer that identifies the transaction type
	 * @return {constructor|undefined}
	 */
	getTransaction(transactionType) {
		return __private.transactions.get(this)[transactionType];
	}

	/**
	 * Get one module for provided alias
	 *
	 * @param {string} alias - Alias for module used during registration
	 * @return {{klass: Object, options: Object}}
	 */
	getModule(alias) {
		return __private.modules.get(this)[alias];
	}

	/**
	 * Get all registered modules
	 *
	 * @return {Array.<Object>}
	 */
	getModules() {
		return __private.modules.get(this);
	}

	/**
	 * Run the application
	 *
	 * @async
	 * @return {Promise.<void>}
	 */
	async run() {
		this.logger.info(`Booting the application with Lisk Framework(${version})`);

		// Freeze every module and configuration so it would not interrupt the app execution
		this._compileAndValidateConfigurations();

		Object.freeze(this.genesisBlock);
		Object.freeze(this.constants);
		Object.freeze(this.config);

		this.logger.info(`Starting the app - ${this.config.app.label}`);

		registerProcessHooks(this);

		this.controller = new Controller(
			this.config.app.label,
			{
				components: this.config.components,
				ipc: this.config.app.ipc,
				initialState: this.config.initialState,
			},
			this.logger
		);
		return this.controller.load(this.getModules(), this.config.modules);
	}

	/**
	 * Stop the running application
	 *
	 * @param {number} [errorCode=0] - Error code
	 * @param {string} [message] - Message specifying exit reason
	 * @return {Promise.<void>}
	 */
	async shutdown(errorCode = 0, message = '') {
		if (this.controller) {
			await this.controller.cleanup(errorCode, message);
		}
		this.logger.info(`Shutting down with error code ${errorCode}: ${message}`);
		process.exit(errorCode);
	}

	_compileAndValidateConfigurations() {
		const modules = this.getModules();

		this.config.app.nonce = randomstring.generate(16);
		this.config.app.nethash = this.genesisBlock.payloadHash;

		const appConfigToShareWithModules = {
			version: this.config.app.version,
			minVersion: this.config.app.minVersion,
			protocolVersion: this.config.app.protocolVersion,
			nethash: this.config.app.nethash,
			nonce: this.config.app.nonce,
			genesisBlock: this.genesisBlock,
			constants: this.constants,
			lastCommitId: this.config.app.lastCommitId,
			buildVersion: this.config.app.buildVersion,
		};

		// TODO: move this configuration to module especific config file
		const childProcessModules = process.env.LISK_CHILD_PROCESS_MODULES
			? process.env.LISK_CHILD_PROCESS_MODULES.split(',')
			: [];

		Object.keys(modules).forEach(alias => {
			this.overrideModuleOptions(alias, {
				loadAsChildProcess: childProcessModules.includes(alias),
			});
			this.overrideModuleOptions(alias, appConfigToShareWithModules);
		});

		this.config.initialState = {
			version: this.config.app.version,
			minVersion: this.config.app.minVersion,
			protocolVersion: this.config.app.protocolVersion,
			nonce: this.config.app.nonce,
			nethash: this.config.app.nethash,
			wsPort: this.config.modules.network.wsPort,
			httpPort: this.config.modules.http_api.httpPort,
		};

		this.logger.trace('Compiled configurations', this.config);
	}
}

module.exports = Application;
