# 🛠️ Alkanes Auto Check-in Script by [@OOP](https://x.com/__ababa___)

## 📌 Description

This is a free and open-source Alkanes2:21568 auto check-in script designed for use with SegWit wallets.  
The script supports two transaction modes and automatically constructs a transaction with configurable fee rate.

---

## ⚙️ Setup

1. Copy the `.env.example` file and rename it to `.env`.
2. Fill in your **mnemonic phrase** and desired **fee rate** (in sat/vByte).
3. Ensure your SegWit wallet (`bc1q...`) has sufficient balance to cover transaction fees.

---

## 📦 Installation

Run the following command to install dependencies:

```bash
npm install
# or
pnpm install
```

---

## 🚀 Usage

### 🔹 Mode 1: With Taproot Output
- Input: SegWit (bc1q)
- Outputs:
    - Taproot (bc1p) output (546 sats)
    - Clock-in output
    - Change output (SegWit)
- Command: `node main.js`

### 🔹 Mode 2: Without Taproot Output
- Input: SegWit (bc1q)
- Outputs:
    - Clock-in output
    - Change output (SegWit)
- Command: `node without_taproot_output.js`

---

## ⚠️ Disclaimer

This script is provided **completely free of charge**, and **contains no intentional code to access private keys**.
However, the author is not responsible for any potential risks or losses caused by dependencies or third-party libraries.
Please read and review the source code before use.

Use at your own risk.

---

## 🙌 Donation

If you find this script helpful, feel free to send a small donation:

**BTC Address:**
bc1qx3m5u6uf4zryeyut26dkygeuj0vx6kj350a4ss

---

## 📫 Author

Twitter: [@OOP](https://x.com/__ababa___)