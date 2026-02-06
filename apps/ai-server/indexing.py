import pandas as pd
from embedding_service import index_problems, clear_collection

def run_auto_indexing():
    """서버 시작 시 자동으로 호출되는 초기화 함수 (clear 없이 추가만)"""
    print("[AUTO-INDEX] CSV 파일에서 데이터를 가져오는 중...")
    try:
        # 1. CSV 읽기
        df = pd.read_csv('./problems.csv', quotechar='"', skipinitialspace=True)
        
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
            print("[AUTO-INDEX] 인덱싱할 데이터가 CSV에 없습니다.")
            return

        print(f"[AUTO-INDEX] 총 {total}개의 문제를 확인합니다. (이어하기 모드)")
        
        # 3. 100개씩 나눠서 델타 인덱싱 (Delta Indexing)
        batch_size = 100
        from embedding_service import check_existing_ids, index_problems

        for i in range(0, total, batch_size):
            batch = problems[i : i + batch_size]
            batch_ids = [str(p['id']) for p in batch]
            
            # DB에 이미 있는지 확인
            existing_ids = check_existing_ids(batch_ids)
            
            # 없는 것만 골라내기
            to_index = [p for p in batch if str(p['id']) not in existing_ids]
            
            if to_index:
                index_problems(to_index)
                print(f"[INDEX] {len(to_index)}개 추가 저장 ({i + len(batch)}/{total})")
            else:
                # 100개 단위로 체크 (1000개 단위로 로그)
                if (i + batch_size) % 1000 == 0:
                    print(f"[SKIP] 이미 저장됨 ({i + batch_size}/{total})")

        print("[AUTO-INDEX] 모든 데이터 동기화 완료!")
        
    except FileNotFoundError:
        print("[ERROR] problems.csv 파일을 찾을 수 없습니다.")
        raise
    except Exception as e:
        print(f"[ERROR] 인덱싱 중 오류 발생: {e}")
        raise

def run():
    """수동 실행용 함수 - 기존 데이터 초기화 후 재인덱싱"""
    print("기존 데이터를 초기화하고 인덱싱을 시작합니다...")
    clear_collection()
    run_auto_indexing()

if __name__ == "__main__":
    run()
