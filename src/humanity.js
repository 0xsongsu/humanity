const { ethers } = require('ethers');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const logger = require('../logger.js');
const abi = require('./abi/abi.json');

class Humanity {
    constructor(wallet, proxy_url) {
        this.provider = new ethers.JsonRpcProvider('https://rpc.testnet.humanity.org');
        this.agent = new HttpsProxyAgent(proxy_url);
        this.wallet = wallet;
        this.address = wallet.address;
        this.privateKey = wallet.privateKey;
        this.signer = wallet.signer;
        this.contractAddress = '0xa18f6FCB2Fd4884436d10610E69DB7BFa1bFe8C7';
        this.contractAbi = abi;
        this.contract = new ethers.Contract(
            this.contractAddress, 
            this.contractAbi, 
            this.signer || this.provider  // 优先使用signer
        );
        
        // 如果wallet提供了sendTransaction方法，使用它
        if (wallet.sendTransaction) {
            this.sendTransaction = wallet.sendTransaction;
        }
    }
    
    async faucet(address, proxy_url) {
        const url = `https://faucet.testnet.humanity.org/api/claim`;
        const data = {
            address: address
        };
        const headers = {
            "Content-Type": "application/json",
            "Origin": "https://faucet.testnet.humanity.org",
            "Referer": "https://faucet.testnet.humanity.org/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        };
            const response = await axios.post(
                url, 
                data, 
                {
                    headers: headers,
                    proxy: false,
                    httpsAgent: this.agent,
                }
            );
            return response.data.msg;
        
    }

    async checkBuffer() {
        const buffer = await this.contract.userBuffer(this.address);
        return buffer;
    }

    async claimReward() {
        try {
            // 确保我们有signer
            if (!this.signer) {
                this.signer = new ethers.Wallet(this.privateKey, this.provider);
                this.contract = this.contract.connect(this.signer);
            }

            const gasPrice = await this.provider.estimateGas({
                to: this.contractAddress,
                from: this.address,
                data: this.contract.interface.encodeFunctionData('claimReward')
            });
            const gasLimit = 1000000;
            
            // 使用注入的sendTransaction方法或signer
            if (this.sendTransaction) {
                return await this.sendTransaction({
                    to: this.contractAddress,
                    from: this.address,
                    data: this.contract.interface.encodeFunctionData('claimReward'),
                    gasPrice: gasPrice,
                    gasLimit: gasLimit
                });
            } else {
                return await this.signer.sendTransaction({
                    to: this.contractAddress,
                    from: this.address,
                    data: this.contract.interface.encodeFunctionData('claimReward'),
                    gasPrice: gasPrice,
                    gasLimit: gasLimit
                });
            }
        } catch (error) {
            // 处理特定的合约错误
            if (error.reason === "Rewards: user not registered") {
                throw new Error("该地址未注册，请先完成注册");
            }
            logger.error('领取奖励失败:', error);
            throw error;
        }
    }
}

module.exports = Humanity;