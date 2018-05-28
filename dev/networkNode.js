const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const Blockchain = require('./blockchain');
const uuid = require('uuid/v1');
const rp = require('request-promise');

const port = process.argv[2];

const nodeAddress = uuid().split('-').join(''); //Address of the node that is running this api server

const bitcoin = new Blockchain();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

//api routes

//get the blockchain object
app.get('/blockchain', function(req, res){
  res.send(bitcoin);
});

//adds the received transaction to the list of pending transactions
app.post('/transaction', function(req, res){
  let transaction = req.body;
  const blockIndex = bitcoin.addTransactionToPendingTransactions(transaction);
  res.json({info: 'Transaction will be added in block no. '+ blockIndex});
});

//create a new transaction and broadcast to the network
app.post('/transaction/broadcast', function(req, res){
  let sender = req.body.sender;
  let receiver = req.body.receiver;
  let amount = req.body.amount;

  const transactionObject = bitcoin.createNewTransaction(amount, sender, receiver);
  bitcoin.addTransactionToPendingTransactions(transactionObject);

  const requestPromises = [];
  bitcoin.networkNodes.forEach(networkNode => {
    const requestOptions = {
      method: 'POST',
      body: transactionObject,
      url: networkNode+'/transaction',
      json: true
    }
    requestPromises.push(rp(requestOptions));
  });

  Promise.all(requestPromises)
    .then(data => {
        res.json({info: 'Transaction created and broadcasted successfully'});
    })
    .catch(err => {
      res.send(err);
    })
});

//mine a new block and broadcast to the network
app.get('/mine', function(req, res){
  const lastBlock = bitcoin.getLastBlock();
  const prevBlockHash = lastBlock['hash'];
  const currentBlockData = {
    transactions: bitcoin.pendingTransactions,
    index: lastBlock['index'] + 1
  }

  const nonce = bitcoin.proofOfWork(prevBlockHash, currentBlockData)
  const currentBlockHash = bitcoin.hashBlock(prevBlockHash, currentBlockData, nonce);

  const newBlock = bitcoin.createNewBlock(nonce, prevBlockHash, currentBlockHash);
  const broadcastPromises = [];
  //broadcast newBlock to all nodes
  bitcoin.networkNodes.forEach(networkNode => {
    const requestOptions = {
      url: networkNode+'/receive-new-block',
      body: newBlock,
      method: 'POST',
      json: true
    };
    broadcastPromises.push(rp(requestOptions));
  });

  Promise.all(broadcastPromises)
    .then(data => {
      const requestOptions = {
        url: bitcoin.currentNodeUrl+'/transaction/broadcast',
        method: 'POST',
        body: {
          amount: 12.5,
          sender: '00',
          receiver: nodeAddress
        },
        json: true
      };
      return rp(requestOptions);
    })
    .then(data => {
      res.json({info: 'new block mined successfully and broadcasted', block: newBlock});
    })
    .catch(err => {
      res.send(err);
    })
});

//receive new block
app.post('/receive-new-block', function(req, res){
  const newBlock = req.body;
  //we now verify the newly received block

  //first check if previous hash of this node's blockchain matches the incoming new block's prev hash
  const lastBlock = bitcoin.getLastBlock();
  const correctPreviousHash = lastBlock.hash == newBlock.previousBlockHash;

  //check for the index property
  const correctIndex = (lastBlock.index + 1) == newBlock.index;

  //if new block is legitimate
  if (correctPreviousHash && correctIndex){
    bitcoin.chain.push(newBlock);
    bitcoin.pendingTransactions = [];
    res.json({info: 'new block received and expected', newBlock: newBlock});
  }
  else{
    //if not legitimate
    res.json({info: 'new block rejected', newBlock: newBlock});
  }

});

//register a new node with the network. register and broadcast incoming node request
app.post('/register-and-broadcast-node', function(req,res){
    const newNodeUrl = req.body.newNodeUrl;
    if(bitcoin.networkNodes.indexOf(newNodeUrl)==-1)
      bitcoin.networkNodes.push(newNodeUrl);

    const registerNodesPromises = [];
    bitcoin.networkNodes.forEach(networkNodeUrl => {
      //hit register node api for each current node
      const requestOptions = {
        uri: networkNodeUrl+'/register-node',
        method: 'POST',
        body: {
          newNodeUrl: newNodeUrl
        },
        json: true
      };

      registerNodesPromises.push(rp(requestOptions));
    });

    Promise.all(registerNodesPromises)
      .then(data =>{
        const bulkRegisterOptions = {
          uri: newNodeUrl+'/register-nodes-bulk',
          method: 'POST',
          body: { allNetworkNodes: [ ...bitcoin.networkNodes, bitcoin.currentNodeUrl]},
          json: true
        }
        return rp(bulkRegisterOptions);
      })
      .then(data => {
        res.json({info: 'new node registered with network successfully!'});
      })
      .catch(err => {

      });
});

//register a node with the network. register incoming new node request
app.post('/register-node', function(req,res){
  const newNodeUrl = req.body.newNodeUrl;
  if(bitcoin.networkNodes.indexOf(newNodeUrl)==-1 && newNodeUrl!=bitcoin.currentNodeUrl)
    bitcoin.networkNodes.push(newNodeUrl);
  res.json({'info': 'new node registered successfully'});
});

//register a set of nodes. register already present network nodes
app.post('/register-nodes-bulk', function(req,res){
  const allNetworkNodes = req.body.allNetworkNodes;
  allNetworkNodes.forEach(networkNode => {
    if(bitcoin.networkNodes.indexOf(networkNode)==-1 && networkNode!=bitcoin.currentNodeUrl)
      bitcoin.networkNodes.push(networkNode);
  });
  res.json({'info': 'nodes in bulk successfully registered'})
});

//concensus
app.get('/consensus', function(req, res){
  //first retrive blockchain objects from all nodes on the network
  const promiseArray = [];
  bitcoin.networkNodes.forEach(networkNode => {
    const requestOptions = {
      url: networkNode+'/blockchain',
      method: 'GET',
      json: true
    }
    promiseArray.push(rp(requestOptions));
  });

  Promise.all(promiseArray)
    .then(blockchains => {
      console.log(blockchains);
      const currentChainLength = bitcoin.chain.length;
      let maxChainLength = currentChainLength;
      let newLongestChain = null;
      let newPendingTransactions = null;

      blockchains.forEach(blockchain => {
        //check for longer chain
        if(maxChainLength<blockchain.chain.length){
          maxChainLength = blockchain.chain.length;
          newLongestChain = blockchain.chain;
          newPendingTransactions = blockchain.pendingTransactions;
        }
      });

      if(!newLongestChain || (newLongestChain && !bitcoin.chainIsValid(newLongestChain))){
        res.json({
          info: 'current chain has not been replaced',
          chain: bitcoin.chain
        });
      }
      else{
        if(newLongestChain && bitcoin.chainIsValid(newLongestChain)){
          //replace current node chain with new longest chain
          bitcoin.chain = newLongestChain;
          bitcoin.pendingTransactions = newPendingTransactions;
          res.json({
            info: 'current chain has been replaced',
            chain: bitcoin.chain
          });
        }
      }

    })
    .catch(err => {
      res.send(err);
    })

});


app.listen(port, function(err){
  if(err)
    console.log("error listening on "+port);
  else
    console.log("listening on "+port);
});
