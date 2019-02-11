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
 *
 */
import { expect } from 'chai';
import { MULTISIGNATURE_FEE } from '../../src/constants';
import { MultisignatureTransaction } from '../../src/transactions';
import { Account, TransactionJSON } from '../../src/transaction_types';
import { Status } from '../../src/response';
import { addTransactionFields, MockStateStore as store } from '../helpers';
import {
	validMultisignatureAccount,
	validMultisignatureRegistrationTransaction,
	validTransaction,
} from '../../fixtures';

describe('Multisignature transaction class', () => {
	const validMultisignatureTransaction = addTransactionFields(
		validMultisignatureRegistrationTransaction,
	);
	let validTestTransaction: MultisignatureTransaction;
	let sender: Account;
	beforeEach(async () => {
		validTestTransaction = new MultisignatureTransaction(
			validMultisignatureTransaction,
		);
		sender = validMultisignatureAccount;
		store.account.get = () => sender;
	});

	describe('#constructor', () => {
		it('should create instance of MultisignatureTransaction', async () => {
			expect(validTestTransaction)
				.to.be.an('object')
				.and.be.instanceof(MultisignatureTransaction);
		});

		it('should set multisignature asset', async () => {
			expect(validTestTransaction.asset).to.eql(
				validMultisignatureRegistrationTransaction.asset,
			);
		});

		it('should set fee to multisignature transaction fee amount', async () => {
			expect(validTestTransaction.fee.toString()).to.eql(
				(
					MULTISIGNATURE_FEE *
					(validTestTransaction.asset.multisignature.keysgroup.length + 1)
				).toString(),
			);
		});

		it('should throw TransactionMultiError when asset min is not a number', async () => {
			const invalidMultisignatureTransactionData = {
				...validMultisignatureTransaction,
				asset: {
					multisignature: {
						...validMultisignatureTransaction.asset.multisignature,
						min: '2',
					},
				},
			};
			expect(
				() =>
					new MultisignatureTransaction(invalidMultisignatureTransactionData),
			).to.throw('Invalid field types');
		});

		it('should throw TransactionMultiError when asset lifetime is not a number', async () => {
			const invalidMultisignatureTransactionData = {
				...validMultisignatureTransaction,
				asset: {
					multisignature: {
						...validMultisignatureTransaction.asset.multisignature,
						lifetime: '1',
					},
				},
			};
			expect(
				() =>
					new MultisignatureTransaction(invalidMultisignatureTransactionData),
			).to.throw('Invalid field types');
		});
	});

	describe('#getAssetBytes', () => {
		it('should return valid buffer', async () => {
			const assetBytes = (validTestTransaction as any).getAssetBytes();
			expect(assetBytes).to.eql(
				Buffer.from(
					'02012b343061663634333236356137313838343466336461633536636531376165316437643437643061323461333561323737613061366362306261616131393339662b643034326164336631613562303432646463356161383063343236376235626664336234646461336136383264613061336566373236393430393334376164622b35343266646330303839363465616363353830303839323731333533323638643635356162356563323832393638376161646332373836353366616433336366',
					'hex',
				),
			);
		});
	});

	describe('#verifyAgainstOtherTransactions', () => {
		it('should return status true with non conflicting transactions', async () => {
			const {
				errors,
				status,
			} = validTestTransaction.verifyAgainstOtherTransactions([
				validTransaction,
			] as ReadonlyArray<TransactionJSON>);

			expect(errors)
				.to.be.an('array')
				.of.length(0);
			expect(status).to.equal(Status.OK);
		});

		it('should return TransactionResponse with error when other transaction from same account has the same type', async () => {
			const conflictTransaction = {
				...validTransaction,
				senderPublicKey:
					validMultisignatureRegistrationTransaction.senderPublicKey,
				type: 4,
			};
			const {
				errors,
				status,
			} = validTestTransaction.verifyAgainstOtherTransactions([
				conflictTransaction,
			] as ReadonlyArray<TransactionJSON>);
			expect(errors)
				.to.be.an('array')
				.of.length(1);
			expect(status).to.equal(Status.FAIL);
		});
	});

	describe('#assetToJSON', async () => {
		it('should return an object of type transfer asset', async () => {
			expect(validTestTransaction.assetToJSON()).to.eql(
				validMultisignatureRegistrationTransaction.asset,
			);
		});
	});

	describe('#validateSchema', () => {
		it('should return no errors', async () => {
			const errors = (validTestTransaction as any).validateAsset();
			expect(errors).to.be.empty;
		});

		it('should return error when asset min is over limit', async () => {
			const invalidTransaction = {
				...validMultisignatureRegistrationTransaction,
				asset: {
					multisignature: {
						...validMultisignatureTransaction.asset.multisignature,
						min: 18,
					},
				},
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();
			expect(errors).not.to.be.empty;
		});

		it('should return error when lifetime is under minimum', async () => {
			const invalidTransaction = {
				...validMultisignatureRegistrationTransaction,
				asset: {
					multisignature: {
						...validMultisignatureTransaction.asset.multisignature,
						lifetime: 0,
					},
				},
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();
			expect(errors).not.to.be.empty;
		});

		it('should return error when keysgroup includes invalid keys', async () => {
			const invalidTransaction = {
				...validMultisignatureTransaction,
				asset: {
					multisignature: {
						...validMultisignatureTransaction.asset.multisignature,
						keysgroup: validMultisignatureTransaction.asset.multisignature.keysgroup.map(
							(key: string) => key.replace('+', ''),
						),
					},
				},
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);

			const errors = (transaction as any).validateAsset();
			expect(errors).not.to.be.empty;
		});

		it('should return error when keysgroup has too many keys', async () => {
			const invalidTransaction = {
				...validMultisignatureTransaction,
				asset: {
					multisignature: {
						...validMultisignatureTransaction.asset.multisignature,
						keysgroup: [
							'+40af643265a718844f3dac56ce17ae1d7d47d0a24a35a277a0a6cb0baaa1939f',
							'+d042ad3f1a5b042ddc5aa80c4267b5bfd3b4dda3a682da0a3ef7269409347adb',
							'+542fdc008964eacc580089271353268d655ab5ec2829687aadc278653fad33cf',
							'+30af643265a718844f3dac56ce17ae1d7d47d0a24a35a277a0a6cb0baaa1939f',
							'+a042ad3f1a5b042ddc5aa80c4267b5bfd3b4dda3a682da0a3ef7269409347adb',
							'+442fdc008964eacc580089271353268d655ab5ec2829687aadc278653fad33cf',
							'+10af643265a718844f3dac56ce17ae1d7d47d0a24a35a277a0a6cb0baaa1939f',
							'+z042ad3f1a5b042ddc5aa80c4267b5bfd3b4dda3a682da0a3ef7269409347adb',
							'+x42fdc008964eacc580089271353268d655ab5ec2829687aadc278653fad33cf',
							'+c0af643265a718844f3dac56ce17ae1d7d47d0a24a35a277a0a6cb0baaa1939f',
							'+v042ad3f1a5b042ddc5aa80c4267b5bfd3b4dda3a682da0a3ef7269409347adb',
							'+b42fdc008964eacc580089271353268d655ab5ec2829687aadc278653fad33cf',
							'+80af643265a718844f3dac56ce17ae1d7d47d0a24a35a277a0a6cb0baaa1939f',
							'+n042ad3f1a5b042ddc5aa80c4267b5bfd3b4dda3a682da0a3ef7269409347adb',
							'+042fdc008964eacc580089271353268d655ab5ec2829687aadc278653fad33cf',
							'+k42fdc008964eacc580089271353268d655ab5ec2829687aadc278653fad33cf',
						],
					},
				},
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);

			const errors = (transaction as any).validateAsset();
			expect(errors).not.to.be.empty;
		});

		it('should return error when recipientId is not empty', async () => {
			const invalidTransaction = {
				...validMultisignatureTransaction,
				recipientId: '1L',
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();

			expect(errors).not.to.be.empty;
		});

		it('should return error when recipientPublicKey is not empty', async () => {
			const invalidTransaction = {
				...validMultisignatureTransaction,
				recipientPublicKey: '123',
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);

			const errors = (transaction as any).validateAsset();
			expect(errors).not.to.be.empty;
		});
	});

	describe('#applyAsset', () => {
		it('should return no errors', async () => {
			const { multisignatures, ...nonMultisignatureAccount } = sender;
			store.account.get = () => nonMultisignatureAccount;
			const errors = (validTestTransaction as any).applyAsset(store);

			expect(errors).to.be.empty;
		});

		it('should return error when account is already multisignature', async () => {
			const errors = (validTestTransaction as any).applyAsset(store);
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.be.equal('.signatures');
		});

		it('should return error when keysgroup includes sender key', async () => {
			const invalidSender = {
				...sender,
				multisignatures: [...(sender as any).multisignatures, sender.publicKey],
			};
			store.account.get = () => invalidSender;
			const errors = (validTestTransaction as any).applyAsset(store);
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.be.equal('.signatures');
		});
	});

	describe('#undoAsset', () => {
		it('should return no errors', async () => {
			const errors = (validTestTransaction as any).undoAsset(store);
			expect(errors).to.be.empty;
		});
	});
});
