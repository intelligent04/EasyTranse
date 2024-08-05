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
        api_key=os.getenv("GOOGLE_API_KEY")
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

    def translate(input_dict, target_language):
        result = chain.invoke({"input_dict": json.dumps(input_dict), "target_language": target_language})
        return result.root

    return translate

# Example usage
if __name__ == "__main__":
    translator = create_translator()
    
    my_dic = {
        "0": "When and Why you should apply Tensor Parallel",
        "1": "The PyTorch Fully Sharded Data Parallel (FSDP) already has the capability to scale model training to a specific number of GPUs. However, when it comes to further scale the model training in terms of model size and GPU quantity, many additional challenges arise that may require combining Tensor Parallel with FSDP.",
        "2": "As the world size (number of GPUs) is becoming excessively large (exceeding 128/256 GPUs), the FSDP collectives (such as allgather) are being dominated by ring latency. By implementing TP/SP on top of FSDP, the FSDP world size could be reduced by 8 by applying FSDP to be inter-host only, consequently decreasing the latency costs by the same amount.",
        "3": "Hit data parallelism limit where you can not raise the global batch size to be above the number of GPUs due to both convergence and GPU memory limitations, Tensor/Sequence Parallel is the only known way to \"ballpark\" the global batch size and continue scaling with more GPUs. This means both model size and number of GPUs could continue to scale.",
        "4": "For certain types of models, when local batch size becomes smaller, TP/SP can yield matrix multiplication shapes that are more optimized for floating point operations (FLOPS).",
        "5": "So, when pre-training, how easy is it to hit those limits? As of now, pre-training a Large Language Model (LLM) with billions or trillions of tokens could take months, even when using thousands of GPUs."
    }
    
    target_language = "Korean"
    
    translated_dict = translator(my_dic, target_language)
    print(f"Original dictionary:\n{json.dumps(my_dic, ensure_ascii=False, indent=2)}\n")
    print(f"Translated to {target_language}:\n{json.dumps(translated_dict, ensure_ascii=False, indent=2)}")