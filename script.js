// Super Table Extension v1.0.7
// Patrón simple y directo que funciona en Tableau

// Importar variables necesarias
var tableau = window.tableau
var XLSX = window.XLSX

// Variables globales
var dashboard = null
var worksheetsData = new Map()

// Función de inicialización
function initializeExtension() {
  console.log("Inicializando extensión...")

  tableau.extensions.initializeAsync().then(
    () => {
      console.log("Extensión inicializada correctamente")

      // Obtener dashboard
      dashboard = tableau.extensions.dashboardContent.dashboard
      console.log("Dashboard:", dashboard.name)
      console.log("Worksheets:", dashboard.worksheets.length)

      // Actualizar UI
      updateStatus("Conectado", "connected")
      document.getElementById("dashboard-name").textContent = dashboard.name
      document.getElementById("worksheet-count").textContent =
        dashboard.worksheets.length + " hojas de trabajo disponibles"

      // Habilitar botones
      document.getElementById("export-all-excel").disabled = false
      document.getElementById("export-csv").disabled = false
      document.getElementById("refresh-btn").disabled = false

      // Cargar datos
      loadAllWorksheets()
    },
    (err) => {
      console.error("Error inicializando:", err)
      showError("Error al conectar con Tableau: " + err.toString())
    },
  )
}

// Cargar todos los worksheets
function loadAllWorksheets() {
  showLoading()
  worksheetsData.clear()

  var worksheets = dashboard.worksheets
  var loadPromises = []

  worksheets.forEach((worksheet) => {
    var promise = worksheet
      .getSummaryDataAsync()
      .then((dataTable) => {
        worksheetsData.set(worksheet.name, {
          worksheet: worksheet,
          columns: dataTable.columns,
          data: dataTable.data,
          totalRows: dataTable.data.length,
        })
        console.log(worksheet.name + ": " + dataTable.data.length + " filas")
      })
      .catch((err) => {
        console.warn("Error en " + worksheet.name + ":", err)
        worksheetsData.set(worksheet.name, {
          worksheet: worksheet,
          error: err.toString(),
        })
      })
    loadPromises.push(promise)
  })

  Promise.all(loadPromises)
    .then(() => {
      renderDashboard()
    })
    .catch((err) => {
      showError("Error cargando datos: " + err.toString())
    })
}

// Renderizar dashboard
function renderDashboard() {
  document.getElementById("loading").style.display = "none"
  document.getElementById("error").style.display = "none"
  document.getElementById("dashboard-info").style.display = "block"

  var listEl = document.getElementById("worksheets-list")
  listEl.innerHTML = ""

  worksheetsData.forEach((wsData, name) => {
    var card = createWorksheetCard(name, wsData)
    listEl.appendChild(card)
  })
}

// Crear tarjeta de worksheet
function createWorksheetCard(name, wsData) {
  var card = document.createElement("div")
  card.className = "worksheet-card"

  if (wsData.error) {
    card.innerHTML =
      '<div class="worksheet-header">' +
      "<h3>" +
      escapeHtml(name) +
      "</h3>" +
      '<span class="row-count" style="background:#fee2e2;color:#991b1b;">Error</span>' +
      "</div>" +
      '<div style="padding:16px;color:#64748b;font-size:13px;">No se pudieron cargar los datos</div>'
    return card
  }

  // Preview de datos
  var previewRows = wsData.data.slice(0, 5)
  var tableHtml = "<table><thead><tr>"

  wsData.columns.forEach((col) => {
    tableHtml += "<th>" + escapeHtml(col.fieldName) + "</th>"
  })
  tableHtml += "</tr></thead><tbody>"

  previewRows.forEach((row) => {
    tableHtml += "<tr>"
    row.forEach((cell) => {
      var value = cell.value
      var formattedValue = value

      if (typeof value === "number") {
        formattedValue = value.toLocaleString("es-ES", { maximumFractionDigits: 2 })
      } else {
        formattedValue = escapeHtml(String(value || ""))
      }

      var className = typeof value === "number" ? "number-cell" : ""
      tableHtml += '<td class="' + className + '">' + formattedValue + "</td>"
    })
    tableHtml += "</tr>"
  })
  tableHtml += "</tbody></table>"

  card.innerHTML =
    '<div class="worksheet-header">' +
    "<h3>" +
    escapeHtml(name) +
    "</h3>" +
    '<span class="row-count">' +
    wsData.totalRows.toLocaleString() +
    " filas</span>" +
    "</div>" +
    '<div class="worksheet-preview">' +
    tableHtml +
    "</div>" +
    '<div class="worksheet-actions">' +
    '<button class="btn btn-secondary btn-sm" onclick="exportSingleToExcel(\'' +
    escapeHtml(name) +
    "')\">Excel</button>" +
    '<button class="btn btn-secondary btn-sm" onclick="exportSingleToCSV(\'' +
    escapeHtml(name) +
    "')\">CSV</button>" +
    "</div>"

  return card
}

