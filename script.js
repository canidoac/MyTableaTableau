// Super Table Extension v2.0.0
// Exportación profesional de datos de Tableau

;(() => {
  // State
  let dashboard = null
  const worksheetsData = new Map()

  // DOM Elements
  const elements = {
    loading: document.getElementById("loading"),
    error: document.getElementById("error"),
    errorMessage: document.getElementById("error-message"),
    dashboardInfo: document.getElementById("dashboard-info"),
    dashboardName: document.getElementById("dashboard-name"),
    worksheetCount: document.getElementById("worksheet-count"),
    worksheetsList: document.getElementById("worksheets-list"),
    status: document.getElementById("status"),
    exportAllBtn: document.getElementById("export-all-excel"),
    exportCsvBtn: document.getElementById("export-csv"),
    refreshBtn: document.getElementById("refresh-btn"),
    retryBtn: document.getElementById("retry-btn"),
  }

  // Tableau and SheetJS variables
  const tableau = window.tableau
  const XLSX = window.XLSX

  // Initialize when DOM is ready
  document.addEventListener("DOMContentLoaded", initExtension)

  function initExtension() {
    console.log("[v0] Super Table Extension v2.0.0 iniciando...")

    // Setup event listeners
    elements.retryBtn?.addEventListener("click", initExtension)
    elements.refreshBtn?.addEventListener("click", refreshAllData)
    elements.exportAllBtn?.addEventListener("click", exportAllToExcel)
    elements.exportCsvBtn?.addEventListener("click", exportAllToCSV)

    // Check if Tableau API is available
    if (typeof tableau === "undefined" || !tableau.extensions) {
      showError(
        "La API de Tableau no está disponible. Asegúrate de cargar esta extensión dentro de Tableau Desktop o Server.",
      )
      return
    }

    // Initialize Tableau Extensions API
    tableau.extensions.initializeAsync().then(onInitialized, onInitError)
  }

  function onInitialized() {
    console.log("[v0] Extension inicializada correctamente")

    dashboard = tableau.extensions.dashboardContent.dashboard
    console.log("[v0] Dashboard:", dashboard.name)
    console.log("[v0] Worksheets:", dashboard.worksheets.length)

    // Update UI
    setStatus("Conectado", "connected")
    elements.dashboardName.textContent = dashboard.name
    elements.worksheetCount.textContent = `${dashboard.worksheets.length} hojas de trabajo disponibles`

    // Enable buttons
    elements.exportAllBtn.disabled = false
    elements.exportCsvBtn.disabled = false
    elements.refreshBtn.disabled = false

    // Load all worksheets data
    loadAllWorksheets()
  }

  function onInitError(err) {
    console.error("[v0] Error de inicialización:", err)
    showError("No se pudo conectar con Tableau: " + err.toString())
  }

  async function loadAllWorksheets() {
    showLoading()
    worksheetsData.clear()

    const worksheets = dashboard.worksheets
    console.log("[v0] Cargando datos de", worksheets.length, "worksheets...")

    try {
      // Load all worksheets in parallel
      const promises = worksheets.map(async (ws) => {
        try {
          const dataTable = await ws.getSummaryDataAsync()
          worksheetsData.set(ws.name, {
            worksheet: ws,
            columns: dataTable.columns,
            data: dataTable.data,
            totalRows: dataTable.data.length,
          })
          console.log(`[v0] ${ws.name}: ${dataTable.data.length} filas cargadas`)
        } catch (err) {
          console.warn(`[v0] Error cargando ${ws.name}:`, err)
          worksheetsData.set(ws.name, {
            worksheet: ws,
            error: err.toString(),
          })
        }
      })

      await Promise.all(promises)
      renderDashboard()
    } catch (err) {
      console.error("[v0] Error cargando worksheets:", err)
      showError("Error al cargar los datos: " + err.toString())
    }
  }

  function renderDashboard() {
    elements.loading.style.display = "none"
    elements.error.style.display = "none"
    elements.dashboardInfo.style.display = "block"

    elements.worksheetsList.innerHTML = ""

    worksheetsData.forEach((wsData, name) => {
      const card = createWorksheetCard(name, wsData)
      elements.worksheetsList.appendChild(card)
    })
  }

  function createWorksheetCard(name, wsData) {
    const card = document.createElement("div")
    card.className = "worksheet-card"

    if (wsData.error) {
      card.innerHTML = `
                <div class="worksheet-header">
                    <h3>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="3" y1="9" x2="21" y2="9"></line>
                            <line x1="9" y1="21" x2="9" y2="9"></line>
                        </svg>
                        ${escapeHtml(name)}
                    </h3>
                    <span class="row-count" style="background:#fee2e2;color:#991b1b;">Error</span>
                </div>
                <div style="padding: 16px; color: #64748b; font-size: 13px;">
                    No se pudieron cargar los datos
                </div>
            `
      return card
    }

    // Create preview table (first 5 rows)
    const previewRows = wsData.data.slice(0, 5)
    const columns = wsData.columns

    let tableHtml = "<table><thead><tr>"
    columns.forEach((col) => {
      tableHtml += `<th>${escapeHtml(col.fieldName)}</th>`
    })
    tableHtml += "</tr></thead><tbody>"

    previewRows.forEach((row) => {
      tableHtml += "<tr>"
      row.forEach((cell, idx) => {
        const isNumber = typeof cell.value === "number"
        const formattedValue = isNumber
          ? cell.value.toLocaleString("es-ES", { maximumFractionDigits: 2 })
          : escapeHtml(String(cell.value ?? ""))
        tableHtml += `<td class="${isNumber ? "number-cell" : ""}">${formattedValue}</td>`
      })
      tableHtml += "</tr>"
    })
    tableHtml += "</tbody></table>"

    card.innerHTML = `
            <div class="worksheet-header">
                <h3>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="3" y1="9" x2="21" y2="9"></line>
                        <line x1="9" y1="21" x2="9" y2="9"></line>
                    </svg>
                    ${escapeHtml(name)}
                </h3>
                <span class="row-count">${wsData.totalRows.toLocaleString()} filas</span>
            </div>
            <div class="worksheet-preview">
                ${tableHtml}
            </div>
            <div class="worksheet-actions">
                <button class="btn btn-secondary btn-sm export-single-excel" data-worksheet="${escapeHtml(name)}">
                    Excel
                </button>
                <button class="btn btn-secondary btn-sm export-single-csv" data-worksheet="${escapeHtml(name)}">
                    CSV
                </button>
            </div>
        `

    // Add event listeners for individual export
    card.querySelector(".export-single-excel").addEventListener("click", (e) => {
      exportSingleToExcel(e.target.dataset.worksheet)
    })
    card.querySelector(".export-single-csv").addEventListener("click", (e) => {
      exportSingleToCSV(e.target.dataset.worksheet)
    })

    return card
  }

  // Export functions using SheetJS for professional Excel formatting
  function exportAllToExcel() {
    console.log("[v0] Exportando todo a Excel...")

    const workbook = XLSX.utils.book_new()

    worksheetsData.forEach((wsData, name) => {
      if (wsData.error) return

      const sheetData = prepareSheetData(wsData)
      const worksheet = XLSX.utils.aoa_to_sheet(sheetData)

      // Apply column widths
      worksheet["!cols"] = wsData.columns.map((col) => ({ wch: Math.max(col.fieldName.length, 12) }))

      // Sanitize sheet name (max 31 chars, no special chars)
      const safeName = name.substring(0, 31).replace(/[\\/*?:[\]]/g, "_")
      XLSX.utils.book_append_sheet(workbook, worksheet, safeName)
    })

    const filename = `${dashboard.name}_${getTimestamp()}.xlsx`
    XLSX.writeFile(workbook, filename)
    console.log("[v0] Excel exportado:", filename)
  }

  function exportSingleToExcel(worksheetName) {
    const wsData = worksheetsData.get(worksheetName)
    if (!wsData || wsData.error) return

    const workbook = XLSX.utils.book_new()
    const sheetData = prepareSheetData(wsData)
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData)

    worksheet["!cols"] = wsData.columns.map((col) => ({ wch: Math.max(col.fieldName.length, 12) }))

    const safeName = worksheetName.substring(0, 31).replace(/[\\/*?:[\]]/g, "_")
    XLSX.utils.book_append_sheet(workbook, worksheet, safeName)

    const filename = `${worksheetName}_${getTimestamp()}.xlsx`
    XLSX.writeFile(workbook, filename)
  }

  function exportAllToCSV() {
    worksheetsData.forEach((wsData, name) => {
      if (!wsData.error) {
        exportSingleToCSV(name)
      }
    })
  }

  function exportSingleToCSV(worksheetName) {
    const wsData = worksheetsData.get(worksheetName)
    if (!wsData || wsData.error) return

    const sheetData = prepareSheetData(wsData)
    const csv = sheetData
      .map((row) =>
        row
          .map((cell) => {
            const str = String(cell ?? "")
            return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str.replace(/"/g, '""')}"` : str
          })
          .join(","),
      )
      .join("\n")

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `${worksheetName}_${getTimestamp()}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  function prepareSheetData(wsData) {
    const data = []

    // Header row
    data.push(wsData.columns.map((col) => col.fieldName))

    // Data rows
    wsData.data.forEach((row) => {
      data.push(row.map((cell) => cell.value))
    })

    return data
  }

  async function refreshAllData() {
    console.log("[v0] Actualizando datos...")
    setStatus("Actualizando...", "")
    await loadAllWorksheets()
    setStatus("Conectado", "connected")
  }

  // UI Helpers
  function showLoading() {
    elements.loading.style.display = "flex"
    elements.error.style.display = "none"
    elements.dashboardInfo.style.display = "none"
  }

  function showError(message) {
    elements.loading.style.display = "none"
    elements.error.style.display = "flex"
    elements.dashboardInfo.style.display = "none"
    elements.errorMessage.textContent = message
    setStatus("Error", "error")
  }

  function setStatus(text, className) {
    elements.status.textContent = text
    elements.status.className = "status" + (className ? " " + className : "")
  }

  function escapeHtml(str) {
    const div = document.createElement("div")
    div.textContent = str
    return div.innerHTML
  }

  function getTimestamp() {
    const now = new Date()
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`
  }
})()
