const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');

router.post('/calculate', async (req, res) => {
  try {
    const { riskFreeRates, startDate, endDate } = req.body;
    
    console.log('받은 데이터:', { riskFreeRates, startDate, endDate });

    const pythonProcess = spawn('python', [
      path.resolve(__dirname, '../scripts/run_excel_macro.py'),
      JSON.stringify({
        riskFreeRates,
        startDate,
        endDate
      })
    ]);

    let result = '';
    let errorOutput = '';
    
    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('error', (error) => {
      console.error('Python 프로세스 실행 오류:', error);
      res.status(500).json({
        success: false,
        error: 'Python 스크립트 실행 중 오류가 발생했습니다.'
      });
    });

    pythonProcess.on('close', (code) => {
      console.log('Python 스크립트 종료 코드:', code);
      console.log('Python 스크립트 결과:', result);
      if (errorOutput) console.error('Python 오류:', errorOutput);

      try {
        if (code !== 0) {
          throw new Error(`Python 스크립트가 오류 코드 ${code}로 종료되었습니다.`);
        }

        const parsedResult = JSON.parse(result.trim());
        
        if (!parsedResult.success || !parsedResult.results) {
          throw new Error('유효하지 않은 결과 형식입니다.');
        }

        // 결과 데이터 변환
        const [weeks, annualRates, weeklyRates, discountFactors] = parsedResult.results;
        const formattedResults = [];

        // 첫 번째 행(weeks)을 제외하고 데이터 처리
        for (let i = 1; i < weeks.length; i++) {
          formattedResults.push({
            week: weeks[i],
            annualizedRate: annualRates[i],
            weeklyRate: weeklyRates[i],
            discountFactor: discountFactors[i]
          });
        }

        res.json({
          success: true,
          results: formattedResults,
          filename: parsedResult.filename
        });
      } catch (error) {
        console.error('결과 처리 중 오류:', error);
        res.status(500).json({
          success: false,
          error: '결과 처리 중 오류가 발생했습니다: ' + error.message
        });
      }
    });
  } catch (error) {
    console.error('요청 처리 중 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;