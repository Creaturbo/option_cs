import sys
import json
import os
import shutil
import logging
import xlwings as xw
from datetime import datetime

# 로깅 설정
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def calculate_weeks_between(start_date, end_date):
    """
    두 날짜 사이의 주차 수 계산
    """
    from datetime import datetime
    
    start = datetime.strptime(start_date, '%Y-%m-%d')
    end = datetime.strptime(end_date, '%Y-%m-%d')
    
    # 날짜 차이를 주 단위로 계산
    weeks = (end - start).days // 7
    return weeks + 1  # 시작일 포함

def main():
    try:
        input_str = sys.argv[1]
        input_data = json.loads(input_str)
        
        base_dir = "C:\\backend"
        original_file = os.path.join(base_dir, "Bootstrapping.xlsm")
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        copy_file = os.path.join(base_dir, f"Bootstrapping_copy_{timestamp}.xlsm")
        
        logger.debug(f"원본 파일: {original_file}")
        logger.debug(f"복사본 파일: {copy_file}")
        
        shutil.copy2(original_file, copy_file)
        
        app = xw.App(visible=False)
        app.display_alerts = False
        
        try:
            wb = app.books.open(copy_file)
            sheet = wb.sheets[0]
            
            # 국고채 데이터 업데이트
            headers = input_data['riskFreeRates']['headers']
            values = input_data['riskFreeRates']['values']
            
            for col, (header, value) in enumerate(zip(headers, values), start=2):
                sheet.range(f"{chr(64+col)}1").value = header
                sheet.range(f"{chr(64+col)}2").value = float(value)
            
            wb.save()
            
            # 주차 계산
            total_weeks = calculate_weeks_between(input_data['startDate'], input_data['endDate'])
            
            # 결과 추출 (30-33행)
            results = []
            for row in range(30, 34):
                row_data = sheet.range(f"A{row}:Z{row}").value[:total_weeks]
                results.append(row_data)
            
            print(json.dumps({
                "success": True,
                "results": results,
                "filename": os.path.basename(copy_file)
            }))
            
        finally:
            if 'wb' in locals():
                wb.save()
                wb.close()
            app.quit()
            
    except Exception as e:
        logger.error(f"오류 발생: {str(e)}", exc_info=True)
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))

if __name__ == "__main__":
    main()