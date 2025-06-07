

const {
  ECPair,
  bitcoin,
  account,
  privateKeys,
  sendTx,
  getFinalInputUtxos,
  main,
} = require("./lib");

const signer = ECPair.fromPrivateKey(
  Buffer.from(privateKeys.nativeSegwit.privateKey, "hex"),
  {
    network: bitcoin.networks.bitcoin,
  }
);
const pubkeyBuffer = Buffer.from(signer.publicKey);
const segwitAddress = bitcoin.payments.p2wpkh({
  pubkey: pubkeyBuffer,
  network: account.network,
}).address;
console.log(`SegWit Address: ${segwitAddress}`);


const sendClockTx = async () => {
  const { utxos: selectedUtxos, fee: estimateFee } = await getFinalInputUtxos(segwitAddress, true);

  let psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });

  for (const utxo of selectedUtxos) {
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        value: utxo.value,
        script: bitcoin.payments.p2wpkh({
          pubkey: pubkeyBuffer,
          network: account.network,
        }).output,
      },
    });
  }

  const utxoValue = selectedUtxos.reduce((acc, utxo) => acc + utxo.value, 0);
  const changeValue = utxoValue - estimateFee;

  psbt.addOutput({ address: account.taproot.address, value: 546 });
  psbt.addOutput({ script: protostone, value: 0 });
  psbt.addOutput({ address: segwitAddress, value: changeValue - 546 });

  psbt.signAllInputs(signer);
  psbt.finalizeAllInputs();
  const signedHex = psbt.extractTransaction().toHex();
  console.log("signedHex", signedHex);
  await sendTx(signedHex);
};


main(sendClockTx).catch(console.error);
