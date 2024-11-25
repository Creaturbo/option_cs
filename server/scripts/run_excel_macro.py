import sys
import json
import win32com.client
import os

def run_excel_macro(input_data):
    try:
        excel = win32com.client.Dispatch("Excel.Application")
        excel.Visible = False
        
        # 엑셀 파일 경로
        workbook_path = os.path.join(os.path.dirname(__file__), '../excel-templates/your_file.xlsx')
        workbook = excel.Workbooks.Open(workbook_path)
        
        # 입력 데이터 설정
        sheet = workbook.Sheets("Input")  # 입력 시트 이름
        for key, value in input_data.items():
            sheet.Range(key).Value = value
            
        # VBA 매크로 실행
        excel.Run("YourMacroName")
        
        # 결과 읽기
        result_sheet = workbook.Sheets("Output")  # 결과 시트 이름
        results = {
            "calculated_values": result_sheet.Range("A1:A10").Value
        }
        
        workbook.Close(False)
        excel.Quit()
        
        return results
        
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    input_data = json.loads(sys.argv[1])
    result = run_excel_macro(input_data)
    print(json.dumps(result)) 