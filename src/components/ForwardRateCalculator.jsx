import { useState } from 'react'
import * as XLSX from 'xlsx'
import './ForwardRateCalculator.css'

export default function ForwardRateCalculator({ spotRates }) {
  const [valuationDate, setValuationDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [forwardRates, setForwardRates] = useState([])

  const calculateWeeks = (startDate, endDate) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end - start)
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7))
    return diffWeeks
  }

  const calculateForwardRates = () => {
    if (!valuationDate || !expiryDate || !spotRates) return
    
    const totalWeeks = calculateWeeks(valuationDate, expiryDate)
    const rates = []

    // 분기별(13주) 선도이자율 계산 함수 (주황색 셀 계산)
    const calculateQuarterlyForwardRate = (quarterIndex) => {
      if (quarterIndex === 0) return spotRates[0]
      
      const t1 = (quarterIndex * 3) / 12
      const t2 = ((quarterIndex + 1) * 3) / 12
      const r1 = spotRates[quarterIndex - 1]
      const r2 = spotRates[quarterIndex]

      return (Math.pow((1 + r2/100)**t2 / (1 + r1/100)**t1, 1/(t2-t1)) - 1) * 100
    }

    // 주차별 선도이자율 계산 (선형 보간법 적용)
    for (let week = 1; week <= totalWeeks; week++) {
      const quarterIndex = Math.floor((week - 1) / 13)
      const weekInQuarter = (week - 1) % 13

      // 현재 분기와 다음 분기의 선도이자율
      const currentQuarterRate = calculateQuarterlyForwardRate(quarterIndex)
      const nextQuarterRate = quarterIndex < Math.floor(totalWeeks/13) ? 
        calculateQuarterlyForwardRate(quarterIndex + 1) : currentQuarterRate

      // 선형 보간법으로 주차별 연간 선도이자율 계산
      const yearlyRate = currentQuarterRate + 
        (nextQuarterRate - currentQuarterRate) * (weekInQuarter / 13)
      
      // 주간 선도이자율로 변환
      const weeklyRate = (Math.pow(1 + yearlyRate/100, 1/52) - 1) * 100

      rates.push({
        week,
        yearlyRate: yearlyRate.toFixed(4),
        weeklyRate: weeklyRate.toFixed(4)
      })
    }

    setForwardRates(rates)
  }

  // 금리 보간법 함수
  const interpolateRate = (yearFraction, spotRates) => {
    // 기간에 해당하는 금리 찾기
    const periods = [0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4, 5, 7, 10, 15, 20, 30, 50]
    
    // 정확한 기간이 있는 경우
    const exactIndex = periods.findIndex(p => p === yearFraction)
    if (exactIndex !== -1) return spotRates[exactIndex]

    // 보간이 필요한 경우
    const lowerIndex = periods.findIndex(p => p > yearFraction) - 1
    const upperIndex = lowerIndex + 1

    if (lowerIndex < 0) return spotRates[0] // 첫 번째 금리 사용
    if (upperIndex >= periods.length) return spotRates[spotRates.length - 1] // 마지막 금리 사용

    // 선형 보간법
    const lowerPeriod = periods[lowerIndex]
    const upperPeriod = periods[upperIndex]
    const lowerRate = spotRates[lowerIndex]
    const upperRate = spotRates[upperIndex]

    return lowerRate + 
      (yearFraction - lowerPeriod) * 
      (upperRate - lowerRate) / 
      (upperPeriod - lowerPeriod)
  }

  const renderRatesTable = () => {
    if (forwardRates.length === 0) return null

    const firstFive = forwardRates.slice(0, 5)
    const lastFive = forwardRates.slice(-5)
    
    return (
      <div className="horizontal-rates-table">
        <table>
          <thead>
            <tr>
              <th colSpan={5}>처음 5주</th>
              <th rowSpan={2}>...</th>
              <th colSpan={5}>마지막 5주</th>
            </tr>
            <tr>
              {firstFive.map(rate => <th key={`head-${rate.week}`}>Week {rate.week}</th>)}
              {lastFive.map(rate => <th key={`head-${rate.week}`}>Week {rate.week}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr>
              {firstFive.map(rate => <td key={`rate-${rate.week}`}>{rate.yearlyRate}%</td>)}
              <td>...</td>
              {lastFive.map(rate => <td key={`rate-${rate.week}`}>{rate.yearlyRate}%</td>)}
            </tr>
            <tr>
              {firstFive.map(rate => <td key={`rate-${rate.week}`}>{rate.weeklyRate}%</td>)}
              <td>...</td>
              {lastFive.map(rate => <td key={`rate-${rate.week}`}>{rate.weeklyRate}%</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  // 엑셀 다운로드 함수 추가
  const downloadExcel = () => {
    const wb = XLSX.utils.book_new()
    
    const data = [
      ['주차', '연간 선도이자율(%)', '주간 선도이자율(%)'],
      ...forwardRates.map(r => [
        `Week ${r.week}`,
        parseFloat(r.yearlyRate),
        parseFloat(r.weeklyRate)
      ])
    ]

    const ws = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, '선도이자율')
    XLSX.writeFile(wb, '선도이자율.xlsx')
  }

  return (
    <div className="forward-rate-calculator">
      <div className="calculator-header">
        <h3>주단위 선도이자율 계산</h3>
        {forwardRates.length > 0 && (
          <button 
            onClick={downloadExcel}
            className="download-button"
          >
            엑셀 다운로드
          </button>
        )}
      </div>
      
      <div className="date-inputs">
        <div className="input-field">
          <label>평가기준일</label>
          <input
            type="date"
            value={valuationDate}
            onChange={(e) => setValuationDate(e.target.value)}
          />
        </div>
        <div className="input-field">
          <label>행사종료일</label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
          />
        </div>
        <button onClick={calculateForwardRates}>선도이자율 계산</button>
      </div>

      {renderRatesTable()}
    </div>
  )
} 