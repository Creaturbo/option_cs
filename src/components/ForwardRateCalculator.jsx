import { useState } from 'react';
import './ForwardRateCalculator.css';

const ForwardRateCalculator = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [results, setResults] = useState(null);

  const handleCalculate = async () => {
    try {
      const rateData = {
        threeMonth: 1.746,
        sixMonth: 1.748,
        nineMonth: 1.748,
        oneYear: 1.755,
        oneAndHalfYear: 1.81,
        twoYear: 1.835,
        twoAndHalfYear: 1.85,
        threeYear: 1.823,
        fourYear: 1.89,
        fiveYear: 1.892,
        sevenYear: 1.964
      };

      console.log('요청 데이터:', {
        riskFreeRates: rateData,
        startDate,
        endDate
      });

      const response = await fetch('http://localhost:3001/api/forward-rates/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          riskFreeRates: rateData,
          startDate,
          endDate
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '서버 오류가 발생했습니다');
      }

      const data = await response.json();
      console.log('응답 데이터:', data);
      setResults(data.results || []);
    } catch (error) {
      console.error('계산 오류:', error);
      alert('계산 중 오류가 발생했습니다: ' + error.message);
    }
  };

  return (
    <div className="calculator-container">
      <div className="date-inputs">
        <div className="input-group">
          <label>평가기준일:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label>행사만기일:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <button 
          className="calculate-btn"
          onClick={handleCalculate}
          disabled={!startDate || !endDate}
        >
          계산하기
        </button>
      </div>

      {results && results.length > 0 && (
        <div className="results-section">
          <h3>주단위 선도이자율 계산 결과</h3>
          <table className="results-table">
            <thead>
              <tr>
                <th>주차</th>
                <th>연율화 선도이자율</th>
                <th>주단위 선도이자율</th>
                <th>할인계수</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row, index) => (
                <tr key={index}>
                  <td>{row.week}</td>
                  <td>{typeof row.yearlyRate === 'number' ? (row.yearlyRate * 100).toFixed(4) : '0.0000'}%</td>
                  <td>{typeof row.weeklyRate === 'number' ? (row.weeklyRate * 100).toFixed(4) : '0.0000'}%</td>
                  <td>{typeof row.discountFactor === 'number' ? row.discountFactor.toFixed(6) : '0.000000'}</td>
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