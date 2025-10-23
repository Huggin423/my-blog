+++
date = '2025-10-22T14:32:14+08:00'
draft = false
title = 'LoRA_1'
hiddenInHomeList=true
+++

### Utils for LoRA

1. merge_and_unload(): 将适配器权重与基础模型合并，从而将新合并的模型作为一个独立模型有效使用。
2. merge_adapter(): 将LoRA层（与前面的适配器权重的关系？）合并到基础模型中，并保留PEFTModel。
3. unmerge_adapter(): 将LoRA层从基础模型解合并，同时保留PEFTModel。
4. unload(): 获取未合并LoRA层前的基础模型，主要是为了获得origin model，听说在Stable Diffusion WebUi中会使用（这是什么？）。
5. delete_adapter(): 删除现有适配器。
6. add_weighted_adapter():根据用户提供的权重方案将多个LoRAs组合成一个新的适配器。

### PEFT中常见的LoRA参数

常见的使用LoRA微调模型的流程：
实例化基础模型 --> 创建配置(LoraConfig)，包含LoRA特定参数 --> 将基础模型使用get_peft_model包裹，获取可训练的PEFTModel --> 开始训练

这里具体介绍LoraConfig包含哪些参数来控制LoRA应用于基础模型。

1. rank 更新矩阵的秩，用 int 表示。较低的秩会导致更新矩阵更小，训练参数更少。
2. target_modules 应用于 LoRA 更新矩阵的模块
3. lora_alpha LoRA 缩放因子
4. bias 指定 bias 参数是否需要训练。可以是 'none' 、 'all' 或 'lora_only'
5. use_rslora 当设置为 True 时，使用 `Rank-Stabilized LoRA`，将适配器缩放因子设置为 `lora_alpha/math.sqrt(r)` ，因为它被证明效果更好。否则，它将使用原始默认值 `lora_alpha/r`。
6. modules_to_save 除了 LoRA 层之外，需要设置为可训练并保存在最终检查点中的模块列表。这些通常包括模型的自定义头部，该头部在微调任务中随机初始化。
7. layers_to_transform 需要由 LoRA 转换的层列表。如果未指定，则 `target_modules` 中的所有层都将被转换。
8. layers_pattern 匹配 `target_modules` 中层名称的模式，如果指定了 `layers_to_transform` 。默认情况下 PeftModel 会查看常见层模式（ layers , h , blocks 等），用于异类和自定义模型。
9. rank_pattern 将层名称或正则表达式映射到与 r 指定的默认秩不同的秩。
10. alpha_pattern : 将层名称或正则表达式映射到与 `lora_alpha`指定的默认 `alpha` 不同的 `alpha`。

### 初始化选项

LoRA 权重的初始化由 `LoraConfig` 的 `init_lora_weights` 参数控制。默认情况下，PEFT 以参考实现相同的方式初始化 LoRA 权重，即使用 `Kaiming-uniform` 初始化权重 A，并将权重 B 初始化为零，从而得到恒等变换。

也可以传递 `init_lora_weights="gaussian"` 。顾名思义，这会导致权重 A 使用高斯分布初始化（权重 B 仍然是零）。这对应于 diffusers 初始化 LoRA 权重的方式。

在量化基础模型时，例如进行 QLoRA 训练，建议使用 LoftQ 初始化，该初始化已被证明能提升量化后的性能。其原理在于将 LoRA 权重初始化为使量化误差最小化。要使用此选项，请勿量化基础模型。
```
from peft import LoftQConfig, LoraConfig, get_peft_model

base_model = AutoModelForCausalLM.from_pretrained(...)  # don't quantize here
loftq_config = LoftQConfig(loftq_bits=4, ...)           # set 4bit quantization
lora_config = LoraConfig(..., init_lora_weights="loftq", loftq_config=loftq_config)
peft_model = get_peft_model(base_model, lora_config)
```

还有一个选项可以设置 initialize_lora_weights=False 。选择这个选项时，LoRA 权重会被初始化，以确保它们不会导致恒等变换。这对于调试和测试目的很有用，否则不应使用。

最后，LoRA 架构在每次前向传递时通过一个固定的标量来缩放每个适配器，该标量在初始化时设置，并且取决于秩 r 。虽然原始的 LoRA 方法使用标量函数 lora_alpha/r ，但研究 Rank-Stabilized LoRA 证明，使用 lora_alpha/math.sqrt(r) 而不是 lora_alpha/r ，可以稳定适配器并解锁更高秩带来的性能提升潜力。设置 use_rslora=True 以使用秩稳定缩放 lora_alpha/math.sqrt(r) 。