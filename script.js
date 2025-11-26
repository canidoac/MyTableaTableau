// Declare the tableau variable
let worksheet = null
let dataTable = null
const conditionalFormats = []
const tableConfig = {
  showTotals: false,
  alternatingRows: true,
  showBorders: true,
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("[v0] DOM cargado")

  // Esperar a que el script de Tableau termine de cargar
  if (typeof window.tableau !== "undefined" && window.tableau.extensions) {
    console.log("[v0] Tableau API ya disponible")
    initializeExtension()
  } else {
    console.log("[v0] Esperando a que Tableau API se cargue...")
    // Esperar a que se dispare el evento de carga del script de Tableau
    window.addEventListener("load", () => {
      console.log("[v0] Window load event disparado")
      if (typeof window.tableau !== "undefined" && window.tableau.extensions) {
        console.log("[v0] Tableau API disponible después del load")
        initializeExtension()
      } else {
        console.log("[v0] Intentando inicializar con retraso...")
        setTimeout(() => {
          if (typeof window.tableau !== "undefined" && window.tableau.extensions) {
            initializeExtension()
          } else {
            console.error("[v0] Tableau API no disponible")
            showError()
          }
        }, 1000)
      }
    })
  }
})

function showError() {
  document.getElementById("loading").innerHTML = `
    <div style="color: #e74c3c; padding: 20px; text-align: center;">
      <h3>❌ Error al cargar Tableau Extensions API</h3>
      <p>La extensión no puede conectarse con Tableau.</p>
      <p><strong>Posibles causas:</strong></p>
      <ul style="text-align: left; display: inline-block; margin: 20px auto;">
        <li>Problemas de conectividad a internet</li>
        <li>Firewall o proxy bloqueando las URLs de recursos</li>
        <li>La extensión no se está ejecutando dentro de Tableau</li>
      </ul>
      <p style="margin-top: 20px;">
        <button onclick="location.reload()" class="btn btn-primary">
          Reintentar
        </button>
      </p>
    </div>
  `
}

function initializeExtension() {
  console.log("[v0] Iniciando inicialización de la extensión...")

  window.tableau.extensions.initializeAsync().then(
    () => {
      console.log("[v0] Extensión inicializada correctamente")

      try {
        const dashboardContent = window.tableau.extensions.dashboardContent
        if (!dashboardContent || !dashboardContent.dashboard) {
          throw new Error("No se puede acceder al dashboard")
        }

        const worksheets = dashboardContent.dashboard.worksheets
        console.log("[v0] Worksheets disponibles:", worksheets.length)

        if (worksheets.length > 0) {
          console.log("[v0] Lista de worksheets:", worksheets.map((w) => w.name).join(", "))
        }

        if (worksheets.length === 0) {
          throw new Error("No hay hojas de trabajo en el dashboard. Por favor agrega una hoja con datos.")
        }

        worksheet = worksheets[0]
        console.log("[v0] Usando worksheet:", worksheet.name)

        loadData()
        setupEventListeners()
      } catch (error) {
        console.error("[v0] Error obteniendo worksheet:", error)
        document.getElementById("loading").innerHTML = `
          <div style="color: #e74c3c; padding: 20px;">
            <strong>Error:</strong> ${error.message}<br><br>
            <small>Asegúrate de que el dashboard contenga al menos una hoja de trabajo con datos.</small>
          </div>
        `
      }
    },
    (err) => {
      console.error("[v0] Error al inicializar:", err)
      document.getElementById("loading").innerHTML = `
        <div style="color: #e74c3c; padding: 20px;">
          <strong>Error al inicializar la extensión:</strong><br>
          ${err.message || err}
        </div>
      `
    },
  )
}

