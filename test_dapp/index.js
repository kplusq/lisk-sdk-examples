const { Application } = require('../framework/src');
const genesisBlockDevnet = require('./genesis_block_devnet.json');
const CashbackTransaction = require('./transactions/cashback_transaction');

const app = new Application(genesisBlockDevnet, {
	app: {
		label: 'my-app',
		minVersion: '0.0.0',
		version: '0.0.0',
		protocolVersion: '0.0',
	},
});

app.registerTransaction(9, CashbackTransaction);

app
	.run()
	.then(() => app.logger.info('App started...'))
	.catch(error => {
		console.error('Faced error in application', error);
		process.exit(1);
	});
