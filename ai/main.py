from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder, HumanMessagePromptTemplate
from langchain.schema.runnable import RunnablePassthrough
import os
from dotenv import load_dotenv

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
""".strip()

prompt = ChatPromptTemplate.from_messages(
    [
        ("system", system_prompt_str),
        MessagesPlaceholder(variable_name="chat_history"),
        HumanMessagePromptTemplate.from_template("{input}")
    ]
)

# Create a chain using RunnablePassthrough
chain = RunnablePassthrough() | prompt | llm

# Function to translate text
def translate_text(text, target_language):
    input_text = f"Translate the following text into {target_language}:\n\n{text}"
    result = chain.invoke({"input": input_text, "chat_history": []})
    return result.content

# Example usage
text_to_translate = """
Many organizations spanning different sizes and industry verticals still rely on large volumes of documents to run their day-to-day operations. To solve this business challenge, customers are using intelligent document processing services from AWS such as Amazon Textract and Amazon Comprehend to help with extraction and process automation. Before you can extract text, key-value pairs, tables, and entities, you need to be able to split multipage PDF documents that often contain heterogeneous form types. For example, in mortgage processing, a broker or loan processing individual may need to split a consolidated PDF loan package, containing the mortgage application (Fannie Mae form 1003), W2s, income verification, 1040 tax forms, and more.

To tackle this problem, organizations use rules-based processing: identifying document types via form titles, page numbers, form lengths, and so on. These approaches are error-prone and difficult to scale, especially when the form types may have several variations. Accordingly, these workarounds break down quickly in practice and increase the need for human intervention.

In this post, we show how you can create your own document splitting solution with little code for any set of forms, without building custom rules or processing workflows.
"""

translated_text = translate_text(text_to_translate, "Korean")
print(translated_text)