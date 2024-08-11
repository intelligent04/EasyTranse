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

class TranslatedDictionary(RootModel):
    root: Dict[str, str] = Field(default_factory=dict, description="The translated phrases")

def create_translator():
    load_dotenv()

    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        api_key=os.getenv("GEMINI_API"),
        temperature=0.3
    )

    async def translate(input_dict, target_language):
        if isinstance(input_dict, WordDict):
            input_dict = input_dict.to_dict()
        
        # 번역할 텍스트 값만 추출
        texts_to_translate = list(input_dict.values())
        num_phrases = len(texts_to_translate)  # 번역할 텍스트의 개수
        
        # LLM을 위한 간단한 번호 목록 생성
        numbered_texts = "\n".join(f"{i}: {text}" for i, text in enumerate(texts_to_translate))
        
        # 프롬프트 텍스트를 LLM에 전달하기 전에 개수 정보를 포함하여 생성
        system_prompt_str = f"""
        You are a professional translator.
        Translate the following {num_phrases} numbered phrases into {{target_language}}.
        Only translate the text after the colon (:) in each line. Do not translate or modify the numbers or any JSON syntax.
        Return your translations in the same numbered format, enclosed in a JSON object like this:
        {{ "0": "translated text 0", "1": "translated text 1", ..., "{num_phrases - 1}": "translated text {num_phrases - 1}" }}
        Each phrase must be translated exactly as it is provided, without any additional interpretation, context, or meaning.
        Your translation should be literal, preserving the exact words and structure of the original text.
        Do not change the meaning of the phrases, infer additional information, or attempt to create a context.
        Translate only what is explicitly written.
        These phrases are independent of each other, so treat each one as a standalone translation.
        Only use parentheses to include the original text when translating proper nouns, names, technical terms, or specific words that should not be translated.
        Use parentheses sparingly and only when absolutely necessary.
        Preserve any HTML tags such as <span> exactly as they are. Do not alter, add, or remove any characters, words, or line breaks that are not present in the original text.
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
        """

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt_str),
            HumanMessagePromptTemplate.from_template(
                "Translate the following phrases:\n\n{numbered_texts}"
            )
        ])

        parser = PydanticOutputParser(pydantic_object=TranslatedDictionary)

        chain = RunnablePassthrough() | prompt | llm | parser

        try:
            result = await asyncio.to_thread(chain.invoke, {
                "numbered_texts": numbered_texts,
                "target_language": target_language
            })
            
            if result is None or not isinstance(result.root, dict):
                raise ValueError("LLM에서 예상치 못한 출력값을 받았습니다.")
            
            # 결과를 후처리하여 원래 구조를 복원
            translated_dict = {}
            for key, value in zip(input_dict.keys(), result.root.values()):
                translated_dict[key] = value.strip()
            
            return translated_dict
        except Exception as e:
            print(f"번역 중 오류 발생: {e}")
            # 오류 발생 시 번역되지 않은 원본 딕셔너리를 반환
            return input_dict

    return translate  # translate 함수 반환


async def translate_text(input_dict: dict) -> dict:
    translator = create_translator()

    texts = input_dict["strs"]
    target_language = input_dict["language"]

    cut_box = divide_into_five(texts)

    # Translate all dictionaries concurrently
    tasks = [translator(d, target_language) for d in cut_box.values()]
    translated_dicts = await asyncio.gather(*tasks)

    translated_texts = []
    for translated_dict in translated_dicts:
        translated_texts.extend(translated_dict.values())

    result = {"strs": translated_texts, "language": target_language}
    return result

