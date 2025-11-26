const tableau = window.tableau // Declare the tableau variable
let worksheet = null
let dataTable = null
const conditionalFormats = []
const tableConfig = {
  showTotals: false,
  alternatingRows: true,
  showBorders: true,
}

// Inicializar la extensión de Tableau
tableau.extensions.initializeAsync().then(
  () => {
    console.log("Extensión inicializada correctamente")
    worksheet = tableau.extensions.dashboardContent.dashboard.worksheets[0]
    loadData()
    setupEventListeners()
  },
  (err) => {
    console.error("Error al inicializar:", err)
    document.getElementById("loading").textContent = "Error al inicializar la extensión"
  },
)

function setupEventListeners() {
  document.getElementById("configure-btn").addEventListener("click", toggleConfigPanel)
  document.getElementById("close-config").addEventListener("click", toggleConfigPanel)
  document.getElementById("export-csv").addEventListener("click", exportToCSV)
  document.getElementById("export-excel").addEventListener("click", exportToExcel)
  document.getElementById("refresh-btn").addEventListener("click", loadData)

  document.getElementById("show-totals").addEventListener("change", (e) => {
    tableConfig.showTotals = e.target.checked
    renderTable()
  })

  document.getElementById("alternating-rows").addEventListener("change", (e) => {
    tableConfig.alternatingRows = e.target.checked
    renderTable()
  })

  document.getElementById("show-borders").addEventListener("change", (e) => {
    tableConfig.showBorders = e.target.checked
    document.getElementById("data-table").style.border = e.target.checked ? "1px solid #e1e8ed" : "none"
  })

  document.getElementById("add-format").addEventListener("click", addConditionalFormat)
}

function toggleConfigPanel() {
  const panel = document.getElementById("config-panel")
  panel.style.display = panel.style.display === "none" ? "block" : "none"
}

async function loadData() {
  try {
    document.getElementById("loading").style.display = "block"
    document.getElementById("data-table").style.display = "none"

    const dataTableReader = await worksheet.getSummaryDataAsync()
    dataTable = dataTableReader

    populateFormatFields()
    renderTable()

    document.getElementById("loading").style.display = "none"
    document.getElementById("data-table").style.display = "table"
  } catch (error) {
    console.error("Error cargando datos:", error)
    document.getElementById("loading").textContent = "Error al cargar datos: " + error.message
  }
}

function populateFormatFields() {
  const formatField = document.getElementById("format-field")
  formatField.innerHTML = ""

  dataTable.columns.forEach((column, index) => {
    const option = document.createElement("option")
    option.value = index
    option.textContent = column.fieldName
    formatField.appendChild(option)
  })
}

function renderTable() {
  if (!dataTable) return

  const columns = dataTable.columns
  const data = dataTable.data

  // Renderizar encabezados
  const thead = document.getElementById("table-head")
  thead.innerHTML = ""
  const headerRow = document.createElement("tr")

  columns.forEach((column, index) => {
    const th = document.createElement("th")
    th.textContent = column.fieldName
    th.className = "sortable"
    th.dataset.columnIndex = index
    th.addEventListener("click", () => sortTable(index))
    headerRow.appendChild(th)
  })

  thead.appendChild(headerRow)

  // Renderizar datos
  const tbody = document.getElementById("table-body")
  tbody.innerHTML = ""

  data.forEach((row, rowIndex) => {
    const tr = document.createElement("tr")
    if (tableConfig.alternatingRows && rowIndex % 2 === 1) {
      tr.className = "alternate"
    }

    columns.forEach((column, colIndex) => {
      const td = document.createElement("td")
      const value = row[colIndex].value
      td.textContent = formatValue(value)

      // Aplicar formato numérico
      if (typeof value === "number") {
        td.className = "number-cell"
      }

      // Aplicar formato condicional
      applyConditionalFormatting(td, value, colIndex)

      tr.appendChild(td)
    })

    tbody.appendChild(tr)
  })

  // Renderizar totales
  if (tableConfig.showTotals) {
    renderTotals()
  } else {
    document.getElementById("table-foot").innerHTML = ""
  }
}

