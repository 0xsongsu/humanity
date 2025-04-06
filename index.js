const { ethers } = require('ethers');
const Humanity = require('./src/humanity');
const logger = require('./logger');
const readline = require('readline');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parse');
const { log } = require('console');
const CheckFHE = require('./checkFHE');
// 配置
const CONFIG = {
    proxy: 'http://127.0.0.1:7890',
    walletPath: path.join(__dirname, 'wallet.csv'),
    defaultThreads: 4, // 默认并发线程数
    maxRetries: 5, // 最大重试次数
    timeout: 300000 // 5分钟超时
};

// 操作定义
const ACTIONS = {
    1: {
        name: '领取测试币',
        action: 'faucet',
        description: '从测试网水龙头获取测试币'
    },
    2: {
        name: '检查奖励',
        action: 'checkBuffer',
        description: '检查当前可领取的奖励'
    },
    3: {
        name: '领取奖励',
        action: 'claimReward',
        description: '领取当前可用的奖励'
    },
    4: {
        name: '检查FHE',
        action: 'checkFHE',
        description: '检查当前可领取的FHE'
    }
};

// 工具函数
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const getRandomDelay = () => Math.floor(Math.random() * 9000) + 1000; // 1-10秒随机延迟

// 读取钱包信息
async function readWallets(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return new Promise((resolve, reject) => {
            csv.parse(content, {
                columns: true,
                skip_empty_lines: true,
                trim: true
            }, (err, records) => {
                if (err) reject(err);
                else resolve(records.map(record => ({
                    address: record.address.startsWith('0x') ? record.address : `0x${record.address}`,
                    privateKey: record.privateKey.startsWith('0x') ? record.privateKey.substring(2) : record.privateKey
                })));
            });
        });
    } catch (error) {
        logger.error('读取钱包文件失败:', error);
        throw error;
    }
}

// 创建Humanity实例
function createHumanityInstance(wallet, proxy) {
    const provider = new ethers.JsonRpcProvider('https://rpc.testnet.humanity.org');
    const signer = new ethers.Wallet(wallet.privateKey, provider);
    return new Humanity(
        {
            address: wallet.address,
            privateKey: wallet.privateKey,
            signer: signer,
            sendTransaction: async (tx) => await signer.sendTransaction(tx)
        },
        proxy
    );
}

function createCheckFHEInstance(wallet, proxy) {
    const provider = new ethers.JsonRpcProvider('https://rpc.testnet.humanity.org');
    const signer = new ethers.Wallet(wallet.privateKey, provider);
    return new CheckFHE(
        {
            address: wallet.address,
            privateKey: wallet.privateKey,
            signer: signer,
            sendTransaction: async (tx) => await signer.sendTransaction(tx)
        },
        proxy
    );
}

// 执行单个任务
async function executeTask(wallet, action, config, retryCount = 0) {
    try {
        const humanity = createHumanityInstance(wallet, config.proxy);
        let result;

        switch (action) {
            case 'faucet':
                logger.info(`开始领取测试币: ${wallet.address}`);
                result = await humanity.faucet(wallet.address, config.proxy);
                return { 
                    success: true, 
                    address: wallet.address, 
                    result,
                    message: `地址 ${wallet.address} 领取测试币成功: ${result}`
                };
            
            case 'checkBuffer':
                const buffer = await humanity.checkBuffer();
                return {
                    success: true,
                    address: wallet.address,
                    buffer: buffer.toString(),
                    message: `地址 ${wallet.address} 的奖励为: ${buffer.toString()}`
                };
            
            case 'claimReward':
                const tx = await humanity.claimReward();
                return { 
                    success: true, 
                    address: wallet.address, 
                    txHash: tx.hash,
                    message: `地址 ${wallet.address} 领取奖励成功: ${tx.hash}`
                };

            case 'checkFHE':
                const checkFHEInstance = createCheckFHEInstance(wallet, config.proxy);
                const fheResult = await checkFHEInstance.checkFHE();
                return {
                    success: true,
                    address: wallet.address,
                    eligible: fheResult.eligible,
                    amount: fheResult.amount.toString(),
                    message: `地址 ${wallet.address} ${fheResult.message}`
                };
            
            default:
                throw new Error('未知的操作类型');
        }
    } catch (error) {
        // 处理特定错误
        if (error.message === "该地址未注册，请先完成注册") {
            return {
                success: false,
                address: wallet.address,
                error: error.message,
                isBusinessError: true
            };
        }

        // 重试逻辑
        if (retryCount < CONFIG.maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
            logger.warn(`地址 ${wallet.address} 执行失败，${CONFIG.maxRetries - retryCount}秒后重试(${retryCount + 1}/${CONFIG.maxRetries}): ${error.message}`);
            await sleep(delay);
            return executeTask(wallet, action, config, retryCount + 1);
        }

        return {
            success: false,
            address: wallet.address,
            error: error.message,
            isBusinessError: error.message.includes('代理')
        };
    }
}

