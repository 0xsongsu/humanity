const chalk = require('chalk');
const moment = require('moment');

class Logger {
    // emoji 映射
    static EMOJI = {
        SUCCESS: '🎉',
        INFO: '🔉',
        WARN: '🚨',
        ERROR: '❌',
        DEBUG: '🔍'
    };

    static getTimestamp() {
        return moment().format('MM-DD HH:mm:ss');
    }

    // 解析钱包信息
    static parseWalletInfo(args) {
        if (args.length >= 1 && typeof args[0] === 'object' && args[0].index && args[0].wallet) {
            const { index, wallet } = args[0];
            return {
                prefix: `[${index}] ${wallet}`,
                remainingArgs: args.slice(1)
            };
        }
        return {
            prefix: '',
            remainingArgs: args
        };
    }

    static formatMessage(level, emoji, ...args) {
        const timestamp = this.getTimestamp();
        const { prefix, remainingArgs } = this.parseWalletInfo(args);
        
        if (prefix) {
            return `${emoji} ${prefix} ${timestamp} ${level} ${remainingArgs.join(' ')}`;
        }
        return `${emoji} ${timestamp} ${level} ${remainingArgs.join(' ')}`;
    }

    static success(...args) {
        console.log(chalk.green(this.formatMessage('[SUCCESS]', this.EMOJI.SUCCESS, ...args)));
    }

    static info(...args) {
        console.log(chalk.blue(this.formatMessage('[INFO]', this.EMOJI.INFO, ...args)));
    }

    static warn(...args) {
        console.log(chalk.yellow(this.formatMessage('[WARN]', this.EMOJI.WARN, ...args)));
    }

    static error(...args) {
        console.log(chalk.red(this.formatMessage('[ERROR]', this.EMOJI.ERROR, ...args)));
    }

    static debug(...args) {
        if (process.env.DEBUG) {
            console.log(chalk.gray(this.formatMessage('[DEBUG]', this.EMOJI.DEBUG, ...args)));
        }
    }
}

module.exports = Logger;