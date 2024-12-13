import { useState } from 'react';
import './ForwardRateCalculator.css';

const ForwardRateCalculator = ({ riskFreeRates }) => {
  console.log('ForwardRateCalculator가 받은 데이터:', riskFreeRates);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [results, setResults] = useState(null);
  const [headers] = useState(['주차', '연율화 선도이자율', '주단위 선도이자율', '할인계수']);
  const [excelFilename, setExcelFilename] = useState(null);
  const [error, setError] = useState(null);

  const isValidData = () => {
    return riskFreeRates && 
           Object.keys(riskFreeRates).length > 0 && 
           startDate && 
           endDate;
  };

  const handleCalculate = async () => {
    try {
      if (!isValidData()) {
        throw new Error('필요한 데이터가 모두 입력되지 않았습니다.');
      }

      const requestData = {
        riskFreeRates: riskFreeRates,
        startDate: startDate,
        endDate: endDate
      };

      console.log('서버로 보내는 데이터:', requestData);

      const response = await fetch('http://localhost:3001/api/forward-rates/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setResults(data.results);
      setExcelFilename(data.filename);
      setError(null);
    } catch (error) {
      console.error('계산 오류:', error);
      setError(error.message);
      setResults(null);
    }
  };

  const handleDownload = async () => {
    if (!excelFilename) return;
    // 다운로드 로직...
  };

  return (
    <div className="forward-rate-calculator">
      <div className="input-section">
        <div className="date-inputs">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="시작일"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="종료일"
          />
        </div>
        <button onClick={handleCalculate}>계산</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {results && (
        <div className="results-section">
          <div className="results-header">
            <h3>주단위 선도이자율 계산 결과</h3>
            {excelFilename && (
              <button 
                className="download-btn"
                onClick={handleDownload}
              >
                엑셀 다운로드
              </button>
            )}
          </div>
          <table className="results-table">
            <thead>
              <tr>
                {headers.map((header, index) => (
                  <th key={index}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((row, index) => (
                <tr key={index}>
                  <td>{row.week}주차</td>
                  <td>{(row.annualizedRate * 100).toFixed(4)}%</td>
                  <td>{(row.weeklyRate * 100).toFixed(6)}%</td>
                  <td>{row.discountFactor.toFixed(6)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ForwardRateCalculator;