// 处理所有钱包任务
async function processWallets(wallets, action, threadCount) {
    const results = [];
    const queue = [...wallets];  // 任务队列
    const activeThreads = new Set();  // 活跃线程跟踪
    let completed = 0;
    const total = wallets.length;

    // 执行单个线程的任务
    async function runThread(threadId) {
        while (queue.length > 0) {
            const wallet = queue.shift();  // 获取下一个任务
            if (!wallet) break;

            try {
                // 任务开始
                logger.info(`[线程${threadId}] 开始处理钱包: ${wallet.address}`);
                
                // 执行任务
                const result = await executeTask(wallet, action, CONFIG);
                completed++;

                // 显示结果
                if (result.success && !result.error) {
                    logger.success(`[线程${threadId}] ${result.message || `地址 ${result.address} 执行成功`}`);
                } else {
                    if (result.isBusinessError) {
                        logger.warn(`[线程${threadId}] ${result.message || `地址 ${result.address}: ${result.error}`}`);
                    } else {
                        logger.error(`[线程${threadId}] ${result.message || `地址 ${result.address} 执行失败: ${result.error}`}`);
                    }
                }

                results.push(result);
                // 任务完成后随机延迟5-10秒
                const delay = 5000 + Math.floor(Math.random() * 5000);
                logger.info(`[线程${threadId}] 休息${Math.floor(delay/1000)}秒后继续下一个任务...`);
                await sleep(delay);

            } catch (error) {
                logger.error(`[线程${threadId}] 任务执行出错: ${error.message}`);
                queue.push(wallet);  // 失败的任务放回队列
            }
        }

        activeThreads.delete(threadId);
        logger.info(`[线程${threadId}] 已完成所有分配的任务`);
    }

    // 启动线程池
    logger.info(`[系统] 启动线程池，线程数: ${threadCount}`);
    logger.info(`[系统] 总任务数: ${total}, 每个线程约处理: ${Math.ceil(total/threadCount)} 个任务`);
    
    for (let i = 1; i <= threadCount; i++) {
        activeThreads.add(i);
        runThread(i).catch(error => {
            logger.error(`[线程${i}] 发生错误: ${error.message}`);
            activeThreads.delete(i);
        });
    }

    // 等待所有任务完成
    while (activeThreads.size > 0 || queue.length > 0) {
        await sleep(1000);
    }

    // 任务统计
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    logger.success(`[完成] 任务处理完成 总数: ${total}, 成功: ${successCount}, 失败: ${failCount}`);
    
    return results;
}

// 创建全局的readline接口
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 修改主函数，移除局部的readline创建
async function main() {
    try {
        // 1. 显示菜单并获取用户输入
        console.log('\n请选择要执行的操作：');
        Object.entries(ACTIONS).forEach(([key, value]) => {
            console.log(`${key}. ${value.name} - ${value.description}`);
        });

        const action = await new Promise(resolve => rl.question('\n请输入操作编号(1-4): ', resolve));
        if (!ACTIONS[action]) {
            throw new Error('无效的操作编号');
        }

        const threads = await new Promise(resolve => rl.question('请输入并发线程数: ', resolve));
        const threadCount = parseInt(threads) || CONFIG.defaultThreads;
        if (isNaN(threadCount) || threadCount < 1) {
            throw new Error('无效的线程数');
        }

        // 2. 读取钱包信息
        logger.info('正在读取钱包信息...');
        const wallets = await readWallets(CONFIG.walletPath);
        logger.info(`成功读取 ${wallets.length} 个钱包`);

        // 3. 执行任务
        logger.info(`开始执行 ${ACTIONS[action].name}，使用 ${threadCount} 个线程`);
        await processWallets(wallets, ACTIONS[action].action, threadCount);

        // 4. 程序完成
        logger.success('所有任务执行完成');

    } catch (error) {
        logger.error('程序执行错误:', error);
        if (error.stack) {
            logger.error('错误堆栈:', error.stack);
        }
    } finally {
        rl.close();
    }
}

// 添加全局错误处理
process.on('unhandledRejection', error => {
    logger.error('未处理的Promise拒绝:', error);
});

process.on('uncaughtException', error => {
    logger.error('未捕获的异常:', error);
});

// 启动程序（只调用一次）
main().catch(console.error); 