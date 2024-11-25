const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const forwardRatesRouter = require('./routes/forwardRates');
app.use('/api/forward-rates', forwardRatesRouter);

app.use((err, req, res, next) => {
  console.error('서버 오류:', err);
  res.status(500).json({
    error: true,
    message: err.message || '서버 오류가 발생했습니다'
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다`);
  console.log('서버 주소: http://localhost:3001');
}); 