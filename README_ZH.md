# 🛠️ Alkanes 自动打卡脚本 by [@OOP](https://x.com/__ababa___)

## 📌 项目简介

这是一个完全免费、开源的 Alkanes2:21568 自动打卡脚本，适用于 SegWit 钱包（以 `bc1q` 开头）。  
该脚本支持两种交易模式，并可根据用户设定的费率自动构造交易。

---

## ⚙️ 使用配置

1. 复制 `.env.example` 文件并重命名为 `.env`
2. 在 `.env` 文件中填写：
   - **助记词**（mnemonic phrase）
   - **你期望使用的手续费率**（单位：sat/vByte）
3. 确保你的 SegWit 钱包地址（以 `bc1q...` 开头）余额充足，能支付矿工费。

---

## 📦 安装依赖

在终端运行以下命令安装依赖：

```bash
npm install
# 或
pnpm install
```

---

## 🚀 使用方法

### 🔹 模式一：包含 Taproot 输出
- 输入：SegWit 地址 (bc1q)
- 输出：
    - Taproot 输出地址 (bc1p)，金额为 546 sats
    - 打卡用的输出（如 OP_RETURN）
    - 找零输出（仍为 SegWit 地址）
- 执行命令：`node main.js`


### 🔹 模式一：不包含 Taproot 输出
- 输入：SegWit 地址 (bc1q)
- 输出：
    - 打卡用的输出（如 OP_RETURN）
    - 找零输出（仍为 SegWit 地址）
- 执行命令：`node without_taproot_output.js`

---

## ⚠️ 免责声明

本脚本**完全免费、开源**，代码中不包含任何窃取私钥的逻辑。
作者不对依赖库或第三方工具的行为以及由此可能导致的资金损失负责。
强烈建议您在使用前通读并理解源代码。

---

## 🙌 打赏支持

如果您觉得这个脚本对您有帮助，欢迎捐赠支持开发：

BTC 地址：
bc1qx3m5u6uf4zryeyut26dkygeuj0vx6kj350a4ss

---

## 📫 联系作者

Twitter: [OOP](https://x.com/__ababa___)

