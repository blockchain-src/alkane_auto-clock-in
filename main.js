const {
  ECPair,
  bitcoin,
  accounts,
  privateKeysArray,
  sendTx,
  getFinalInputUtxos,
  main,
  protostone,
} = require("./lib");

// Create signers and addresses for all accounts
const accountDetails = accounts.map((account, index) => {
  const signer = ECPair.fromPrivateKey(
    Buffer.from(privateKeysArray[index].nativeSegwit.privateKey, "hex"),
    {
      network: bitcoin.networks.bitcoin,
    }
  );
  const pubkeyBuffer = Buffer.from(signer.publicKey);
  const segwitAddress = bitcoin.payments.p2wpkh({
    pubkey: pubkeyBuffer,
    network: account.network,
  }).address;
  
  console.log(`Account ${index + 1} SegWit Address: ${segwitAddress}`);
  
  return {
    signer,
    pubkeyBuffer,
    segwitAddress,
    account,
  };
});

const sendClockTxForAccount = async (accountDetail) => {
  const { signer, pubkeyBuffer, segwitAddress, account } = accountDetail;
  
  try {
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
    console.log(`Signed transaction for address ${segwitAddress}`);
    await sendTx(signedHex);
  } catch (error) {
    console.error(`Error sending clock tx for address ${segwitAddress}:`, error);
  }
};

const sendClockTxForAllAccounts = async () => {
  for (const accountDetail of accountDetails) {
    await sendClockTxForAccount(accountDetail);
  }
};

main(sendClockTxForAllAccounts).catch(console.error);
