const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const Blockchain = require('./blockchain');
const uuid = require('uuid/v1');

const nodeAddress = uuid().split('-').join(''); //Address of the node that is running this api server


const bitcoin = new Blockchain();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

//api routes

//get the blockchain object
app.get('/blockchain', function(req, res){
  res.send(bitcoin);
});

//create new transaction
app.post('/transaction', function(req, res){
  let sender = req.body.sender;
  let receiver = req.body.receiver;
  let amount = req.body.amount;

  const blockIndex = bitcoin.createNewTransaction(amount, sender, receiver);
  res.json({info: 'Transaction will be added in block no. '+ blockIndex});
});

//mine a new block
app.get('/mine', function(req, res){
  const lastBlock = bitcoin.getLastBlock();
  const prevBlockHash = lastBlock['hash'];
  const currentBlockData = {
    transactions: bitcoin.pendingTransactions,
    index: lastBlock['index'] + 1
  }

  const nonce = bitcoin.proofOfWork(prevBlockHash, currentBlockData)
  const currentBlockHash = bitcoin.hashBlock(prevBlockHash, currentBlockData, nonce);

  bitcoin.createNewTransaction(12.5, "00", nodeAddress); //reward the miner

  const newBlock = bitcoin.createNewBlock(nonce, prevBlockHash, currentBlockHash);

  res.json({info: 'new block mined successfully', block: newBlock});
});

app.listen(3000, function(err){
  if(err)
    console.log("error listening on 3000");
  else
    console.log("listening on 3000");
});
