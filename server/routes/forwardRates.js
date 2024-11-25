const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const path = require('path');

router.post('/calculate', async (req, res) => {
  try {
    const { riskFreeRates, startDate, endDate } = req.body;
    
    // 엑셀 파일 경로 설정
    const excelPath = path.join("C:", "Users", "user", "OneDrive", "바탕 화면", "P-job", "옵셩평가사이트", "Bootstrapping.xlsx");
    
    // 엑셀 파일 읽기
    const workbook = XLSX.readFile(excelPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]; // 첫 번째 시트 사용
    
    // B열에 국고채 금리 데이터 입력
    Object.values(riskFreeRates).forEach((rate, index) => {
      const cell = XLSX.utils.encode_cell({ r: index + 1, c: 1 }); // B2부터 시작
      worksheet[cell] = { v: rate / 100, t: 'n' }; // 퍼센트 값으로 변환
    });
    
    // 평가기간의 주수 계산
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    const weeksDiff = Math.ceil((endDateTime - startDateTime) / (7 * 24 * 60 * 60 * 1000));
    
    // 계산 결과 추출 (30~33행)
    const results = [];
    for (let i = 0; i < weeksDiff; i++) {
      const yearlyRateCell = XLSX.utils.encode_cell({ r: 29, c: i }); // 30행
      const weeklyRateCell = XLSX.utils.encode_cell({ r: 30, c: i }); // 31행
      const discountFactorCell = XLSX.utils.encode_cell({ r: 31, c: i }); // 32행
      
      results.push({
        week: i + 1,
        yearlyRate: worksheet[yearlyRateCell]?.v || 0,
        weeklyRate: worksheet[weeklyRateCell]?.v || 0,
        discountFactor: worksheet[discountFactorCell]?.v || 0
      });
    }
    
    // 결과 저장
    XLSX.writeFile(workbook, excelPath);
    
    // 결과 반환
    res.json({
      startDate,
      endDate,
      weeksDiff,
      results
    });
    
  } catch (error) {
    console.error('계산 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 