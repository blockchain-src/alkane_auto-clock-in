

const {
    ECPair,
    bitcoin,
    account,
    privateKeys,
    sendTx,
    getFinalInputUtxos,
    main,
  } = require("./lib");
  const {
    tweakSigner,
  } = require("@oyl/sdk/lib/shared/utils");

  // Extract key for taproot signing
  const privateKey = Buffer.from(privateKeys.taproot.privateKey, "hex");
  // Create a signer with the private key
  const signer = ECPair.fromPrivateKey(privateKey, {
    network: account.network,
  });

  // Get the internal key (xonly pubkey)
  const pubKey = Buffer.from(account.taproot.pubkey,"hex");
  const internalPubkey = pubKey.slice(1, 33);

  const tweaked = tweakSigner(signer);


  
  // Create the p2tr payment with the internal pubkey
  const p2tr = bitcoin.payments.p2tr({
    internalPubkey,
    network: account.network,
  });

  console.log("p2tr address:", p2tr.address);

  
  const sendClockTx = async () => {
    const { utxos: selectedUtxos, fee: estimateFee } = await getFinalInputUtxos(p2tr.address, false);
  
    let psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });
  
    for (const utxo of selectedUtxos) {
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: { value: utxo.value, script: p2tr.output },
        tapInternalKey: internalPubkey,
      });
    }
  
    const utxoValue = selectedUtxos.reduce((acc, utxo) => acc + utxo.value, 0);
    const changeValue = utxoValue - estimateFee;

    psbt.addOutput({ script: protostone, value: 0 });
    psbt.addOutput({ address: p2tr.address, value: changeValue });
  
    psbt.signAllInputs(tweaked);
    psbt.finalizeAllInputs();
    const signedHex = psbt.extractTransaction().toHex();
    console.log("signedHex", signedHex);
    await sendTx(signedHex);
  };
  
  main(sendClockTx).catch(console.error);
  