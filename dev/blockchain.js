const sha256 = require('sha256');
const currentNodeUrl = process.argv[3];
const uuid = require('uuid/v1');

function Blockchain(){
  this.chain = []; //Chain array will contain the blocks
  this.pendingTransactions = []; //pending transactions until mined will be kept in this array. They are pending transactions.

  this.currentNodeUrl = currentNodeUrl;
  this.networkNodes = [];

  this.createNewBlock(0, '0', '0'); //This is the Genisis Block
}

Blockchain.prototype.createNewBlock = function(nonce, previousBlockHash, hash){
  const newBlock = {
    index: this.chain.length + 1, //Defines block number
    timestamp: Date.now(), //timestamp when this block is created
    transactions: this.pendingTransactions,
    nonce: nonce, //Comes from a proof-of-work. It's simply a number providing proof that we made this block in a legitimate way
    hash: hash, //hash of the block
    previousBlockHash: previousBlockHash //we store previous block's hash value in the current block
  };

  this.pendingTransactions = []; //clear out once the transactions are added to block
  this.chain.push(newBlock); //new block created is added to the Blockchain

  return newBlock;
}

Blockchain.prototype.getLastBlock = function(){
  return this.chain[this.chain.length-1];
}

Blockchain.prototype.getGenesisBlock = function(){
  return this.chain[0];
}

//simple create the transaction object
Blockchain.prototype.createNewTransaction = function(amount, sender, receiver){
  const newTransaction = {
    transactionId: uuid().split('-').join(''),
    amount: amount, //amount of the transaction
    sender: sender, //sender/sender address
    receiver: receiver //receiver/receiver address
  };
  return newTransaction;
}

//Add incoming transaction to pending transactions
Blockchain.prototype.addTransactionToPendingTransactions = function(transaction){
  this.pendingTransactions.push(transaction);
  return this.getLastBlock()['index']+1;
}

Blockchain.prototype.hashBlock = function(previousBlockHash, currentBlockData, nonce){
  //We use SHA256 hashing function to hash and get the digest of the message.
  const dataAsString = previousBlockHash+nonce.toString()+JSON.stringify(currentBlockData);
  const hash = sha256(dataAsString);
  return hash;
}

Blockchain.prototype.proofOfWork = function(previousBlockHash, currentBlockData){
  //continously hash block until we find correct hash --> any hash starting with four 0000.
  //change nonce for every iteration and return the nonce once correct hash with starting 0000 found.
  let nonce = 0;
  let hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
  while(hash.substring(0, 4)!=="0000"){
    nonce+=1;
    hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
  }
  return nonce;
}

Blockchain.prototype.chainIsValid = function(blockchain){
  for(var i = 1;i<blockchain.length; i++){
    const currentBlock = blockchain[i];
    const prevBlock = blockchain[i-1];
    //calculate hash, check hash for four 0000s and check for prev hash also
    const blockHash = this.hashBlock(prevBlock['hash'], {transactions: currentBlock['transactions'], index: currentBlock['index']}, currentBlock['nonce']);
    if(currentBlock['previousBlockHash']!=prevBlock['hash'] || blockHash.substring(0,4)!= "0000"){
      return false;
    }
  }

  //check for genesis block
  const genesisBlock = blockchain[0];
  if(genesisBlock['nonce']!=0 || genesisBlock['hash']!="0" || genesisBlock['previousBlockHash']!="0")
    return false;

  return true;
}

Blockchain.prototype.searchBlockByHash = function(searchHash){
  var chainOfBlocks = this.chain;
  var flag=0
  for(var i = 0;i<chainOfBlocks.length;i++){

    if(chainOfBlocks[i].hash==searchHash) return chainOfBlocks[i];

  }
  return null;
}

Blockchain.prototype.searchTransactionById = function(transactionId){
  var chainOfBlocks = this.chain;
  var flag=0
  for(var i = 0;i<chainOfBlocks.length;i++){
    if(chainOfBlocks[i].transactions){
      for(var j = 0;j<chainOfBlocks[i].transactions.length;j++){
        if(chainOfBlocks[i].transactions[j].transactionId==transactionId) return chainOfBlocks[i].transactions[j];
      }
    }
  }
  return null;
}

Blockchain.prototype.getAddressData = function(address){
  var chainOfBlocks = this.chain;
  var transactionsAddress = [];

  for(var i = 0;i<chainOfBlocks.length;i++){
    if(chainOfBlocks[i].transactions){
      for(var j = 0;j<chainOfBlocks[i].transactions.length;j++){
        if(chainOfBlocks[i].transactions[j].sender==address || chainOfBlocks[i].transactions[j].receiver==address )
          transactionsAddress.push(chainOfBlocks[i].transactions[j]);
      }
    }
  }

  var addressBalance = 0;

  transactionsAddress.forEach(transaction => {
    if(transaction.sender == address)
      addressBalance-=transaction.amount;
    else
      if(transaction.receiver == address)
        addressBalance+=transaction.amount;
  });

  return {
    addressTransactions: transactionsAddress,
    balance: addressBalance
  };

}
module.exports = Blockchain;
