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

from divide_into_five import divide_into_five

load_dotenv()

# API 키를 사용하여 모델 초기화
llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash", 
    api_key=os.getenv("GEMINI_API")
)

system_prompt_str = """
You are a professional translator.
You need to translate words naturally into {target_language}.
You must understand the characteristics, context, and nuances of the text you are translating,
and then render it appropriately in the {target_language}.
Do not translate words that are inappropriate for translation (such as proper nouns or technical terms). 
Instead, place the original word in parentheses.
Example: Correct translation: google cloud, Incorrect translation: 구글 구름
Do not translate any code, technical terms, or proper nouns.
Do not alter any punctuation marks, and preserve any HTML tags such as <span> exactly as they are.
**Do not insert any additional characters like \\n that are not present in the original text.**
""".strip()

prompt = ChatPromptTemplate.from_messages(
    [
        ("system", system_prompt_str),
        HumanMessagePromptTemplate.from_template("{input}")
    ]
)

chain = RunnablePassthrough() | prompt | llm

def translate_dict(word_dict, target_language):
    combined_input = "\n\n".join(word_dict.word_dict.values())
    
    try:
        response = chain.invoke({"input": combined_input, "target_language": target_language})
        
        # 응답을 출력하여 디버깅
        # print("Response:", response)
        
        # response.content에서 줄바꿈 두번을 기준으로 분리
        translated_texts = response.content.split("\n\n")
        
        if translated_texts:
            translated_texts[-1] = translated_texts[-1].rstrip()

        return translated_texts
    except Exception as e:
        print(f"Error occurred: {e}")
        return []

def translate_texts_parallel(texts, target_language):
    cut_box = divide_into_five(texts)
    
    translated_texts = []
    for word_dict in cut_box.values():
        translated_list = translate_dict(word_dict, target_language)
        translated_texts.extend(translated_list)
    
    return translated_texts

# Main function to execute the translation
def main(texts):
    translated_texts = translate_texts_parallel(texts, "Korean")
    result = {"strs": translated_texts, "language": "ko"}
    return result

if __name__ == "__main__":
    texts_to_translate = [
        "one", "two", "three", "four", "five", 
        "hello", "world", "apple", "banana", 
        "cherry", "date", "elephant", "lion", 
        "tiger", "bear", "red", "blue", 
        "green", "yellow", "purple", "ipad"
    ]
    # texts_to_translate = ['Hello', 'world', 'Python is great', 'Translate this text']

    translated_result = main(texts_to_translate)
    print(translated_result)
