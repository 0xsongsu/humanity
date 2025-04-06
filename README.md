这是一个用于与Humanity测试网交互的自动化工具，能帮助您方便地领取测试币和管理奖励。

## 功能特点

- 自动从测试网水龙头获取测试币
- 检查账户可领取的奖励
- 自动领取奖励
- 支持多钱包批量操作
- 多线程并发处理，提高效率
- 内置重试机制和错误处理

## 环境要求

- Node.js (v14.0.0或更高版本)
- npm (Node.js包管理器)
- 互联网连接
- 代理服务器

## 快速开始

### 1. 安装Node.js和npm

如果您还没有安装Node.js，请访问[Node.js官网](https://nodejs.org/)下载并安装。

### 2. 下载项目

将项目文件下载到您的计算机上，或使用git克隆：

```bash
cd humanity
```

### 3. 安装依赖

在项目目录下运行以下命令安装所需依赖：

```bash
npm install
```

### 4. 配置钱包

编辑`wallet.csv`文件，添加您的钱包信息。文件格式如下：
```bash
index,address,privateKey
1,0x123...abc,private_key
2,0x456...def,private_key
```

### 4. 配置代理

```bash
const CONFIG = {
    proxy: 'http://127.0.0.1:7890', // 修改为您的代理地址
}
```
如未购买代理，可以走我的邀请码：https://www.haiwaidaili.net/register?Invitation_code=10914 

### 5. 运行程序

```bash
node index.js
```

### 6. 注意事项

- 本工具仅用于Humanity测试网，不适用于主网
- 请勿将包含真实资产的钱包私钥添加到此工具中
- 使用时请遵守Humanity测试网的使用规则

### 7. 常见问题

Q: 我的代理服务器无法连接怎么办？

A: 请确认代理服务器地址正确且运行正常。如果不需要代理，可以将CONFIG.proxy设置为 http://127.0.0.1:7890（端口修改成你梯子的端口），这样会使用你本机的vpn


Q: 为什么领取测试币失败？

A: 可能是网络问题或测试网水龙头暂时不可用，程序会自动重试。如果持续失败，可能是该地址已经领取过测试币。


Q: 领取奖励时提示"该地址未注册"怎么办？

A: 您需要先在Humanity测试网完成注册流程，然后才能领取奖励。


Q: 如何增加或减少重试次数？

A: 在index.js文件中修改CONFIG.maxRetries的值。


### 7. 支持
如有问题，请在Twitter私信我 https://x.com/Johnze268