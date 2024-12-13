const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

app.post('/api/calculate', async (req, res) => {
  try {
    const { inputData } = req.body;
    
    const pythonProcess = spawn('python', [
      path.join(__dirname, 'scripts', 'run_excel_macro.py'),
      JSON.stringify(inputData)
    ]);

    let resultData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => {
      resultData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
      console.error(`Python Error: ${data}`);
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python process exited with code:', code);
        return res.status(500).json({ 
          error: 'Calculation failed', 
          details: errorData 
        });
      }

      try {
        const result = JSON.parse(resultData);
        res.json(result);
      } catch (e) {
        res.status(500).json({ 
          error: 'Failed to parse Python output',
          details: resultData
        });
      }
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.stack 
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다`);
}); 