const axios = require('axios');
const fs = require('fs');
const ethers = require('ethers');
const { HttpsProxyAgent } = require('https-proxy-agent');


class CheckFHE {
    constructor(wallet, proxy_url) {
        this.provider = new ethers.JsonRpcProvider('https://1rpc.io/bnb');
        this.agent = new HttpsProxyAgent(proxy_url);
        this.wallet = wallet;
        this.address = wallet.address;
        this.privateKey = wallet.privateKey;
        this.signer = wallet.signer;
    }

    async checkFHE() {
        const msg = 'Sign to check the amount of FHE this wallet is eligible to claim.';
        const signature = await this.signer.signMessage(msg);
        const url = 'https://event-api.mindnetwork.xyz/grant/check-eligibility?wallet=' + this.address + '&signature=' + signature;
        try {
            const response = await axios.get(url, { 
                httpsAgent: this.agent,
                proxy: false,
                timeout: 30000 // 30秒超时
            });
            
            if (response.data.data.amount) {
                return {
                    eligible: true,
                    amount: BigInt(response.data.data.amount),
                    message: `符合空投条件，数量: ${response.data.data.amount}`
                };
            } else {
                return {
                    eligible: false,
                    amount: BigInt(0),
                    message: "不符合空投条件"
                };
            }
        } catch (error) {
            console.error('请求失败:', error.message);
            if (error.response) {
                console.error('响应数据:', error.response.data);
            }
            throw error;
        }
    }

        
}

module.exports = CheckFHE;
