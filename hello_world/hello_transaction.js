const {
	BaseTransaction,
	TransactionError,
} = require('lisk-sdk');

class HelloTransaction extends BaseTransaction {

	static get TYPE () {
		return 10;
	}

	applyAsset(store) {
		const sender = store.account.get(this.senderId);
		
		if (sender.asset && sender.asset.hello) {
			sender.asset.hello += 1;
		} else {
			sender.asset = { hello = 1 };
		}

		store.account.set(this.senderId, Object.assign({}, sender));
	
        return []; // array of TransactionErrors, returns empty array if no errors are thrown
	}

	undoAsset(store) {
		const sender = store.account.get(this.senderId);
		
		if (sender.asset.hello > 1) {
			sender.asset.hello -= 1;
		} else {
			sender.asset = null;
		}
		store.account.set(sender.address, Object.assign({}, sender));
		return [];
	}

	validateAsset() {
		const errors = [];
		if (!this.asset.hello || this.asset.hello !== 1) {
			errors.push(
				new TransactionError(
					'Invalid "asset.hello" defined on transaction',
					this.id,
					'.asset.hello',
					this.asset.hello,
					'"asset.hello" should always equal 1',
				)
			);
		}
		return errors;
	}
	
	async prepare(store) {
		await store.account.cache([
			{
				address: this.senderId,
			},
		]);
	}

}

module.exports = HelloTransaction;