function renderTotals() {
  const tfoot = document.getElementById("table-foot")
  tfoot.innerHTML = ""

  const totalRow = document.createElement("tr")
  const columns = dataTable.columns
  const data = dataTable.data

  columns.forEach((column, colIndex) => {
    const td = document.createElement("td")

    if (colIndex === 0) {
      td.textContent = "TOTAL"
    } else {
      // Calcular suma si es numérico
      const values = data.map((row) => row[colIndex].value).filter((v) => typeof v === "number")
      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0)
        td.textContent = formatValue(sum)
        td.className = "number-cell"
      } else {
        td.textContent = "-"
      }
    }

    totalRow.appendChild(td)
  })

  tfoot.appendChild(totalRow)
}

function formatValue(value) {
  if (value === null || value === undefined) return ""
  if (typeof value === "number") {
    return value.toLocaleString("es-ES", { maximumFractionDigits: 2 })
  }
  return value.toString()
}

function addConditionalFormat() {
  const fieldIndex = Number.parseInt(document.getElementById("format-field").value)
  const condition = document.getElementById("format-condition").value
  const value = Number.parseFloat(document.getElementById("format-value").value)
  const color = document.getElementById("format-color").value

  if (isNaN(value)) {
    alert("Por favor ingresa un valor numérico válido")
    return
  }

  conditionalFormats.push({ fieldIndex, condition, value, color })
  renderTable()

  alert("Formato condicional agregado")
}

function applyConditionalFormatting(cell, cellValue, columnIndex) {
  conditionalFormats.forEach((format) => {
    if (format.fieldIndex === columnIndex && typeof cellValue === "number") {
      let shouldApply = false

      switch (format.condition) {
        case "greater":
          shouldApply = cellValue > format.value
          break
        case "less":
          shouldApply = cellValue < format.value
          break
        case "equal":
          shouldApply = cellValue === format.value
          break
      }

      if (shouldApply) {
        cell.style.backgroundColor = format.color
        cell.className += " cell-highlight"
        // Ajustar color de texto según brillo del fondo
        const rgb = Number.parseInt(format.color.slice(1), 16)
        const brightness = ((rgb >> 16) & 0xff) * 0.299 + ((rgb >> 8) & 0xff) * 0.587 + (rgb & 0xff) * 0.114
        cell.style.color = brightness > 128 ? "#000" : "#fff"
      }
    }
  })
}

const sortState = { column: -1, ascending: true }

function sortTable(columnIndex) {
  if (sortState.column === columnIndex) {
    sortState.ascending = !sortState.ascending
  } else {
    sortState.column = columnIndex
    sortState.ascending = true
  }

  const data = dataTable.data
  data.sort((a, b) => {
    const aVal = a[columnIndex].value
    const bVal = b[columnIndex].value

    if (aVal === bVal) return 0

    let comparison = 0
    if (typeof aVal === "number" && typeof bVal === "number") {
      comparison = aVal - bVal
    } else {
      comparison = String(aVal).localeCompare(String(bVal))
    }

    return sortState.ascending ? comparison : -comparison
  })

  // Actualizar indicadores visuales
  document.querySelectorAll("#table-head th").forEach((th) => {
    th.classList.remove("sorted-asc", "sorted-desc")
  })

  const sortedHeader = document.querySelector(`#table-head th[data-column-index="${columnIndex}"]`)
  sortedHeader.classList.add(sortState.ascending ? "sorted-asc" : "sorted-desc")

  renderTable()
}

function exportToCSV() {
  if (!dataTable) return

  let csv = ""

  // Encabezados
  const headers = dataTable.columns.map((col) => col.fieldName).join(",")
  csv += headers + "\n"

  // Datos
  dataTable.data.forEach((row) => {
    const rowData = row
      .map((cell) => {
        const value = cell.value
        if (typeof value === "string" && value.includes(",")) {
          return `"${value}"`
        }
        return value
      })
      .join(",")
    csv += rowData + "\n"
  })

  // Descargar
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = "tableau_export.csv"
  link.click()
}

function exportToExcel() {
  // Para Excel real, necesitarías una librería como SheetJS
  // Por ahora exportamos como CSV con extensión .xls
  if (!dataTable) return

  let content = "<table>"

  // Encabezados
  content += "<tr>"
  dataTable.columns.forEach((col) => {
    content += `<th>${col.fieldName}</th>`
  })
  content += "</tr>"

  // Datos
  dataTable.data.forEach((row) => {
    content += "<tr>"
    row.forEach((cell) => {
      content += `<td>${cell.value}</td>`
    })
    content += "</tr>"
  })

  content += "</table>"

  const blob = new Blob([content], { type: "application/vnd.ms-excel" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = "tableau_export.xls"
  link.click()
}
