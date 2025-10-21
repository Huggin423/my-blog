+++
date = '2025-09-27T08:59:57+08:00'
draft = false
title = 'Virtuals Hackathon AI模块开发记录'
tags = ["技术", "博客"]
categories = ["技术分享"]
+++

### AI任务定义

- 核心任务：根据市场状态，决定资金在 **“避险资产（Aave）”** 和 **“风险/收益资产（Uniswap V3 LP）”** 之间的分配比例，并为风险资产提供最优的参数。

<!--more-->

- AI输入：
    - 对于uniswap，包含ETH/USDT, ETH/USDC 的**当前价格**、**交易量。**
    - 对于Aave，包含ETH, USDT, USDC的**存款年化收益率**。
    - 需要包含**链上Gas费水平**。
- AI输出：一个结构化的策略指令，暂定JSON格式。例如：
    
    ```python
    {
      "timestamp": 1678886400,
      "strategy_id": "strategy-v1-001",
      "allocations": {
        "aave_eth_pool": 0.4, // 40% 的ETH存入Aave
        "uniswap_v3_eth_usdc_pool": 0.6 // 60% 的ETH和等值的USDC组成LP
      },
      "uniswap_v3_params": {
        "pool": "ETH/USDC",
        // 价格区间的核心参数，可以是相对当前价格的百分比
        "price_range_percentage": { 
          "lower_bound": -5, // 当前价格的 -5%
          "upper_bound": 5   // 当前价格的 +5%
        }
        // 或者直接输出tick，这需要链下脚本做转换
        // "tickLower": 198240, 
        // "tickUpper": 204240
      }
    }
    ```
    
- AI决策原则：
    1. 当市场波动大时，AI应倾向于将更多资产放入Aave避险；市场稳定且交易活跃时，可以放入Uniswap V3赚取更多手续费。
    2. 波动率低时，设置一个狭窄的价格区间来最大化手续费收益；预期波动会很大时，设置一个宽泛的区间甚至完全撤出到Aave，以避免无常损失。


### AI策略架构设计