function setupEventListeners() {
  document.getElementById("configure-btn").addEventListener("click", showWorksheetSelector)
  document.getElementById("close-config").addEventListener("click", toggleConfigPanel)
  document.getElementById("export-csv").addEventListener("click", exportToCSV)
  document.getElementById("export-excel").addEventListener("click", exportToExcel)
  document.getElementById("refresh-btn").addEventListener("click", loadData)
  document.getElementById("reload-btn").addEventListener("click", reloadExtension)

  document.getElementById("show-totals").addEventListener("change", (e) => {
    tableConfig.showTotals = e.target.checked
    renderTable()
  })

  document.getElementById("alternating-rows").addEventListener("change", (e) => {
    tableConfig.alternatingRows = e.target.checked
    renderTable()
  })

  document.getElementById("show-borders").addEventListener("change", (e) => {
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
    console.log("[v0] Iniciando carga de datos...")
    const loadingDiv = document.getElementById("loading")
    const dataTableElement = document.getElementById("data-table")

    if (!loadingDiv || !dataTableElement) {
      console.error("[v0] No se encontraron elementos del DOM")
      return
    }

    loadingDiv.style.display = "block"
    dataTableElement.style.display = "none"

    if (!worksheet) {
      throw new Error("No hay worksheet disponible")
    }

    console.log("[v0] Obteniendo datos del worksheet:", worksheet.name)
    const dataTableReader = await worksheet.getSummaryDataAsync()
    dataTable = dataTableReader

    console.log("[v0] Datos obtenidos:", dataTable.data.length, "filas,", dataTable.columns.length, "columnas")

    populateFormatFields()
    renderTable()

    loadingDiv.style.display = "none"
    dataTableElement.style.display = "table"
    console.log("[v0] Tabla renderizada exitosamente")
  } catch (error) {
    console.error("[v0] Error cargando datos:", error)
    document.getElementById("loading").innerHTML = `
      <div style="color: #e74c3c; padding: 20px;">
        <strong>Error al cargar datos:</strong><br>
        ${error.message}
      </div>
    `
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

function reloadExtension() {
  console.log("[v0] Recargando extensión completa...")
  location.reload()
}

async function showWorksheetSelector() {
  try {
    const dashboardContent = window.tableau.extensions.dashboardContent
    const worksheets = dashboardContent.dashboard.worksheets

    if (worksheets.length === 0) {
      alert("No hay hojas de trabajo disponibles en este dashboard")
      return
    }

    // Crear diálogo con lista de worksheets
    const worksheetNames = worksheets.map((ws) => ws.name)

    // Usar el diálogo nativo de Tableau para seleccionar worksheet
    const selectedWorksheet = await promptWorksheetSelection(worksheetNames)

    if (selectedWorksheet) {
      worksheet = worksheets.find((ws) => ws.name === selectedWorksheet)
      console.log("[v0] Worksheet seleccionado:", worksheet.name)

      // Recargar datos con el nuevo worksheet
      await loadData()

      alert(`Ahora usando datos de: ${worksheet.name}`)
    }
  } catch (error) {
    console.error("[v0] Error al seleccionar worksheet:", error)
    alert("Error al seleccionar worksheet: " + error.message)
  }
}

function promptWorksheetSelection(worksheetNames) {
  return new Promise((resolve) => {
    // Crear un diálogo personalizado en HTML
    const dialogHTML = `
      <div id="worksheet-dialog" style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 10000;
        min-width: 300px;
      ">
        <h3 style="margin-top: 0; color: #1da1f2;">Seleccionar Hoja de Trabajo</h3>
        <p style="color: #657786; margin-bottom: 20px;">Elige la tabla que deseas visualizar:</p>
        <select id="worksheet-select" style="
          width: 100%;
          padding: 10px;
          font-size: 14px;
          border: 1px solid #e1e8ed;
          border-radius: 4px;
          margin-bottom: 20px;
        ">
          ${worksheetNames.map((name) => `<option value="${name}">${name}</option>`).join("")}
        </select>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button id="cancel-worksheet" class="btn btn-secondary">Cancelar</button>
          <button id="select-worksheet" class="btn btn-primary">Seleccionar</button>
        </div>
      </div>
      <div id="worksheet-overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 9999;
      "></div>
    `

    // Insertar el diálogo en el DOM
    const dialogContainer = document.createElement("div")
    dialogContainer.innerHTML = dialogHTML
    document.body.appendChild(dialogContainer)

    // Event listeners para los botones
    document.getElementById("select-worksheet").addEventListener("click", () => {
      const selected = document.getElementById("worksheet-select").value
      document.body.removeChild(dialogContainer)
      resolve(selected)
    })

    document.getElementById("cancel-worksheet").addEventListener("click", () => {
      document.body.removeChild(dialogContainer)
      resolve(null)
    })

    document.getElementById("worksheet-overlay").addEventListener("click", () => {
      document.body.removeChild(dialogContainer)
      resolve(null)
    })
  })
}
