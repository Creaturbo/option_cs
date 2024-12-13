const express = require('express');
const cors = require('cors');
const forwardRatesRouter = require('./routes/forwardRates');

const app = express();

// CORS 설정
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// forward-rates 라우터 연결
app.use('/api/forward-rates', forwardRatesRouter);

// 테스트용 라우트
app.get('/test', (req, res) => {
  res.json({ message: '서버가 정상적으로 실행되었습니다.' });
});

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다`);
  console.log('사용 가능한 엔드포인트:');
  console.log('- GET  http://localhost:3001/test');
  console.log('- POST http://localhost:3001/api/forward-rates/calculate');
  console.log('- GET  http://localhost:3001/api/forward-rates/download/:filename');
}); 