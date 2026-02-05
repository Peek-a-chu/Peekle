import pandas as pd
from embedding_service import index_problems, clear_collection

def run():
    print("기존 데이터를 초기화하고 인덱싱을 시작합니다...")
    clear_collection()
    
    print("태그 정보가 포함된 CSV 파일에서 데이터를 가져오는 중...")
    try:
        # 1. CSV 읽기
        df = pd.read_csv('problems.csv', quotechar='"', skipinitialspace=True)
        
        # 컬럼명 소문자로 정규화
        df.columns = [c.strip().replace('"', '').replace("'", "").lower() for c in df.columns]

        # 결측치(NaN) 처리: tags가 비어있을 수 있으므로 빈 문자열로 채움
        df = df.fillna('')

        # 2. 제목 + 티어 + 태그를 합쳐서 학습 데이터 생성
        df['combined_text'] = (
            "제목: " + df['title'] + 
            ", 난이도: " + df['tier'] + 
            ", 알고리즘 유형: " + df['tags']
        )

        # 딕셔너리 리스트로 변환
        problems = df.to_dict('records')
        
        # embedding_service가 사용할 텍스트 필드를 지정하기 위해 데이터 정제
        for p in problems:
            p['document_content'] = p['combined_text']  # 학습할 내용

        total = len(problems)
        if total == 0:
            print("인덱싱할 데이터가 CSV에 없습니다.")
            return

        print(f"총 {total}개의 문제를 새로운 지식 창고(ChromaDB)에 인덱싱합니다.")
        
        # 3. 100개씩 나눠서 처리 (Batch Processing)
        batch_size = 100
        for i in range(0, total, batch_size):
            batch = problems[i : i + batch_size]
            index_problems(batch)
            
            current_pos = min(i + batch_size, total)
            print(f"진행 중... ({current_pos}/{total})")

        print("태그 기반 인덱싱 완료! 이제 훨씬 똑똑한 추천이 가능합니다.")
        
    except FileNotFoundError:
        print("problems.csv 파일을 찾을 수 없습니다.")
    except Exception as e:
        print(f"오류 발생: {e}")

if __name__ == "__main__":
    run()