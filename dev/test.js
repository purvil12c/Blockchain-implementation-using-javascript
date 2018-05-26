const Blockchain = require("./blockchain")
const bitcoin = new Blockchain();

const previousBlockHash = "0000";
const currentBlockData = [
  {
    amount: 20,
    sender: 'PURVILasdasd',
    receiver: 'JOHNasfasfaa'
  },
  {
    amount: 50,
    sender: 'PURVILasdasd',
    receiver: 'ALEXasfasfaa'
  },
]

console.log(bitcoin);
