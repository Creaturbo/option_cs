import React, { useState, useEffect } from 'react'
import './App.css'
import NodeVisualization from './components/NodeVisualization'
import VolatilityCalculator from './components/VolatilityCalculator'
import './components/VolatilityCalculator.css'
import RiskFreeRateCalculator from './components/RiskFreeRateCalculator'
import ForwardRateCalculator from './components/ForwardRateCalculator'

function App() {
  const [spotPrice, setSpotPrice] = useState(95000)    // 현재 주가
  const [strikePrice, setStrikePrice] = useState(45526) // 행사가
  const [valuationDate, setValuationDate] = useState(new Date().toISOString().split('T')[0])
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0])
  const [volatility, setVolatility] = useState(40.95)
  const [riskFreeRate, setRiskFreeRate] = useState(9)
  const [dividend, setDividend] = useState(5)
  const [shares, setShares] = useState(1000)
  const [riskFreeData, setRiskFreeData] = useState(null);
  
  // 계산 결과 상���
  const [calculationResults, setCalculationResults] = useState(null)
  const [showResults, setShowResults] = useState(false)
  const [activeTab, setActiveTab] = useState('calculator')

  // 데이터 변경 확인을 위한 useEffect 추가
  useEffect(() => {
    console.log('App의 riskFreeData 변경:', riskFreeData);
  }, [riskFreeData]);

  // 계산 함수 추가/수정
  const calculateWeeks = () => {
    const vDate = new Date(valuationDate)
    const sDate = new Date(startDate)
    const eDate = new Date(endDate)
    
    const totalWeeks = Math.round((eDate - vDate) / (7 * 24 * 60 * 60 * 1000))
    const startWeeks = Math.round((sDate - vDate) / (7 * 24 * 60 * 60 * 1000))
    
    return { totalWeeks, startWeeks }
  }

  const calculateBinomialOption = () => {
    const dt = 1 / 52
    const vol = volatility
    const r = riskFreeRate
    const d = dividend
    
    const { totalWeeks, startWeeks } = calculateWeeks()
    
    const u = Math.exp((vol/100) * Math.sqrt(dt))
    const down = 1 / u
    
    const p = (Math.exp(((r-d)/100) * dt) - down) / (u - down)
    
    let stPrice = Array(totalWeeks + 2).fill().map(() => Array(totalWeeks + 2).fill(null))
    let optValue = Array(totalWeeks + 2).fill().map(() => Array(totalWeeks + 2).fill(null))
    
    for (let i = 0; i <= totalWeeks; i++) {
      for (let j = 0; j <= i; j++) {
        stPrice[i][j] = spotPrice * Math.pow(u, j) * Math.pow(down, i-j)
      }
    }
    
    for (let j = 0; j <= totalWeeks; j++) {
      optValue[totalWeeks][j] = Math.max(stPrice[totalWeeks][j] - strikePrice, 0)
    }
    
    for (let i = totalWeeks - 1; i >= 0; i--) {
      for (let j = 0; j <= i; j++) {
        const discountFactor = Math.exp((-r/100) * dt)
        const expectedValue = p * optValue[i+1][j+1] + (1-p) * optValue[i+1][j]
        
        if (i >= startWeeks) {
          const immediateExercise = Math.max(stPrice[i][j] - strikePrice, 0)
          optValue[i][j] = Math.max(discountFactor * expectedValue, immediateExercise)
        } else {
          optValue[i][j] = discountFactor * expectedValue
        }
      }
    }
    
    return {
      optionValue: optValue[0][0],
      stockTree: stPrice,
      optionTree: optValue,
      upProbability: p,
      downProbability: 1-p,
      upFactor: u,
      downFactor: down,
      totalNodes: totalWeeks,
      startNode: startWeeks
    }
  }

  const calculateBlackScholes = () => {
    const t = calculateWeeks().totalWeeks / 52  // 주단위를 연단위로 변환
    const vol = volatility / 100
    const r = riskFreeRate / 100
    const d = dividend / 100
    
    const d1 = (Math.log(spotPrice / strikePrice) + 
      (r - d + vol * vol / 2) * t) / 
      (vol * Math.sqrt(t))
    const d2 = d1 - vol * Math.sqrt(t)

    const Nd1 = normalCDF(d1)
    const Nd2 = normalCDF(d2)

    const callPrice = spotPrice * Math.exp(-d * t) * Nd1 - 
      strikePrice * Math.exp(-r * t) * Nd2

    return callPrice
  }

  const normalCDF = (x) => {
    let t = 1 / (1 + 0.2316419 * Math.abs(x))
    let d = 0.3989423 * Math.exp(-x * x / 2)
    let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
    return x > 0 ? 1 - p : p
  }

  // 계산 버튼 클릭 핸들러 수정
  const handleCalculate = () => {
    const results = calculateBinomialOption()
    const bsValue = calculateBlackScholes()
    
    // 블랙숄즈 결과 추가
    results.blackScholesValue = bsValue
    
    // 모델 간 차이 계산
    results.difference = Math.abs(results.optionValue - bsValue)
    results.differencePercent = (results.difference / results.optionValue) * 100
    
    setCalculationResults(results)
    setShowResults(true)  // 결과 표시 상태 설정
  }

  const handleVolatilityClick = () => {
    setActiveTab('volatility')
  }

  const handleVolatilityCalculated = (newVolatility) => {
    setVolatility(newVolatility)
  }

  const handleRateCalculated = (rate) => {
    setRiskFreeRate(rate)
  }

  const handleRiskFreeDataCalculated = (data) => {
    console.log('국고채 데이터 수신:', data);
    setRiskFreeData(data);
  };

  return (
    <div className="app-container">
      <div className="content-wrapper">
        <h1>스톡옵션 가치평가 계산기</h1>
        
        <div className="tab-buttons">
          <button 
            className={activeTab === 'calculator' ? 'active' : ''}
            onClick={() => setActiveTab('calculator')}
          >
            옵션 계산
          </button>
          <button 
            className={activeTab === 'volatility' ? 'active' : ''}
            onClick={() => setActiveTab('volatility')}
          >
            변동성 계산
          </button>
          <button 
            className={activeTab === 'riskFreeRate' ? 'active' : ''}
            onClick={() => setActiveTab('riskFreeRate')}
          >
            무위험이자율 계산
          </button>
        </div>

        <div className="main-content">
          {activeTab === 'calculator' ? (
            <div className="calculator-container">
              <div className="input-group">
                <label>
                  현가기준일:
                  <input 
                    type="date" 
                    value={valuationDate}
                    onChange={(e) => setValuationDate(e.target.value)}
                  />
                </label>
                <label>
                  행사시작일:
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </label>
                <label>
                  행사종료일:
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </label>
                <label>
                  현재 주가:
                  <input 
                    type="number" 
                    value={spotPrice} 
                    onChange={(e) => setSpotPrice(Number(e.target.value))}
                  />
                </label>
                <label>
                  행사가:
                  <input 
                    type="number" 
                    value={strikePrice} 
                    onChange={(e) => setStrikePrice(Number(e.target.value))}
                  />
                </label>
                <label>
                  변동성:
                  <button onClick={handleVolatilityClick}>
                    {volatility ? `${volatility.toFixed(2)}%` : '변동성 계산하기'}
                  </button>
                </label>
                <label>
                  무위험 이자율(%):
                  <input 
                    type="number" 
                    step="0.01"
                    value={riskFreeRate} 
                    onChange={(e) => setRiskFreeRate(Number(e.target.value))}
                  />
                </label>
                <label>
                  기대배당률(%):
                  <input 
                    type="number" 
                    step="0.01"
                    value={dividend} 
                    onChange={(e) => setDividend(Number(e.target.value))}
                  />
                </label>
                <label>
                  총 부여주식수:
                  <input 
                    type="number" 
                    value={shares} 
                    onChange={(e) => setShares(Number(e.target.value))}
                  />
                </label>
              </div>
              
              <div className="calculate-button">
                <button 
                  onClick={handleCalculate}
                  className="calculate-btn"
                >
                  계산하기
                </button>
              </div>

              {showResults && calculationResults && (
                <div className="result">
                  <h2>계산 결과</h2>
                  <div className="parameters">
                    <h3>이항모형 파라미터</h3>
                    <table>
                      <tbody>
                        <tr>
                          <td>주단위 총 노 수</td>
                          <td>{calculationResults.totalNodes}</td>
                        </tr>
                        <tr>
                          <td>행사시작일 Node</td>
                          <td>{calculationResults.startNode}</td>
                        </tr>
                        <tr>
                          <td>상승확률(up)</td>
                          <td>{calculationResults.upProbability.toFixed(5)}</td>
                        </tr>
                        <tr>
                          <td>하락확률(down)</td>
                          <td>{calculationResults.downProbability.toFixed(5)}</td>
                        </tr>
                        <tr>
                          <td>상승계수(u)</td>
                          <td>{calculationResults.upFactor.toFixed(5)}</td>
                        </tr>
                        <tr>
                          <td>하락계수(d)</td>
                          <td>{calculationResults.downFactor.toFixed(5)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="valuation-results">
                    <h3>가치평가 결과 비교</h3>
                    <table>
                      <thead>
                        <tr>
                          <th>모델</th>
                          <th>단위당 가치</th>
                          <th>총 보상비용</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>이항모형</td>
                          <td>{calculationResults.optionValue.toFixed(2)}원</td>
                          <td>{(calculationResults.optionValue * shares).toLocaleString()}원</td>
                        </tr>
                        <tr>
                          <td>블랙숄즈</td>
                          <td>{calculationResults.blackScholesValue.toFixed(2)}원</td>
                          <td>{(calculationResults.blackScholesValue * shares).toLocaleString()}원</td>
                        </tr>
                      </tbody>
                    </table>
                    
                    <div className="model-comparison">
                      <h4>모델 간 차이</h4>
                      <p>절대값: {calculationResults.difference.toFixed(2)}원</p>
                      <p>상대값: {calculationResults.differencePercent.toFixed(2)}%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'volatility' ? (
            <VolatilityCalculator onVolatilityCalculated={handleVolatilityCalculated} />
          ) : (
            <RiskFreeRateCalculator onRateCalculated={handleRateCalculated} onDataCalculated={handleRiskFreeDataCalculated} />
          )}

          {showResults && activeTab === 'calculator' && (
            <div className="visualization-container">
              <NodeVisualization calculationResults={calculationResults} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App 