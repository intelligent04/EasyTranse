from async_call_LLM import translate_text
import asyncio

texts = [
    "When and Why you should apply Tensor Parallel",
    "The PyTorch Fully Sharded Data Parallel (FSDP) already has the capability to scale model training to a specific number of GPUs. However, when it comes to further scale the model training in terms of model size and GPU quantity, many additional challenges arise that may require combining Tensor Parallel with FSDP.",
    "As the world size (number of GPUs) is becoming excessively large (exceeding 128/256 GPUs), the FSDP collectives (such as allgather) are being dominated by ring latency. By implementing TP/SP on top of FSDP, the FSDP world size could be reduced by 8 by applying FSDP to be inter-host only, consequently decreasing the latency costs by the same amount.",
    "Hit data parallelism limit where you can not raise the global batch size to be above the number of GPUs due to both convergence and GPU memory limitations, Tensor/Sequence Parallel is the only known way to \"ballpark\" the global batch size and continue scaling with more GPUs. This means both model size and number of GPUs could continue to scale.",
    "For certain types of models, when local batch size becomes smaller, TP/SP can yield matrix multiplication shapes that are more optimized for floating point operations (FLOPS).",
    "So, when pre-training, how easy is it to hit those limits? As of now, pre-training a Large Language Model (LLM) with billions or trillions of tokens could take months, even when using thousands of GPUs.",
    "How to apply Tensor Parallel",
    "PyTorch Tensor Parallel APIs offers a set of module level primitives (ParallelStyle) to configure the sharding for each individual layers of the model, including:",
    "ColwiseParallel and RowwiseParallel: Shard the nn.Linear and nn.Embedding in the column or row fashion.",
    "SequenceParallel: Perform sharded computations on nn.LayerNorm, nn.Dropout, RMSNormPython, etc.",
    "PrepareModuleInput and PrepareModuleOutput: Configure the module inputs/outputs sharding layouts with proper communication operations.",
    "To demonstrate how to use the PyTorch native Tensor Parallel APIs, let us look at a common Transformer model. In this tutorial, we use the most recent Llama2 model as a reference Transformer model implementation, as it is also widely used in the community.",
    "Since Tensor Parallel shard individual tensors over a set of devices, we would need to set up the distributed environment (such as NCCL communicators) first. Tensor Parallelism is a Single-Program Multiple-Data (SPMD) sharding algorithm similar to PyTorch DDP/FSDP, and it under the hood leverages the PyTorch DTensor to perform sharding. It also utilizes the DeviceMesh abstraction (which under the hood manages ProcessGroups) for device management and sharding. To see how to utilize DeviceMesh to set up multi-dimensional parallelisms, please refer to this tutorial. Tensor Parallel usually works within each host, so let us first initialize a DeviceMesh that connects 8 GPUs within a host."
]
target_language = "Korean"

# 들어오는 형태 : dict
input_dict = {"strs": texts, "language": target_language}

text = asyncio.run(translate_text(input_dict))

print(text)