// Exportar todo a Excel
function exportAllToExcel() {
  var workbook = XLSX.utils.book_new()

  worksheetsData.forEach((wsData, name) => {
    if (wsData.error) return

    var sheetData = prepareSheetData(wsData)
    var worksheet = XLSX.utils.aoa_to_sheet(sheetData)

    // Anchos de columna
    worksheet["!cols"] = wsData.columns.map((col) => ({ wch: Math.max(col.fieldName.length, 12) }))

    var safeName = name.substring(0, 31).replace(/[\\/*?:[\]]/g, "_")
    XLSX.utils.book_append_sheet(workbook, worksheet, safeName)
  })

  var filename = dashboard.name + "_" + getTimestamp() + ".xlsx"
  XLSX.writeFile(workbook, filename)
}

// Exportar worksheet individual a Excel
function exportSingleToExcel(worksheetName) {
  var wsData = worksheetsData.get(worksheetName)
  if (!wsData || wsData.error) return

  var workbook = XLSX.utils.book_new()
  var sheetData = prepareSheetData(wsData)
  var worksheet = XLSX.utils.aoa_to_sheet(sheetData)

  worksheet["!cols"] = wsData.columns.map((col) => ({ wch: Math.max(col.fieldName.length, 12) }))

  var safeName = worksheetName.substring(0, 31).replace(/[\\/*?:[\]]/g, "_")
  XLSX.utils.book_append_sheet(workbook, worksheet, safeName)

  var filename = worksheetName + "_" + getTimestamp() + ".xlsx"
  XLSX.writeFile(workbook, filename)
}

// Exportar todo a CSV
function exportAllToCSV() {
  worksheetsData.forEach((wsData, name) => {
    if (!wsData.error) {
      exportSingleToCSV(name)
    }
  })
}

// Exportar worksheet individual a CSV
function exportSingleToCSV(worksheetName) {
  var wsData = worksheetsData.get(worksheetName)
  if (!wsData || wsData.error) return

  var sheetData = prepareSheetData(wsData)
  var csv = sheetData
    .map((row) =>
      row
        .map((cell) => {
          var str = String(cell || "")
          if (str.indexOf(",") >= 0 || str.indexOf('"') >= 0 || str.indexOf("\n") >= 0) {
            return '"' + str.replace(/"/g, '""') + '"'
          }
          return str
        })
        .join(","),
    )
    .join("\n")

  var blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" })
  var link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = worksheetName + "_" + getTimestamp() + ".csv"
  link.click()
  URL.revokeObjectURL(link.href)
}

// Preparar datos para exportación
function prepareSheetData(wsData) {
  var data = []
  data.push(wsData.columns.map((col) => col.fieldName))
  wsData.data.forEach((row) => {
    data.push(row.map((cell) => cell.value))
  })
  return data
}

// Refrescar datos
function refreshAllData() {
  updateStatus("Actualizando...", "")
  loadAllWorksheets()
  updateStatus("Conectado", "connected")
}

// Mostrar loading
function showLoading() {
  document.getElementById("loading").style.display = "flex"
  document.getElementById("error").style.display = "none"
  document.getElementById("dashboard-info").style.display = "none"
}

// Mostrar error
function showError(message) {
  document.getElementById("loading").style.display = "none"
  document.getElementById("error").style.display = "flex"
  document.getElementById("dashboard-info").style.display = "none"
  document.getElementById("error-message").textContent = message
  updateStatus("Error", "error")
}

// Actualizar estado
function updateStatus(text, className) {
  var el = document.getElementById("status")
  el.textContent = text
  el.className = "status" + (className ? " " + className : "")
}

// Escapar HTML
function escapeHtml(str) {
  var div = document.createElement("div")
  div.textContent = str
  return div.innerHTML
}

// Timestamp para archivos
function getTimestamp() {
  var now = new Date()
  return (
    now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    "_" +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0")
  )
}

document.addEventListener("DOMContentLoaded", () => {
  // Configurar botones
  document.getElementById("retry-btn").addEventListener("click", () => {
    location.reload()
  })

  document.getElementById("refresh-btn").addEventListener("click", refreshAllData)
  document.getElementById("export-all-excel").addEventListener("click", exportAllToExcel)
  document.getElementById("export-csv").addEventListener("click", exportAllToCSV)

  // Inicializar extensión
  initializeExtension()
})
