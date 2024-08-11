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

from divide_into_five import divide_into_five
from divide_into_five import WordDict


# json output parser implementation
class TranslatedDictionary(RootModel):
    root: Dict[str, str] = Field(description="The translated dictionary")


def create_translator():
    load_dotenv()

    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        api_key=os.getenv("GEMINI_API"),
        temperature=0.3
    )

    system_prompt_str = """
    You are a professional translator.
    You are translating short and independent phrases that appear on a website interface, including buttons, labels, and navigation elements.
    Each phrase must be translated **exactly** as it is provided, without any additional interpretation, context, or meaning. Your translation should be literal, preserving the exact words and structure of the original text.
    **Do not** change the meaning of the phrases, infer additional information, or attempt to create a context. Translate only what is explicitly written.
    These phrases are independent of each other, so treat each one as a standalone translation.
    Each phrase must be returned as a key-value pair in a JSON object, where the key is a sequential integer starting from 0, and the value is the translated phrase.
    Only use parentheses to include the original text when translating proper nouns, names, technical terms, or specific words that should not be translated. Use parentheses sparingly and only when absolutely necessary.
    **Preserve any HTML tags such as <span> exactly as they are. Do not alter, add, or remove any characters, words, or line breaks that are not present in the original text.**
    
    Here are examples of correct translations:
    
    Example 1:
    - Original: 네이버 클라우드
    - Correct translation: Naver Cloud
    
    Example 2:
    - Original: 이전
    - Correct translation: Previous
    
    Example 3:
    - Original: 다음
    - Correct translation: Next
    
    Example 4:
    - Original: LIVE
    - Correct translation: LIVE
    
    Example 5:
    - Original: 연합뉴스
    - Correct translation: Yonhap News
    
    Example 6:
    - Original: <a>배드민턴협회, 진상조사위 구성…'부상 관리 소홀'엔 적극 반박</a>
    - Correct translation: <a>Badminton Association forms fact-finding committee... strongly refutes 'negligence in injury management'</a>
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
        # input_dict가 WordDict 타입인 경우
        if isinstance(input_dict, WordDict):
            input_dict = input_dict.to_dict()
            
        pretty_json = json.dumps(input_dict, indent=4, ensure_ascii=False)
    
        # 줄바꿈 문자를 다른 문자로 치환
        # 예: "\n"을 "\\n"으로 치환
        single_line_json = pretty_json.replace("\n", "\\n")
        
        json_lines = single_line_json.split("\\n")
        
        # 한 줄에 하나씩 리스트 요소 배열 -> ai 가독성 좋아짐
        formatted_json = json.dumps(json_lines, ensure_ascii=False)
        
        result = await asyncio.to_thread(chain.invoke, {"input_dict": formatted_json, "target_language": target_language})
        return result.root

    return translate


async def translate_text(input_dict: dict) -> dict:
    translator = create_translator()

    texts = input_dict["strs"]
    target_language = input_dict["language"]

    cut_box = divide_into_five(texts)

    # Translate all dictionaries concurrently
    tasks = [translator(d, target_language) for d in cut_box.values()]
    translated_dicts = await asyncio.gather(*tasks)

    translated_texts = []
    # translated_dicts는 [{'0': '...', '1': '...'}, {'0': '...', '1': '...'}, ...] 형태입니다.
    for translated_dict in translated_dicts:
        # 각 딕셔너리의 값을 순서대로 리스트에 추가
        for key in translated_dict.keys():
            translated_texts.append(translated_dict[key])

    result = {"strs": translated_texts, "language": target_language}
    return result

if __name__ == "__main__":
    # 들어오는 형태 : dict
    # input_dict = {"strs": texts, "language": target_language}
    
    # input_dict1 = {
    # "language": "en",
    # "strs": [
    #         "상단영역 바로가기",
    #         "서비스 메뉴 바로가기",
    #         "새소식 블록 바로가기",
    #         "쇼핑 블록 바로가기",
    #         "관심사 블록 바로가기",
    #         "MY 영역 바로가기",
    #         "위젯 보드 바로가기",
    #         "보기 설정 바로가기",
    #         "NAVER",
    #         "검색",
    #         "검색",
    #         "입력도구",
    #         "자동완성/최근검색어펼치기",
    #     ]
    # }

    input_dict2 = {"strs":["뉴스스탠드언론사편집\n엔터\n스포츠LIVE\n경제\n쇼핑투데이"],"language":"en"}

    print(asyncio.run(translate_text(input_dict2)))
