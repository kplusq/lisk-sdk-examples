const { createSendable } = require('lisk-sdk');
const CashbackTransaction = require('./transactions/cashback_transaction');

/**
 *  To send printed transaction:
 *  > node print_cashback.js | curl -X POST -H "Content-Type: application/json" -d @- localhost:4000/api/transactions
 *  Note: An application needs to run on port 4000 (the default one) before.
 */
let c = createSendable(CashbackTransaction, {
	amount: `${10 ** 8 * 10 ** 6}`, // 1 token has 10 ** 8 smaller units, we send 10 ** 6 (1 million) of tokens
	fee: `${10 ** 7}`, // 1 token has 10 ** 8 smaller units, we send 10 ** 6 (1 million) of tokens
	recipientId: '10881167371402274308L', // Delegate genesis_100 from the sample genesis block
}, 'wagon stock borrow episode laundry kitten salute link globe zero feed marble');


console.log(c);

process.exit();