if __name__ == "__main__":
    input_dict = {
        "strs": ["{", "    \"0\": \"[ - ]\",", "    \"1\": \"[ + ]\",", "    \"2\": \"PyTorch 모듈 프로파일링하기\",", "    \"3\": \"Introduction to Holistic Trace Analysis\",", "    \"4\": \"Trace Diff using Holistic Trace Analysis\",", "    \"5\": \"Code Transforms with FX\",", "    \"6\": \"[ - ]\",", "    \"7\": \"[ + ]\",", "    \"8\": \"(베타) FX에서 합성곱/배치 정규화(Convolution/Batch Norm) 결합기(Fuser) 만들기\",", "    \"9\": \"(beta) Building a Simple CPU Performance Profiler with FX\",", "    \"10\": \"프론트엔드 API\",", "    \"11\": \"[ - ]\",", "    \"12\": \"[ + ]\",", "    \"13\": \"(베타) PyTorch를 사용한 Channels Last 메모리 형식\",", "    \"14\": \"Forward-mode Automatic Differentiation (Beta)\",", "    \"15\": \"Jacobians, Hessians, hvp, vhp, and more: composing function transforms\",", "    \"16\": \"모델 앙상블\",", "    \"17\": \"Per-sample-gradients\",", "    \"18\": \"PyTorch C++ 프론트엔드 사용하기\",", "    \"19\": \"TorchScript의 동적 병렬 처리(Dynamic Parallelism)\",", "    \"20\": \"C++ 프론트엔드의 자동 미분 (autograd)\",", "    \"21\": \"PyTorch 확장하기\",", "    \"22\": \"[ - ]\",", "    \"23\": \"[ + ]\",", "    \"24\": \"Double Backward with Custom Functions\",", "    \"25\": \"Fusing Convolution and Batch Norm using Custom Function\",", "    \"26\": \"Custom C++ and CUDA Extensions\",", "    \"27\": \"Extending TorchScript with Custom C++ Operators\",", "    \"28\": \"커스텀 C++ 클래스로 TorchScript 확장하기\",", "    \"29\": \"Registering a Dispatched Operator in C++\",", "    \"30\": \"Extending dispatcher for a new backend in C++\",", "    \"31\": \"Facilitating New Backend Integration by PrivateUse1\",", "    \"32\": \"모델 최적화\",", "    \"33\": \"[ - ]\",", "    \"34\": \"[ + ]\",", "    \"35\": \"PyTorch 모듈 프로파일링하기\",", "    \"36\": \"텐서보드를 이용한 파이토치 프로파일러\",", "    \"37\": \"Ray Tune을 사용한 하이퍼파라미터 튜닝\",", "    \"38\": \"배포를 위해 비전 트랜스포머(Vision Transformer) 모델 최적화하기\",", "    \"39\": \"Parametrizations Tutorial\",", "    \"40\": \"가지치기 기법(Pruning) 튜토리얼\",", "    \"41\": \"(베타) LSTM 기반 단어 단위 언어 모델의 동적 양자화\",", "    \"42\": \"(베타) BERT 모델 동적 양자화하기\",", "    \"43\": \"(베타) 컴퓨터 비전 튜토리얼을 위한 양자화된 전이학습(Quantized Transfer Learning)\",", "    \"44\": \"(베타) PyTorch에서 Eager Mode를 이용한 정적 양자화\",", "    \"45\": \"Grokking PyTorch Intel CPU performance from first principles\",", "    \"46\": \"Grokking PyTorch Intel CPU performance from first principles (Part 2)\",", "    \"47\": \"Getting Started - Accelerate Your Scripts with nvFuser\",", "    \"48\": \"Multi-Objective NAS with Ax\",", "    \"49\": \"Introduction to\",", "    \"50\": \"Inductor CPU backend debugging and profiling\",", "    \"51\": \"(Beta) Scaled Dot Product Attention (SDPA)로 고성능 트랜스포머(Transformers) 구현하기\",", "    \"52\": \"과 함께 SDPA 사용하기\",", "    \"53\": \"SDPA를하위 클래스와 사용하기\",", "    \"54\": \"결론\",", "    \"55\": \"Knowledge Distillation Tutorial\",", "    \"56\": \"병렬 및 분산 학습\",", "    \"57\": \"[ - ]\",", "    \"58\": \"[ + ]\",", "    \"59\": \"Distributed and Parallel Training Tutorials\",", "    \"60\": \"PyTorch Distributed Overview\",", "    \"61\": \"Distributed Data Parallel in PyTorch - Video Tutorials\",", "    \"62\": \"단일 머신을 사용한 모델 병렬화 모범 사례\",", "    \"63\": \"분산 데이터 병렬 처리 시작하기\",", "    \"64\": \"PyTorch로 분산 어플리케이션 개발하기\",", "    \"65\": \"Getting Started with Fully Sharded Data Parallel(FSDP)\",", "    \"66\": \"Advanced Model Training with Fully Sharded Data Parallel (FSDP)\",", "    \"67\": \"Large Scale Transformer model training with Tensor Parallel (TP)\",", "    \"68\": \"Cpp 확장을 사용한 프로세스 그룹 백엔드 사용자 정의\",", "    \"69\": \"Getting Started with Distributed RPC Framework\",", "    \"70\": \"Implementing a Parameter Server Using Distributed RPC Framework\",", "    \"71\": \"Distributed Pipeline Parallelism Using RPC\",", "    \"72\": \"Implementing Batch RPC Processing Using Asynchronous Executions\",", "    \"73\": \"분산 데이터 병렬(DDP)과 분산 RPC 프레임워크 결합\",", "    \"74\": \"분산  데이터 병렬 처리와 병렬 처리 파이프라인을 사용한 트랜스포머 모델 학습\",", "    \"75\": \"Distributed Training with Uneven Inputs Using the Join Context Manager\",", "    \"76\": \"Edge with ExecuTorch\",", "    \"77\": \"[ - ]\",", "    \"78\": \"[ + ]\",", "    \"79\": \"Exporting to ExecuTorch Tutorial\",", "    \"80\": \"Running an ExecuTorch Model in C++ Tutorial\",", "    \"81\": \"Using the ExecuTorch SDK to Profile a Model\",", "    \"82\": \"Building an ExecuTorch iOS Demo App\",", "    \"83\": \"Building an ExecuTorch Android Demo App\",", "    \"84\": \"Lowering a Model as a Delegate\",", "    \"85\": \"추천 시스템\",", "    \"86\": \"[ - ]\",", "    \"87\": \"[ + ]\",", "    \"88\": \"TorchRec 소개\",", "    \"89\": \"Exploring TorchRec sharding\",", "    \"90\": \"Multimodality\",", "    \"91\": \"[ - ]\",", "    \"92\": \"[ + ]\"", "}"],
        "language": "ko"
    }

    print(asyncio.run(translate_text(input_dict)))
