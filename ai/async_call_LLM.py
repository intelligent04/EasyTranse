import asyncio
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate, HumanMessagePromptTemplate
from langchain.schema.runnable import RunnablePassthrough
from langchain.output_parsers import PydanticOutputParser
from pydantic import RootModel, Field
from typing import Dict
import os
from dotenv import load_dotenv
import json

# json output parser implementation
class TranslatedDictionary(RootModel):
    root: Dict[str, str] = Field(description="The translated dictionary")

def create_translator():
    load_dotenv()

    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash-latest", 
        api_key=os.getenv("GEMINI_API")
    )

    system_prompt_str = """
    You are a professional translator. 
    Translate the given dictionary values into the specified language. 
    Keep the keys unchanged and only translate the values.
    Do not translate words that are inappropriate for translation (such as proper nouns or technical terms). 
    Instead, place the original word in parentheses.
    Example: Correct translation: (google cloud), Incorrect translation: 구글 구름
    Return the result as a JSON object with the same structure as the input.
    Do not add any additional explanation or metadata.
    """.strip()

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt_str),
        HumanMessagePromptTemplate.from_template(
            "Translate the following dictionary values into {target_language}:\n\n{input_dict}"
        )
    ])

    parser = PydanticOutputParser(pydantic_object=TranslatedDictionary)

    chain = RunnablePassthrough() | prompt | llm | parser

    async def translate(input_dict, target_language):
        result = await asyncio.to_thread(chain.invoke, {"input_dict": json.dumps(input_dict), "target_language": target_language})
        return result.root

    return translate

async def main():
    translator = create_translator()

    # Example dictionaries to translate
    dicts = [
        {
            "0": "When and Why you should apply Tensor Parallel",
            "1": "The PyTorch Fully Sharded Data Parallel (FSDP) already has the capability to scale model training to a specific number of GPUs. However, when it comes to further scale the model training in terms of model size and GPU quantity, many additional challenges arise that may require combining Tensor Parallel with FSDP.",
            "2": "As the world size (number of GPUs) is becoming excessively large (exceeding 128/256 GPUs), the FSDP collectives (such as allgather) are being dominated by ring latency. By implementing TP/SP on top of FSDP, the FSDP world size could be reduced by 8 by applying FSDP to be inter-host only, consequently decreasing the latency costs by the same amount.",
            "3": "Hit data parallelism limit where you can not raise the global batch size to be above the number of GPUs due to both convergence and GPU memory limitations, Tensor/Sequence Parallel is the only known way to \"ballpark\" the global batch size and continue scaling with more GPUs. This means both model size and number of GPUs could continue to scale.",
            "4": "For certain types of models, when local batch size becomes smaller, TP/SP can yield matrix multiplication shapes that are more optimized for floating point operations (FLOPS).",
            "5": "So, when pre-training, how easy is it to hit those limits? As of now, pre-training a Large Language Model (LLM) with billions or trillions of tokens could take months, even when using thousands of GPUs."
        },
        {
            "6": "How to apply Tensor Parallel",
            "7": "PyTorch Tensor Parallel APIs offers a set of module level primitives (ParallelStyle) to configure the sharding for each individual layers of the model, including:",
            "8": "ColwiseParallel and RowwiseParallel: Shard the nn.Linear and nn.Embedding in the column or row fashion.",
            "9": "SequenceParallel: Perform sharded computations on nn.LayerNorm, nn.Dropout, RMSNormPython, etc.",
            "10": "PrepareModuleInput and PrepareModuleOutput: Configure the module inputs/outputs sharding layouts with proper communication operations.",
            "11": "To demonstrate how to use the PyTorch native Tensor Parallel APIs, let us look at a common Transformer model. In this tutorial, we use the most recent Llama2 model as a reference Transformer model implementation, as it is also widely used in the community.",
            "12": "Since Tensor Parallel shard individual tensors over a set of devices, we would need to set up the distributed environment (such as NCCL communicators) first. Tensor Parallelism is a Single-Program Multiple-Data (SPMD) sharding algorithm similar to PyTorch DDP/FSDP, and it under the hood leverages the PyTorch DTensor to perform sharding. It also utilizes the DeviceMesh abstraction (which under the hood manages ProcessGroups) for device management and sharding. To see how to utilize DeviceMesh to set up multi-dimensional parallelisms, please refer to this tutorial. Tensor Parallel usually works within each host, so let us first initialize a DeviceMesh that connects 8 GPUs within a host."
        }

    ]
    
    target_language = "Korean"
    
    # Translate all dictionaries concurrently
    tasks = [translator(d, target_language) for d in dicts]
    translated_dicts = await asyncio.gather(*tasks)
    
    for i, translated_dict in enumerate(translated_dicts):
        print(f"Original dictionary {i}:\n{json.dumps(dicts[i], ensure_ascii=False, indent=2)}\n")
        print(f"Translated to {target_language}:\n{json.dumps(translated_dict, ensure_ascii=False, indent=2)}\n")

# Run the main function
if __name__ == "__main__":
    asyncio.run(main())
