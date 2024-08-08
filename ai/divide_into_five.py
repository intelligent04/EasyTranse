class WordDict:
    def __init__(self, words):
        self.word_dict = {i: word for i, word in enumerate(words)}  # 단어 리스트를 인덱스와 함께 사전 형태로 저장
        
    def to_dict(self):
        return self.word_dict

    def __repr__(self):
        return f"{self.word_dict}"  # 객체를 문자열로 표현할 때 사전 형태로 출력

def divide_into_five(words_list):
    word_dicts = {}  # 결과를 저장할 사전 초기화
    len_list = len(words_list)
    
    if len_list < 3:
        for i in range(len_list):
            word_dicts[f'word_dict{i + 1}'] = WordDict([words_list[i]])
    else:  
        chunk_size = len_list // 3  # 전체 리스트를 3개로 나누기 위한 크기 계산
        remainder = len_list % 3  # 나누고 남는 나머지 계산

        start = 0
        for i in range(3):
            end = start + chunk_size + (1 if i < remainder else 0)  # 나머지를 고려하여 청크의 끝 인덱스 계산
            words_chunk = words_list[start:end]  # 리스트를 청크로 분할
            word_dicts[f'word_dict_{i + 1}'] = WordDict(words_chunk)  # 분할된 청크로 WordDict 객체 생성 후 사전에 추가
            start = end

    return word_dicts

if __name__ == "__main__":
    # words_list = [
    #     "one", "two", "three", "four", "five", 
    #     "hello", "world", "apple", "banana", 
    #     "cherry", "date", "elephant", "lion", 
    #     "tiger", "bear", "red", "blue", 
    #     "green", "yellow", "purple", "code"
    # ] 
    words_list = [
        "one", "two"
    ] 

    word_dicts = divide_into_five(words_list)  # 단어 리스트를 3개의 사전으로 나누는 함수 호출
    print(word_dicts)
    # for key, value in word_dicts.items():
    #     print(f"{key}: {value}")  # 각 사전의 키와 값을 출력