const Bignum = require('browserify-bignum');
const { cryptography } = require('../../elements/lisk-cryptography/dist-node');
const {
	TransferTransaction,
	TransactionError,
	utils,
} = require('../../elements/lisk-transactions/dist-node');

const ENDORSE_TRANSACTION_TYPE = 9;

const assetFormatSchema = {
	type: 'object',
	properties: {
		data: {
			type: 'string',
			format: 'transferData',
			maxLength: 64,
		},
	},
};

class Cashback extends TransferTransaction {
	applyAsset(store) {
		super.applyAsset(store);

		const sender = store.account.get(this.senderId);
		const updatedSenderBalanceAfterBonus = new Bignum(sender.balance).add(
			this.amount / 2,
		);
		const updatedSender = {
			...sender,
			balance: updatedSenderBalanceAfterBonus.toString(),
		};
		store.account.set(sender.address, updatedSender);

		return [];
	}

	validateAsset() {
		utils.validator.validate(assetFormatSchema, this.asset);

		const errors = [];
		if (this.type !== ENDORSE_TRANSACTION_TYPE) {
			errors.push(
				new TransactionError(
					'Invalid type',
					this.id,
					'.type',
					this.type,
					ENDORSE_TRANSACTION_TYPE,
				),
			);
		}
		if (!utils.validateTransferAmount(this.amount.toString())) {
			errors.push(
				new TransactionError(
					'Amount must be a valid number in string format.',
					this.id,
					'.amount',
					this.amount.toString(),
				),
			);
		}

		if (!this.recipientId) {
			errors.push(
				new TransactionError(
					'`recipientId` must be provided.',
					this.id,
					'.recipientId',
				),
			);
		}
		try {
			utils.validateAddress(this.recipientId);
		} catch (error) {
			errors.push(
				new TransactionError(
					error.message,
					this.id,
					'.recipientId',
					this.recipientId,
				),
			);
		}
		if (this.recipientPublicKey) {
			const calculatedAddress = cryptography.getAddressFromPublicKey(
				this.recipientPublicKey,
			);
			if (this.recipientId !== calculatedAddress) {
				errors.push(
					new TransactionError(
						'recipientId does not match recipientPublicKey.',
						this.id,
						'.recipientId',
						this.recipientId,
						calculatedAddress,
					),
				);
			}
		}
		return errors;
	}
}

module.exports = Cashback;
