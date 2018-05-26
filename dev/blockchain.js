const sha256 = require('sha256');

function Blockchain(){
  this.chain = []; //Chain array will contain the blocks
  this.pendingTransactions = []; //pending transactions until mined will be kept in this array. They are pending transactions.

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

Blockchain.prototype.createNewTransaction = function(amount, sender, receiver){
  const newTransaction = {
    amount: amount, //amount of the transaction
    sender: sender, //sender/sender address
    receiver: receiver //receiver/receiver address
  };

  this.pendingTransactions.push(newTransaction);
  return this.getLastBlock()['index'] + 1; //We return the number of the block to which this new transaction will be added to
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


module.exports = Blockchain;
