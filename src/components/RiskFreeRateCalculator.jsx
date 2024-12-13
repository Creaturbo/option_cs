import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import './RiskFreeRateCalculator.css'
import ForwardRateCalculator from './ForwardRateCalculator'

export default function RiskFreeRateCalculator({ onDataCalculated, onRateCalculated }) {
  const [headers, setHeaders] = useState(['종류', '종류명', '신용등급', '고시기관', '3월', '6월', '9월', '1년', '1년6월', '2년', '2년6월', '3년', '4년', '5년', '7년', '10년', '15년', '20년', '30년', '50년'])
  
  const [tableData, setTableData] = useState([
    ['국채', '국고채권', '양곡,외평,재정', '가사 평균(\'23.1.9', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']
  ])

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        const govBondData = jsonData.find(row => 
          row[0] === '국채' && String(row[1]).includes('국고채권')
        )

        if (govBondData) {
          const numericData = govBondData.slice(4).map(value => {
            if (!value && value !== 0) return 0
            
            const num = parseFloat(String(value).replace(/,/g, ''))
            return isNaN(num) ? 0 : num
          })

          console.log('추출된 국고채 데이터:', numericData)

          setTableData([govBondData])
          
          const riskFreeRatesData = {
            headers: headers.slice(4),
            values: numericData
          }
          
          onDataCalculated(riskFreeRatesData)
        } else {
          throw new Error('국고채 데이터를 찾을 수 없습니다.')
        }
      } catch (error) {
        console.error('파일 처리 오류:', error)
        alert('파일 처리 중 오류가 발생했습니다: ' + error.message)
      }
    }

    reader.readAsArrayBuffer(file)
  }

  return (
    <div className="risk-free-rate-calculator">
      <div className="calculator-header">
        <h3>무위험 이자율 계산</h3>
      </div>

      <div className="file-upload-section">
        <label htmlFor="excel-upload" className="upload-button">
          <i className="fas fa-file-excel"></i> 엑셀 파일 업로드
        </label>
        <input 
          id="excel-upload" 
          type="file" 
          accept=".xlsx, .xls" 
          onChange={handleFileUpload}
          className="hidden-input"
        />
        <p className="description">
          KOFIA BOND 엑셀 파일을 업로드하세요
        </p>
      </div>

      <div className="table-wrapper">
        <div className="table-container">
          <table className="yields-input-table">
            <thead>
              <tr>
                {headers.map((header, index) => (
                  <th key={index}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {headers.map((_, colIndex) => (
                    <td 
                      key={colIndex}
                      className={colIndex < 4 ? 'fixed-cell' : 'editable-cell'}
                    >
                      {row[colIndex] || ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="forward-rate-section">
        <h3>주단위 선도이자율 계산</h3>
        <ForwardRateCalculator 
          riskFreeRates={{
            headers: headers.slice(4),
            values: tableData[0]?.slice(4) || []
          }}
        />
      </div>
    </div>
  )
}