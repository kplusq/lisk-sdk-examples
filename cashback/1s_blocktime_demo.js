const { Application, genesisBlockDevnet, configDevnet } = require('lisk-sdk');

const customConfig = Object.assign(configDevnet);

customConfig.app.genesisConfig.BLOCK_TIME = 1;

const app = new Application(genesisBlockDevnet, customConfig);

app
	.run()
	.then(() => app.logger.info('App started...'))
	.catch(error => {
		console.error('Faced error in application', error);
		process.exit(1);
	});
