import { useState, useEffect } from 'react'
import './VolatilityCalculator.css'
import * as XLSX from 'xlsx'

// 상수 정의
const BASE_URL = 'https://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo'

function VolatilityCalculator({ onVolatilityCalculated }) {
  const [stockList, setStockList] = useState([{ code: '', volatility: null }])
  const [baseDate, setBaseDate] = useState('')  // 기준일
  const [periodDays, setPeriodDays] = useState(180)  // 이전 영업일 수
  const [isCustomPeriod, setIsCustomPeriod] = useState(false)
  const [stockPrices, setStockPrices] = useState([])
  const [calculatedVolatility, setCalculatedVolatility] = useState(null)
  const [isLoading, setIsLoading] = useState(false)  // 로딩 상태
  const [error, setError] = useState(null)  // 에러 상태
  const [outlierMethod, setOutlierMethod] = useState('none') // 이상치 보정 방법
  const [calculationResults, setCalculationResults] = useState({})
  
  const API_KEY = '8g21KcOWtiGuC0bk918MjBkDX49uQyNqZ%2FuwfLElmHR7dcjVpfuD5Cobfp0nKWqY1HsiI40Qric%2BqVXzdDsrbQ%3D%3D'

  const fetchStockData = async () => {
    setIsLoading(true)
    setError(null)
    const volatilities = []

    try {
      if (!baseDate) {
        throw new Error('기준일을 입력해주세요.')
      }

      const validStocks = stockList.filter(stock => stock.code.trim() !== '')
      if (validStocks.length === 0) {
        throw new Error('최소 하나의 종목코드를 입력해주세요.')
      }

      // 각 종목별로 데이터 조회 및 변동성 계산
      for (const stock of validStocks) {
        const extendedDays = Math.ceil((periodDays + 1) * 1.5)
        const tempDate = new Date(baseDate)
        tempDate.setDate(tempDate.getDate() - extendedDays + 1)
        const startDateStr = tempDate.toISOString().split('T')[0].replace(/-/g, '')
        
        // 기준일 다음날까지 포함하여 조회 (기준일 데이터를 확실히 포함하기 위해)
        const nextDate = new Date(baseDate)
        nextDate.setDate(nextDate.getDate() + 1)
        const endDateStr = nextDate.toISOString().split('T')[0].replace(/-/g, '')

        const params = {
          serviceKey: decodeURIComponent(API_KEY),
          numOfRows: (periodDays + 1).toString(),
          pageNo: '1',
          resultType: 'xml',
          beginBasDt: startDateStr,
          endBasDt: endDateStr,  // 기준일 다음날까지 조회
          likeSrtnCd: stock.code
        }

        const queryString = Object.entries(params)
          .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
          .join('&')

        const finalUrl = `${BASE_URL}?${queryString}`
        console.log('API 요청 URL:', finalUrl)

        const response = await fetch(finalUrl)
        const xmlText = await response.text()
        
        // XML 파싱
        const parser = new DOMParser()
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml')
        
        // items 먼저 정의
        const items = Array.from(xmlDoc.querySelectorAll('item'))
        
        // API 응답 데이터 확인
        console.log('API Response:', {
          baseDate: endDateStr,
          totalItems: items.length,
          firstItem: items[0] ? {
            date: items[0].querySelector('basDt')?.textContent,
            price: items[0].querySelector('clpr')?.textContent
          } : null,
          lastItem: items[items.length - 1] ? {
            date: items[items.length - 1].querySelector('basDt')?.textContent,
            price: items[items.length - 1].querySelector('clpr')?.textContent
          } : null
        })

        // 데이터 파싱
        const stockData = items.map(item => ({
          basDt: item.querySelector('basDt')?.textContent,
          clpr: parseFloat(item.querySelector('clpr')?.textContent || '0')
        })).filter(item => {
          return item.basDt && !isNaN(item.clpr) && item.clpr > 0
        })

        // 날짜 내림차순 정렬 (최신순)
        const sortedData = stockData
          .sort((a, b) => b.basDt.localeCompare(a.basDt))

        // 디버깅을 위한 로그 추가
        console.log('Data Check:', {
          baseDate: baseDate,
          formattedBaseDate: baseDate.replace(/-/g, ''),
          availableDates: sortedData.map(d => d.basDt).slice(0, 5),
          totalDataCount: sortedData.length
        })

        // 정확히 181개의 데이터 선택
        const targetData = sortedData.slice(0, periodDays + 1)

        if (targetData.length < periodDays + 1) {
          throw new Error(`필요한 데이터(${periodDays + 1}일)가 부족합니다. 현재 ${targetData.length}일치 데이터만 있습니다.`)
        }

        setStockPrices(targetData)

        if (targetData.length >= periodDays + 1) {
          const volatility = await calculateVolatility(targetData, stock.code)
          if (volatility !== null) {
            volatilities.push({
              code: stock.code,
              volatility: Number(volatility)
            })
          }
        }
      }

      // 평균 변동성 계산 수정
      if (volatilities.length > 0) {
        const sum = volatilities.reduce((acc, curr) => acc + curr.volatility, 0)
        const avgVolatility = (sum / volatilities.length).toFixed(2)
        
        console.log('개별 변동성:', volatilities.map(v => v.volatility)) // 디버깅용
        console.log('합계:', sum)
        console.log('평균:', avgVolatility)

        setCalculatedVolatility(avgVolatility)
        onVolatilityCalculated?.(Number(avgVolatility))
      }

      // 각 종목의 변동성 저장
      setStockList(stockList.map(stock => ({
        ...stock,
        volatility: volatilities.find(v => v.code === stock.code)?.volatility || null
      })))

    } catch (error) {
      console.error('API 오류:', error)
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateQuartile = (data, quartile) => {
    const sorted = [...data].sort((a, b) => a - b)
    const pos = (sorted.length - 1) * quartile
    const base = Math.floor(pos)
    const rest = pos - base
    
    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base])
    } else {
      return sorted[base]
    }
  }

  const removeOutliers = (returns, logReturns, method) => {
    if (method === 'none') {
      // 이상치 보정 없음
      const stdDev = Math.sqrt(
        logReturns.reduce((sum, val) => sum + Math.pow(val - logReturns.reduce((a, b) => a + b, 0) / logReturns.length, 2), 0) / 
        (logReturns.length - 1)
      )
      return { stdDev }
    } else if (method === 'iqr') {
      // IQR Method
      const q1 = calculateQuartile(returns, 0.25)
      const q3 = calculateQuartile(returns, 0.75)
      
      // 일성장률로 범위 체크, 해당하는 로그수익률 값 사용
      const validValues = returns.map((value, index) => {
        return (value >= q1 && value <= q3) ? logReturns[index] : undefined
      }).filter(val => val !== undefined)
      
      if (validValues.length <= 1) return { stdDev: 0 }

      const filteredMean = validValues.reduce((a, b) => a + b, 0) / validValues.length
      const newStdDev = Math.sqrt(
        validValues.reduce((sum, val) => sum + Math.pow(val - filteredMean, 2), 0) / 
        (validValues.length - 1)
      )

      return { stdDev: newStdDev }
    } else if (method === 'msd') {
      // MSD Method - 기존 코드 유지
      const originalMean = returns.reduce((a, b) => a + b, 0) / returns.length
      const originalStdDev = Math.sqrt(
        returns.reduce((sum, val) => sum + Math.pow(val - originalMean, 2), 0) / (returns.length - 1)
      )

      const validValues = returns.map((value, index) => {
        const condition1 = value >= originalMean - 2.5 * originalStdDev
        const condition2 = value <= originalMean + 2.5 * originalStdDev
        return (condition1 && condition2) ? logReturns[index] : undefined
      }).filter(val => val !== undefined)
      
      if (validValues.length <= 1) return { stdDev: 0 }

      const filteredMean = validValues.reduce((a, b) => a + b, 0) / validValues.length
      const newStdDev = Math.sqrt(
        validValues.reduce((sum, val) => sum + Math.pow(val - filteredMean, 2), 0) / 
        (validValues.length - 1)
      )

      return { stdDev: newStdDev }
    }
  }

  const calculateVolatility = (data, stockCode) => {
    try {
      const returns = []      // 일성장률
      const logReturns = []   // 로그수익률
      const dates = []
      const prices = []
      
      // 일성장률과 로그수익률 모두 계산
      for (let i = 0; i < periodDays; i++) {
        if (data[i].clpr && data[i+1].clpr && data[i+1].clpr !== 0) {
          dates.push(data[i].basDt)
          prices.push(data[i].clpr)
          
          // 일성장률 계산 (Q31/Q32)
          const dailyReturn = data[i].clpr / data[i+1].clpr
          returns.push(dailyReturn)
          
          // 로그수익률 계산 (LN(R31))
          const logReturn = Math.log(dailyReturn)
          logReturns.push(logReturn)
        }
      }

      // MSD 계산 시 일성장률로 범위 체크, 로그수익률 값 사용
      const { stdDev } = removeOutliers(returns, logReturns, outlierMethod)
      
      const annualizedVol = stdDev * Math.sqrt(252) * 100
      
      setCalculationResults(prev => ({
        ...prev,
        [stockCode]: {
          returns,
          logReturns,
          dates,
          prices
        }
      }))

      return annualizedVol

    } catch (error) {
      console.error('변동성 계산 오류:', error)
      return null
    }
  }

  const downloadExcel = () => {
    try {
      const validStocks = stockList.filter(stock => stock.volatility)
      if (validStocks.length === 0 || Object.keys(calculationResults).length === 0) {
        throw new Error('계산 결과가 없습니다.')
      }

      const wb = XLSX.utils.book_new()
      
      // 각 종목별 시트 생성
      validStocks.forEach(stock => {
        const stockData = calculationResults[stock.code]
        if (stockData) {
          const { returns, logReturns, dates, prices } = stockData
          
          const stockSheetData = [
            ['종목코드', stock.code],
            ['기준일자', baseDate],
            ['데이터 수', dates.length.toString()],
            ['이상치 보정', outlierMethod === 'none' ? '없음' : 
                          outlierMethod === 'iqr' ? 'IQR Method' : 'MSD Method'],
            ['변동성', `${stock.volatility}%`],
            [],
            ['일자', '종가', '일간수익률', '보정된 수익률', '수익률^2']
          ]

          dates.forEach((date, index) => {
            const price = prices[index]
            const originalReturn = index < returns.length ? returns[index] : null
            const isIncluded = originalReturn !== null && logReturns.includes(originalReturn)
            
            stockSheetData.push([
              date,
              price,
              originalReturn !== null ? originalReturn : '',  // 기준일의 경우 수익률 없음
              isIncluded ? originalReturn : originalReturn !== null ? '제외됨' : '',
              isIncluded ? Math.pow(originalReturn, 2) : ''  // 수익률의 제곱값 계산
            ])
          })

          const ws = XLSX.utils.aoa_to_sheet(stockSheetData)
          XLSX.utils.book_append_sheet(wb, ws, `${stock.code}`)
        }
      })

      // 평균 변동성 시트 추가
      const avgSheetData = [
        ['평균 변동성 계산 결과'],
        [],
        ['기준일자', baseDate],
        ['조회 기간', `${periodDays} 영업일`],
        ['이상치 보정', outlierMethod === 'none' ? '없음' : 
                      outlierMethod === 'iqr' ? 'IQR Method' : 'MSD Method'],
        [],
        ['개별 종목 변동성'],
        ['종목코드', '변동성'],
        ...validStocks.map(stock => [
          stock.code,
          `${stock.volatility}%`
        ]),
        [],
        ['평균 변동성', `${calculatedVolatility}%`],
        ['(개별 종목 변동성의 산술평균)']
      ]

      const avgWs = XLSX.utils.aoa_to_sheet(avgSheetData)
      XLSX.utils.book_append_sheet(wb, avgWs, '평균변동성')

      XLSX.writeFile(wb, `변동성계산_${baseDate}.xlsx`)

    } catch (error) {
      console.error('엑셀 다운로드 실패:', error)
      setError('엑셀 파일 생성 중 오류가 발생했습니다.')
    }
  }

  useEffect(() => {
    if (stockPrices.length > 0) {
      calculateVolatility(stockPrices)
    }
  }, [stockPrices, outlierMethod])

  // 종목 추가/제거 함수
  const addStock = () => {
    setStockList([...stockList, { code: '', volatility: null }])
  }

  const removeStock = (index) => {
    if (stockList.length > 1) {
      setStockList(stockList.filter((_, i) => i !== index))
    }
  }

  // 종목코드 변경 핸들러
  const handleStockCodeChange = (index, code) => {
    const newList = [...stockList]
    newList[index].code = code
    setStockList(newList)
  }

  return (
    <div className="volatility-calculator">
      <div className="tabs">
        <button className="tab active">변동성 계산</button>
      </div>

      <div className="calculator-content">
        {/* 공통 설정 영역 */}
        <div className="common-settings">
          <div className="input-group">
            <label>
              기준일:
              <input 
                type="date" 
                value={baseDate}
                onChange={(e) => setBaseDate(e.target.value)}
              />
            </label>
          </div>

          <div className="input-group">
            <label>
              조회 기간 (영업일):
              <select 
                value={isCustomPeriod ? 'custom' : periodDays}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setIsCustomPeriod(true)
                  } else {
                    setIsCustomPeriod(false)
                    setPeriodDays(Number(e.target.value))
                  }
                }}
              >
                <option value={180}>180일</option>
                <option value={252}>252일</option>
                <option value={360}>360일</option>
                <option value="custom">직접입력</option>
              </select>
            </label>
            {isCustomPeriod && (
              <input
                type="number"
                value={periodDays}
                onChange={(e) => {
                  const value = Number(e.target.value)
                  if (value > 0) {
                    setPeriodDays(value)
                  }
                }}
                min="1"
                style={{ marginLeft: '10px', width: '80px' }}
                placeholder="영업일수"
              />
            )}
          </div>

          <div className="input-group">
            <label>
              이상치 보정:
              <select 
                value={outlierMethod}
                onChange={(e) => setOutlierMethod(e.target.value)}
              >
                <option value="none">이상치 보정없음</option>
                <option value="iqr">IQR Method: 정상 범위 50%</option>
                <option value="msd">MSD Method: 표준편차 기준 2.5배수 범위</option>
              </select>
            </label>
          </div>
        </div>

        {/* 종목 리스트 영역 */}
        <div className="stock-list">
          {stockList.map((stock, index) => (
            <div key={index} className="stock-item">
              <div className="input-group">
                <label>
                  종목코드:
                  <input 
                    type="text" 
                    value={stock.code}
                    onChange={(e) => handleStockCodeChange(index, e.target.value)}
                    placeholder="예: 005930"
                  />
                </label>
                {stockList.length > 1 && (
                  <button 
                    className="remove-stock"
                    onClick={() => removeStock(index)}
                  >
                    삭제
                  </button>
                )}
              </div>
            </div>
          ))}
          
          <button className="add-stock" onClick={addStock}>
            종목 추가
          </button>
        </div>

        <div className="button-group">
          <button 
            className="fetch-button" 
            onClick={fetchStockData}
            disabled={isLoading}
          >
            {isLoading ? '데이터 조회 중...' : '주가 데이터 조회'}
          </button>
        </div>

        {isLoading && (
          <div className="status-message loading">
            <span className="spinner"></span>
            데이터를 조회하고 있습니다...
          </div>
        )}

        {error && (
          <div className="status-message error">
            ⚠️ {error}
          </div>
        )}

        {calculatedVolatility && !error && (
          <div className="result">
            <h4>변동성 계산 결과</h4>
            <div className="result-details">
              <p>기준일: {baseDate}</p>
              <p>조회 기간: {periodDays} 영업일</p>
              <p>이상치 보정: {
                outlierMethod === 'none' ? '없음' :
                outlierMethod === 'iqr' ? 'IQR Method: 정상 범위 50%' :
                'MSD Method: 표준편차 기준 2.5배수 범위'
              }</p>
              
              {/* 각 종목별 변동성 표시 */}
              <div className="individual-volatilities">
                <h5>개 목 변동성</h5>
                {stockList.map((stock, index) => (
                  stock.volatility && (
                    <p key={index}>종목코 {stock.code}: {stock.volatility.toFixed(2)}%</p>
                  )
                ))}
              </div>
              
              {/* 평균 변동성 표시 */}
              <p className="volatility average">
                <strong>평균 변동성: {calculatedVolatility}%</strong>
                <br />
                <small>(개별 종목 변동성의 산술평균)</small>
              </p>
            </div>
            <button 
              className="download-button"
              onClick={downloadExcel}
              disabled={!calculatedVolatility}
            >
              엑셀 다운로드
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default VolatilityCalculator 