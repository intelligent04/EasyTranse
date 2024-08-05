import asyncio
import concurrent.futures
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate, HumanMessagePromptTemplate
from langchain.schema.runnable import RunnablePassthrough
from dotenv import load_dotenv
import os
import google.api_core.exceptions
import time
import functools

load_dotenv()

# API 키를 사용하여 모델 초기화
llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash", 
    api_key=os.getenv("GEMINI_API")
)

system_prompt_str = """
You are a professional translator.
You need to translate words naturally into another language.
You must understand the characteristics, context, and nuances of the text you are translating,
and then render it appropriately in the target language.
Do not translate any code, technical terms, or proper nouns.
Do not alter any punctuation marks, and preserve any HTML tags such as <span> exactly as they are.
Do not insert any additional characters like \\n that are not present in the original text.
""".strip()

prompt = ChatPromptTemplate.from_messages(
    [
        ("system", system_prompt_str),
        HumanMessagePromptTemplate.from_template("{input}")
    ]
)

chain = RunnablePassthrough() | prompt | llm

def cut_in_five(texts):
    translate_box = {}
    chunk_size = len(texts) // 5
    remainder = len(texts) % 5  # 나머지 텍스트의 개수

    start = 0
    for i in range(5):
        end = start + chunk_size + (1 if i < remainder else 0)
        translate_box[i] = texts[start:end]
        start = end

    return translate_box

# Function to handle the translation of multiple texts in parallel, batching 3 at a time
async def translate_texts_parallel(texts, target_language):
    translated_texts = []
    
    cut_box = cut_in_five(texts)
    for i in range(0, len(texts), 3):
        batch = texts[i:i+3]
        
        # 입력 텍스트들을 하나의 요청으로 묶어서 보냄
        input_texts = "\n\n".join(batch)
        input_text = f"Translate the following text into {target_language}:\n\n{input_texts}"
        
        try:
            result = chain.invoke({"input": input_text})
            batch_results = result.content.split("\n\n")  # 응답 결과를 다시 개별 텍스트로 나눔
            translated_texts.extend(batch_results)
        except google.api_core.exceptions.ResourceExhausted:
            print("Resource exhausted. Retrying in 30 seconds...")
            await asyncio.sleep(30)  # 30초 대기 후 재시도

        print("2s")
        await asyncio.sleep(2)  # 각 배치 사이에 2초 대기
    
    return translated_texts


# Main function to execute the translation
async def main(texts):
    translated_texts = await translate_texts_parallel(texts, "Korean")
    # Construct the result in the required format
    result = {"strs": translated_texts, "language": "ko"}
    return result

# Example usage
if __name__ == "__main__":
    # texts_to_translate = ['dev (3.14)', 'pre (3.13)', '3.12.4', '3.11', '3.10', '3.9', '3.8', '3.7', '3.6', '3.5', 
    #                       '3.4', '3.3', '3.2', '3.1', '3.0', '2.7', '2.6', 'English', 'Spanish', 'French', 'Italian', 
    #                       'Japanese', 'Korean', 'Brazilian Portuguese', 'Turkish', 'Simplified Chinese', 
    #                       'Traditional Chinese', '\n    Theme\n    ', 'Auto', 'Light', 'Dark', 'Previous topic', 
    #                       'Changelog', 'Next topic', '1. ', 'Whetting Your Appetite', 'This Page', 'Report a Bug', 
    #                       'Show Source\n        ', 'Navigation', 'index', 'modules', ' |', 'next', ' |', 'previous', 
    #                       ' |', 'Python', ' »', 'English', 'Spanish', 'French', 'Italian', 'Japanese', 'Korean', 
    #                       'Brazilian Portuguese', 'Turkish', 'Simplified Chinese', 'Traditional Chinese', 
    #                       'dev (3.14)', 'pre (3.13)', '3.12.4', '3.11', '3.10', '3.9', '3.8', '3.7', '3.6', '3.5', 
    #                       '3.4', '3.3', '3.2', '3.1', '3.0', '2.7', '2.6', '3.12.4 Documentation', ' »\n    ', 
    #                       'The Python Tutorial', '\n                     |\n                ', 
    #                       '\n    Theme\n    ', 'Auto', 'Light', 'Dark', ' |', 'The Python Tutorial', '¶', 
    #                       'Python is an easy to learn, powerful programming l…tion development in many areas on most platforms.', 
    #                       'The Python interpreter and the extensive standard …or all major platforms from the Python web site,\n', 
    #                       'https://www.python.org/', ', and may be freely distributed. The same site als…programs and tools, and additional documentation.', 
    #                       'The Python interpreter is easily extended with new…extension language for customizable applications.', 
    #                       'This tutorial introduces the reader informally to …ed,\nso the tutorial can be read off-line as well.', 
    #                       'For a description of standard objects and modules, see ', 'The Python Standard Library', '.\n', 
    #                       'The Python Language Reference', ' gives a more formal definition of the language.  To write\nextensions in C or C++, read ', 
    #                       'Extending and Embedding the Python Interpreter', ' and\n']
    texts_to_translate = ['Hello', 'world', 'Python is great', 'Translate this text']

    translated_result = asyncio.run(main(texts_to_translate))
    print(translated_result)
