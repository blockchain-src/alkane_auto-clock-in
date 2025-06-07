const {
  mnemonicToAccount,
  getWalletPrivateKeys,
} = require("@oyl/sdk/lib/account/account");

const {
  encodeRunestoneProtostone,
  ProtoStone,
  encipher,
} = require("alkanes/lib/index");

const bitcoin = require("bitcoinjs-lib");
const { ECPairFactory } = require("ecpair");
const ecc = require("@bitcoinerlab/secp256k1");

const fs = require('fs');
const YAML = require('yaml');
const path = require('path');

// INIT
const BTC_PUBLIC_NODE = "https://bitcoin-rpc.publicnode.com";

bitcoin.initEccLib(ecc);
const ECPair = ECPairFactory(ecc);

// Load config from YAML
const configPath = path.join(__dirname, 'config.yaml');
const configFile = fs.readFileSync(configPath, 'utf8');
const config = YAML.parse(configFile);

const mnemonics = config.mnemonics;
console.log(`Using ${mnemonics.length} mnemonics`);
if (!Array.isArray(mnemonics) || mnemonics.length === 0) {
  throw new Error("mnemonics must be a non-empty array in config.yaml");
}

const TARGET_FEE_RATE = config.target_fee_rate || 6;
console.log(`Using fee rate: ${TARGET_FEE_RATE}`);

const MINIUM_SATS_THRESHOLD = config.minimum_sats_threshold || 546;
console.log(`Using minimum sats threshold: ${MINIUM_SATS_THRESHOLD}`);

const TARGET_CLOCK_BLOCK = 899717;

const HEADERS = { "Content-Type": "application/json" };

const rpc = async (method, params = []) => {
  const res = await fetch(BTC_PUBLIC_NODE, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });

  const data = await res.json();
  return data.result;
}

const sendTx = async (signedHex) => {
    try {
      const response = await fetch("https://mempool.space/api/tx", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: signedHex,
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to broadcast: ${errorText}`);
      }
  
      const txid = await response.text();
      console.log("Transaction broadcasted! TXID:", txid);
    } catch (error) {
      console.error("Error broadcasting transaction:", error);
      throw error;
    }
  };

// clock-in (2:21568)
const opcode = 103; // 103: clock-in
const calldata = [BigInt(2), BigInt(21568), BigInt(opcode)];
const protostone = encodeRunestoneProtostone({
  protostones: [
    ProtoStone.message({
      protocolTag: 1n,
      edicts: [],
      pointer: 0,
      refundPointer: 0,
      // calldata:[]
      calldata: encipher(calldata),
    }),
  ],
}).encodedRunestone;

const selectUtxos = (utxos, withTarpoot = false) => {
  const feeRate = TARGET_FEE_RATE;
  // select utxos
  const sortedUtxos = [...utxos].sort((a, b) => {
    return b.value - a.value;
  });

  const inputBytes = 68;
  const outputBytes = 36;
  const overheadBytes = 12 + 29;

  const dustThreshold = 546;

  const baseTxBytes = overheadBytes + outputBytes * (withTarpoot ? 2 : 1);

  const selectedUtxos = [];
  let selectedAmount = 0;

  const exactMatchUtxo = sortedUtxos.find((utxo) => {
    const txFee = feeRate * (baseTxBytes + inputBytes);
    return utxo.value >= txFee && utxo.value <= txFee + dustThreshold;
  });

  if (exactMatchUtxo) {
    return {
      utxos: [exactMatchUtxo],
      fee: feeRate * (baseTxBytes + inputBytes),
    };
  }

  const minimumViableUtxo = sortedUtxos.find((utxo) => {
    const txFee = feeRate * (baseTxBytes + inputBytes);
    return utxo.value >= txFee;
  });

  if (minimumViableUtxo) {
    return {
      utxos: [minimumViableUtxo],
      fee: feeRate * (baseTxBytes + inputBytes),
    };
  }

  for (const utxo of sortedUtxos) {
    selectedUtxos.push(utxo);
    selectedAmount += utxo.value;

    const txBytes = baseTxBytes + inputBytes * selectedUtxos.length;
    const txFee = txBytes * feeRate;

    if (selectedAmount >= txFee) {
      const change = selectedAmount - txFee;
      if (change >= dustThreshold || change === 0) {
        break;
      }
    }
  }

  const finalTxBytes = baseTxBytes + inputBytes * selectedUtxos.length;
  const finalTxFee = Math.ceil(finalTxBytes * feeRate);

  if (selectedAmount < finalTxFee) {
    throw new Error("Not enough balance");
  }
  return { utxos: selectedUtxos, fee: finalTxFee };
};

const accounts = mnemonics.map(mnemonic => 
  mnemonicToAccount({
    mnemonic,
    opts: { network: bitcoin.networks.bitcoin },
  })
);

const privateKeysArray = mnemonics.map(mnemonic =>
  getWalletPrivateKeys({
    mnemonic,
    opts: { network: bitcoin.networks.bitcoin },
  })
);

const getFinalInputUtxos = async (address, withTarpoot = false) => {  
  const confirmedResponse = await fetch(
    `https://mempool.space/api/address/${address}/utxo`
  );
  const utxos = await confirmedResponse.json();

  const filteredUtxos = utxos.filter(
    (utxo) => utxo.value > MINIUM_SATS_THRESHOLD
  );
  const { utxos: selectedUtxos, fee: estimateFee } = selectUtxos(filteredUtxos, withTarpoot);
  console.log("selectedUtxos", selectedUtxos);
  console.log("fee", estimateFee);
  return {
    utxos: selectedUtxos,
    fee: estimateFee,
  }
}

// every 144 blocks, send clock tx
const main = async (sendClockTx) => {
    let lastClockedBlock = null;
    const checkAndClock = async () => {
      try {
  
        const currentBlock = await rpc('getblockcount');
        console.log(`Current block: ${currentBlock}`);
        
        if ((currentBlock + 1 - TARGET_CLOCK_BLOCK) % 144 === 0 && currentBlock !== lastClockedBlock) {
          console.log('Time to clock in!');
          await sendClockTx();
          console.log('Clock-in transaction sent successfully!');
          lastClockedBlock = currentBlock; 
        } else {
          const blocksUntilNextClock = 144 - ((currentBlock + 1 - TARGET_CLOCK_BLOCK) % 144);
          console.log(`${blocksUntilNextClock} blocks until next clock-in`);
        }
      } catch (error) {
        console.error('Error in checkAndClock:', error);
      }
    };
  
    await checkAndClock();
    setInterval(checkAndClock, 15000);
  
    process.stdin.resume();
    console.log('Monitoring blocks for clock-in opportunities...');
  };

module.exports = {
  opcode,
  calldata,
  protostone,
  mnemonics,
  TARGET_FEE_RATE,
  MINIUM_SATS_THRESHOLD,
  TARGET_CLOCK_BLOCK,
  ECPair,
  bitcoin,
  rpc,
  selectUtxos,
  accounts,
  privateKeysArray,
  sendTx,
  getFinalInputUtxos,
  main,
};
