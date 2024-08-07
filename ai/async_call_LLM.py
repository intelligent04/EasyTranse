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
from langchain_openai import ChatOpenAI

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
    # example
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
    # input_dict = {"strs": texts, "language": target_language}
    
    input_dict = {
    "language": "en",
    "strs": [
            "상단영역 바로가기",
            "서비스 메뉴 바로가기",
            "새소식 블록 바로가기",
            "쇼핑 블록 바로가기",
            "관심사 블록 바로가기",
            "MY 영역 바로가기",
            "위젯 보드 바로가기",
            "보기 설정 바로가기",
            "NAVER",
            "검색",
            "검색",
            "입력도구",
            "자동완성/최근검색어펼치기",
            "최근검색어",
            "전체삭제",
            "검색어 저장 기능이 꺼져 있습니다.<span>설정이 초기화 된다면 도움말을 확인해 주세요.</span>",
            "최근 검색어 내역이 없습니다.<span>설정이 초기화 된다면 도움말을 확인해 주세요.</span>",
            "자동저장 끄기",
            "도움말",
            "<span>닫기</span>",
            "CUE",
            "이 정보가 표시된 이유",
            "검색어와 포함된 키워드를 기반으로 AI 기술을 활용하여 연관된 추천 질문을 제공합니다.",
            "레이어 닫기",
            "이전",
            "다음",
            "자세히보기",
            "도움말",
            "컨텍스트 자동완성",
            "컨텍스트 자동완성",
            "ON/OFF 설정은 해당기기(브라우저)에 저장됩니다.",
            "자세히 보기",
            "자세히 보기",
            "네이버",
            "컨텍스트 자동완성 레이어 닫기",
            "자동완성 끄기",
            "도움말",
            "신고",
            "<span>닫기</span>",
            "메일",
            "카페",
            "블로그",
            "쇼핑",
            "뉴스",
            "증권",
            "부동산",
            "지도",
            "웹툰",
            "치지직",
            "바로가기 펼침",
            "확장 영역",
            "페이 바로가기",
            "톡",
            "알림",
            "장바구니",
            "알림",
            "뉴스스탠드",
            "언론사편집",
            "엔터",
            "LIVE",
            "경제",
            "쇼핑투데이",
            "연합뉴스",
            "<a>배드민턴협회, 진상조사위 구성…'부상 관리 소홀'엔 적극 반박</a>",
            "<a>우상혁, 예선 공동 3위…한국 육상 트랙&amp;필드 최초 2연속 결선행</a>",
            "뉴스스탠드",
            "뉴스홈",
            "리스트형",
            "썸네일형",
            "이전 페이지",
            "<span>언론사 더보기</span><span>1페이지</span><span>전체/4</span>",
            "다음 페이지",
            "추천<em>・</em>구독",
            "자동차",
            "웹툰",
            "패션뷰티",
            "레시피",
            "리빙",
            "책방",
            "지식+",
            "건강",
            "게임",
            "AD",
            "BMW 시승신청",
            "시승 가능한 모델을 버튼으로 확인하세요!",
            "AD",
            "볼보 시승신청",
            "시승 가능한 모델을 버튼으로 확인하세요!",
            "AD",
            "지프 시승신청",
            "시승 가능한 모델을 버튼으로 확인하세요!",
            "AD",
            "르노 시승신청",
            "시승 가능한 모델을 버튼으로 확인하세요!",
            "AD",
            "푸조 시승신청",
            "시승 가능한 모델을 버튼으로 확인하세요!",
            "AD",
            "BYD 시승신청",
            "시승 가능한 모델을 버튼으로 확인하세요!",
            "네이버 마이카",
            "돌고 도는 정비 주기들,",
            "이제 외울 필요 없어요!",
            "다음 페이지",
            "\"비교 불가능한 존재감\" GMC 풀사이즈 픽업 '시에라'",
            "지피코리아",
            "중국 광저우 아이온, 하이퍼카 브랜드 '하이프텍'으로 브랜드명 변경",
            "글로벌오토뉴스",
            "람보르기니 최초의 플러그인 하이브리드 SUV, 우루스 SE",
            "카테크",
            "[모플시승] 인생을 함께 하는 차, 쉐보레 SUV & CUV",
            "모터플렉스 포스트",
            "[디자인칼럼] 정말로 중요한 운전석의 인터페이스 디자인",
            "글로벌오토뉴스",
            "[시승] 더 뉴 EV6, 충전 없이 500km 이상도 거뜬!",
            "카피엔스",
            "아우디 코리아, 24년식 아우디 A6 출시!",
            "모토야",
            "\"모하비 대신 출시됐으면\" 기아, '텔루라이드 풀체인지' 예상도 최초 등장",
            "M Today",
            "프로필 설정",
            "이총명",
            "네이버ID",
            "로그인 보호 설정",
            "dlchdaud04@naver.com",
            "네이버 플러스 멤버십",
            "시작하기",
            "쪽지 <span>0</span>",
            "로그아웃",
            "메일",
            "21",
            "카페",
            "블로그",
            "페이",
            "MYBOX",
            "포스트",
            "설정",
            "이전",
            "다음",
            "메뉴 순서를 변경해 보세요.",
            "자주 사용하는 순서대로 아래 메뉴 버튼을 클릭하세요.",
            "메일",
            "카페",
            "블로그",
            "페이",
            "MYBOX",
            "포스트",
            "기상특보",
            "서울(동북권) 폭염경보",
            "날씨",
            "예보 비교",
            "서울시 동선동5가",
            "맑음",
            "<span>최저기온27°</span><span>최고기온33°</span>",
            "미세<span>좋음</span>",
            "초미세<span>좋음</span>",
            "22시",
            "맑음",
            "27°",
            "0",
            "맑음",
            "28°",
            "2",
            "맑음",
            "27°",
            "4",
            "비",
            "27°",
            "6",
            "흐림",
            "26°",
            "증시",
            "정보 더보기",
            "닫기",
            "새로고침",
            "유로스톡스50",
            "4,640.66",
            "상승",
            "+1.43%",
            "독일",
            "17,536.68",
            "상승",
            "+1.05%",
            "관심 종목이 없습니다.새로운 종목을 추가해 보세요!",
            "종목 추가",
            "위젯 보드",
            "캘린더",
            "캘린더잠금",
            "수",
            "공휴일",
            "일정있음",
            "0",
            "캘린더",
            "일",
            "월",
            "화",
            "수",
            "목",
            "금",
            "토",
            "28",
            "29",
            "30",
            "31",
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "10",
            "11",
            "12",
            "13",
            "14",
            "15",
            "16",
            "17",
            "18",
            "19",
            "20",
            "21",
            "22",
            "23",
            "24",
            "25",
            "26",
            "27",
            "28",
            "29",
            "30",
            "31",
            "VIBE",
            "호텔라운지 음악",
            "다른 추천 보기",
            "빛날 바램",
            "재생",
            "비 온 뒤",
            "재생",
            "해지기 전",
            "재생",
            "메모",
            "메모잠금",
            "잠금 상태입니다.",
            "버튼을 눌러 잠금을 해제할 수 있어요.",
            "새 메모 쓰기",
            "papago",
            "번역하기",
            "영어사전",
            "I bet the place will be packed.",
            "보나 마나 거기 엄청 붐빌 거야.",
            "단어 검색하기",
            "다음 페이지",
            "모바일 네이버 메인",
            "강세일: 네이버쇼핑 최강세일 기간",
            "강력 할인에 강력 쿠폰 혜택까지!",
            "최상단으로 이동",
            "홈 설정",
            "모바일 버전으로 보기",
            "<a>공지사항</a>",
            "네이버 검색 Referer 정책 변경 안내 드립니다. ",
            "서비스 전체보기",
            "Partners",
            "프로젝트 꽃",
            "네이버 비즈니스",
            "네이버 비즈니스 스쿨",
            "네이버 광고",
            "스토어 개설",
            "지역업체 등록",
            "엑스퍼트 등록",
            "Developers",
            "네이버 개발자 센터",
            "오픈 API",
            "오픈소스",
            "네이버 D2",
            "네이버 D2SF",
            "네이버 랩스",
            "웨일 브라우저",
            "이용안내",
            "기업 사이트",
            "바로가기",
            "네이버 정책 및 약관",
            "<a>회사소개</a>",
            "<a>인재채용</a>",
            "<a>제휴제안</a>",
            "<a>이용약관</a>",
            "<a>개인정보처리방침</a>",
            "<a>청소년보호정책</a>",
            "<a>네이버 정책</a>",
            "<a>고객센터</a>",
            "<a>ⓒ NAVER Corp.</a>",
            "이미지 하이라이트",
            "하이라이트",
            "사용하지 않기",
            "삭제",
            "Important",
            "Important",
            "Important",
            "Important",
            "Important",
            "Important",
            "색상 변경",
            "메모 작성",
            "내 하이라이트로 이동",
            "×"
        ]
    }

    print(asyncio.run(translate_text(input_dict)))
