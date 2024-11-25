const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// 엑셀 계산 요청을 처리하는 라우트
app.post('/api/calculate', async (req, res) => {
  try {
    const { inputData } = req.body;
    
    // Python 스크립트를 사용하여 엑셀 매크로 실행
    const pythonProcess = spawn('python', [
      path.join(__dirname, 'scripts/run_excel_macro.py'),
      JSON.stringify(inputData)
    ]);

    let result = '';

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`Error: ${data}`);
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).json({ error: 'Calculation failed' });
      }
      res.json({ result: JSON.parse(result) });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 