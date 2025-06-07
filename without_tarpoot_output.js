const {
  ECPair,
  bitcoin,
  accounts,
  privateKeysArray,
  sendTx,
  getFinalInputUtxos,
  main,
  protostone,
  TARGET_FEE_RATE,
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

// Enable RBF by setting sequence number to max - 2
const rbfSequenceNumber = 0xffffffff - 2;

const sendClockTxForAccount = async (accountSegwitAddress) => {
  const accountDetail = accountDetails.find(
    (account) => account.segwitAddress === accountSegwitAddress
  );
  if (!accountDetail) {
    console.error(`Account ${accountSegwitAddress} not found`);
    return null;
  }
  const { signer, pubkeyBuffer, segwitAddress, account } = accountDetail;

  try {
    const { utxos: selectedUtxos, fee: estimateFee } = await getFinalInputUtxos(
      segwitAddress,
      false,
      TARGET_FEE_RATE
    );


    let psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });

    for (const utxo of selectedUtxos) {
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        sequence: rbfSequenceNumber, // Add RBF sequence number
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

    psbt.addOutput({ script: protostone, value: 0 });
    psbt.addOutput({ address: segwitAddress, value: changeValue });

    psbt.signAllInputs(signer);
    psbt.finalizeAllInputs();
    const signedHex = psbt.extractTransaction().toHex();
    console.log(`Signed RBF-enabled transaction for address ${segwitAddress}`);
    const txid = await sendTx(signedHex);
    return {
      txid,
      accountDetail,
      selectedUtxos,
      estimateFee,
      feeRate: TARGET_FEE_RATE,
    }; // Return the transaction status
  } catch (error) {
    console.error(
      `Error sending clock tx for address ${segwitAddress}:`,
      error
    );
  }
};

const resendClockTx = async (
  accountDetail,
  selectedUtxos,
  estimateFee,
  feeRate,
  currentFeeRate
) => {
  const { signer, pubkeyBuffer, segwitAddress, account } = accountDetail;
  let psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });
  for (const utxo of selectedUtxos) {
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      sequence: rbfSequenceNumber,
      witnessUtxo: {
        value: utxo.value,
        script: bitcoin.payments.p2wpkh({
          pubkey: pubkeyBuffer,
          network: account.network,
        }).output,
      },
    });
  }

  const newEstimateFee = Math.ceil(estimateFee / feeRate * currentFeeRate);
  const utxoValue = selectedUtxos.reduce((acc, utxo) => acc + utxo.value, 0);
  const changeValue = utxoValue - newEstimateFee;

  psbt.addOutput({ script: protostone, value: 0 });
  psbt.addOutput({ address: segwitAddress, value: changeValue });

  psbt.signAllInputs(signer);
  psbt.finalizeAllInputs();
  const signedHex = psbt.extractTransaction().toHex();
  console.log(`Signed RBF-enabled transaction for address ${segwitAddress} with fee rate ${currentFeeRate}`);
  const txid = await sendTx(signedHex);
  return {
    txid,
    accountDetail,
    selectedUtxos,
    estimateFee: newEstimateFee,
    feeRate: currentFeeRate,
  };
};



main(sendClockTxForAccount,resendClockTx).catch(console.error);
