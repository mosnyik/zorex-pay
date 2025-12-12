Zorex Pay is a wallet payment system that supports businesses and individuals to send and recieve money. We can grow to support crypto too.

The system have:

**Users:** These are the customers or businesses that use zorex pay
What they do:-
1. Register/login
2. verify identity (KYC)
3. Own wallet(s)
4. Initiate payment requests, withdrawal or deposits
5. View their balances and transaction history
   
Identification feilds
id - unique id
first_name
last_name - user identity
email - for alerts/login username
phone - otps
password_hash - auth
kyc_status - for complainace
created_at - for audit

Their role in the system
- for authentication and authorization
- linking to wallet(s)
- own transaction(s)


**Wallets:** This is where the user's money/tokens live

TYPES
- Fiat wallet
- Crypto wallet
- Virtual wallet
- internal ledger wallet

What it does:-
1. holds user balance
2. process debit/credit operation
3. validate if funds are enough for transaction/payment
4. Track real-time wallet balance after each transaction
   
Identification feilds
- id - unique id
- user_id - ref the owner in user table
- balance - amount the wallet holds
- currency - the type of funds in the wallet
- status - state of the wallet - active or frozen
- created_at - for audit

Their role in the system
- act as the source or destination of a transaction
- to atomically update transactions(and avoid race condition)
- integrate with external providers ( eg blockchain nodes, banks etc)


**Transactions:** This is the ledger for zorex pay, every money movement appear here

What it does:-
1. Records deposits, withdrawals, transferes, payments 
2. Store transaction amount, status, timestamp, and ref id
3. Helps when we need to rebuild wallet balance history
4. Track successful/failed transactions


TYPES
- DEPOSIT
- WITHDRAWAL
- TRANSFER
- PAYMENT
- REVERSAL
   
Identification feilds
- id - unique id
- wallet_id - wallet affected, ref from wallets table
- amount - value of the transfer
- type - type of the transaction transfer/deposit/withdrawal
- status - status of the transaction pending/success/failed
- previous_balance - balance before transaction
- new_balance - balance after transaction
- metadata - aditional details about transaction eg bank ref, blockchain hash ...
- created_at - for audit

Their role in the system
- Ensure every balance update is logged
- Guarantee atomicity
- Used to resolve disputes and reconciliation
- Provide avenue to track funds for auditors or back office staff


**Rates:** This is where we save exchange rates and fee multipliers

USE: 
NGN <-> USD conversions
BTC <-> NGN calculation
Merchant Rates
profit margin

What it does:-
1. Provide real time exchange value for transactions 
2. Calculate what customers pay vs what merchants gets for settlement
3. Keeps rate per transaction which prevents inconsistent conversion

   
Identification feilds
- id - unique id
- currency_from - eg BTC or USD
- currency_to - eg NGN
- current_rate - eg 1450 NGN/USD
- merchant_rate - eg 1425 NGN/USD
- profit_rate - eg current_rate - mearchant_rate( system profit)
- updated_at - keep track of update time

Their role in the system
- Provide accurate pricing for payment computation
- Change dynamically when admin updated rate
- allows historical look up