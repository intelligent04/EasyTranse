class WordDict:
    def __init__(self, words):
        self.word_dict = {i: word for i, word in enumerate(words)}

    def __repr__(self):
        return f"{self.word_dict}"

def divide_into_five(words_list):
    word_dicts = {}
    chunk_size = len(words_list) // 5
    remainder = len(words_list) % 5  # 나머지 처리용

    start = 0
    for i in range(5):
        end = start + chunk_size + (1 if i < remainder else 0)  # 나머지 분배
        words_chunk = words_list[start:end]
        word_dicts[f'word_dict_{i + 1}'] = WordDict(words_chunk)
        start = end

    return word_dicts

if __name__ == "__main__":
    words_list = [
        "one", "two", "three", "four", "five", 
        "hello", "world", "apple", "banana", 
        "cherry", "date", "elephant", "lion", 
        "tiger", "bear", "red", "blue", 
        "green", "yellow", "purple", "code"
    ]

    word_dicts = divide_into_five(words_list)
    # print(word_dicts)
    for key, value in word_dicts.items():
        print(f"{key}: {value}")
