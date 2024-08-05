from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate, HumanMessagePromptTemplate
from langchain.schema.runnable import RunnablePassthrough
import os
from dotenv import load_dotenv

def create_translator():
    load_dotenv()

# API 키를 사용하여 모델 초기화
llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-pro-latest", 
    api_key=os.getenv("GEMINI_API")
)

    system_prompt_str = """
    You are a professional translator. 
    You need to translate words naturally into another language. 
    You must understand the characteristics, context, and nuances of the text you are translating, 
    and then render it appropriately in the target language. Provide only the translated text without any additional explanation. 
    No other content is needed. Respond with the translated text only."
    """.strip()

    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", system_prompt_str),
            HumanMessagePromptTemplate.from_template("{input}")
        ]
    )

    # Create a chain using RunnablePassthrough
    chain = RunnablePassthrough() | prompt | llm

    def translate(text, target_language):
        input_text = f"Translate the following text into {target_language}:\n\n{text}"
        result = chain.invoke({"input": input_text})
        return result.content

    return translate

# Example usage
if __name__ == "__main__":
    translator = create_translator()
    
    text_to_translate = """
    Like other forms of sparsity, semi-structured sparsity is a model optimization technique 
    that seeks to reduce the memory overhead and latency of a neural network at the expense 
    of some model accuracy.
    """
    
    target_language = "Korean"
    
    translated_text = translator(text_to_translate, target_language)
    print(f"Original text:\n{text_to_translate}\n")
    print(f"Translated to {target_language}:\n{translated_text}")
