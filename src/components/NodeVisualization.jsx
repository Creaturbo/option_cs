import { useState } from 'react'
import './NodeVisualization.css'
import * as XLSX from 'xlsx'

function NodeVisualization({ calculationResults }) {
  const [activeTab, setActiveTab] = useState('stock')

  const downloadExcel = () => {
    if (!calculationResults) return

    const wb = XLSX.utils.book_new()
    
    // 주가 트리 시트
    const stockWS = XLSX.utils.aoa_to_sheet(
      calculationResults.stockTree.map(row => 
        row.filter(val => val !== null).map(val => 
          Number(val.toFixed(2))
        )
      )
    )
    XLSX.utils.book_append_sheet(wb, stockWS, "주가트리")
    
    // 옵션가치 트리 시트
    const optionWS = XLSX.utils.aoa_to_sheet(
      calculationResults.optionTree.map(row => 
        row.filter(val => val !== null).map(val => 
          Number(val.toFixed(2))
        )
      )
    )
    XLSX.utils.book_append_sheet(wb, optionWS, "옵션가치트리")
    
    XLSX.writeFile(wb, "이항모형_트리.xlsx")
  }

  const renderTree = (treeData, title) => {
    if (!treeData || !treeData.length) return null

    // 상위 6줄만 표시
    const visibleRows = 6
    const showRows = treeData.slice(0, visibleRows)

    return (
      <div className="tree">
        <h3>{title}</h3>
        <div className="tree-grid">
          {showRows.map((row, i) => (
            <div key={i} className="tree-row">
              {row.filter(val => val !== null).map((value, j) => (
                <div key={j} className="tree-node">
                  {Number(value).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </div>
              ))}
            </div>
          ))}
          {treeData.length > visibleRows && (
            <div className="vertical-ellipsis">
              <div className="dot">.</div>
              <div className="dot">.</div>
              <div className="dot">.</div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="node-visualization">
      <div className="tab-buttons">
        <button 
          className={`tab-button ${activeTab === 'stock' ? 'active' : ''}`}
          onClick={() => setActiveTab('stock')}
        >
          주가 트리
        </button>
        <button 
          className={`tab-button ${activeTab === 'option' ? 'active' : ''}`}
          onClick={() => setActiveTab('option')}
        >
          옵션가치 트리
        </button>
      </div>

      <div className="tree-container">
        {activeTab === 'stock' 
          ? renderTree(calculationResults?.stockTree, '주가 트리')
          : renderTree(calculationResults?.optionTree, '옵션가치 트리')
        }
      </div>

      <button className="download-button" onClick={downloadExcel}>
        Excel 다운로드
      </button>
    </div>
  )
}

export default NodeVisualization 