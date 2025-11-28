// Super Table Pro Extension v3.0

// Importar variables necesarias
var tableau = window.tableau
var XLSX = window.XLSX

// Variables globales
var dashboard = null
var currentWorksheet = null
var currentData = null
var filteredData = null
var sortColumn = null
var sortAsc = true

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

      updateStatus("Conectado", "connected")

      // Poblar selector de worksheets
      var selector = document.getElementById("worksheet-selector")
      selector.innerHTML = ""

      dashboard.worksheets.forEach((ws, index) => {
        var option = document.createElement("option")
        option.value = ws.name
        option.textContent = ws.name
        if (index === 0) option.selected = true
        selector.appendChild(option)
      })

      selector.disabled = false
      document.getElementById("search-input").disabled = false
      document.getElementById("export-excel").disabled = false
      document.getElementById("export-csv").disabled = false
      document.getElementById("refresh-btn").disabled = false

      if (dashboard.worksheets.length > 0) {
        loadWorksheet(dashboard.worksheets[0].name)
      }
    },
    (err) => {
      console.error("Error inicializando:", err)
      showError("Error al conectar con Tableau: " + err.toString())
    },
  )
}

function loadWorksheet(worksheetName) {
  showLoading()

  var worksheet = dashboard.worksheets.find((ws) => ws.name === worksheetName)

  if (!worksheet) {
    showError("No se encontró el worksheet: " + worksheetName)
    return
  }

  currentWorksheet = worksheet

  worksheet
    .getSummaryDataAsync()
    .then((dataTable) => {
      console.log("Datos cargados:", dataTable.data.length, "filas")

      currentData = {
        columns: dataTable.columns,
        rows: dataTable.data,
      }

      filteredData = null
      sortColumn = null
      sortAsc = true

      renderTable()
    })
    .catch((err) => {
      console.error("Error cargando datos:", err)
      showError("Error cargando datos: " + err.toString())
    })
}

function renderTable() {
  document.getElementById("loading").style.display = "none"
  document.getElementById("error").style.display = "none"
  document.getElementById("table-container").style.display = "block"

  var displayData = filteredData || currentData.rows

  // Actualizar información
  document.getElementById("table-title").textContent = currentWorksheet.name
  document.getElementById("row-count").textContent = displayData.length.toLocaleString() + " filas"

  if (filteredData) {
    document.getElementById("filter-info").style.display = "flex"
    document.getElementById("filtered-count").textContent =
      "Mostrando " + filteredData.length + " de " + currentData.rows.length + " filas"
  } else {
    document.getElementById("filter-info").style.display = "none"
  }

  // Renderizar header
  var thead = document.getElementById("table-header")
  thead.innerHTML = ""
  var headerRow = document.createElement("tr")

  currentData.columns.forEach((col, index) => {
    var th = document.createElement("th")
    th.innerHTML =
      '<div class="th-content">' +
      "<span>" +
      escapeHtml(col.fieldName) +
      "</span>" +
      '<button class="sort-btn" data-index="' +
      index +
      '">' +
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<polyline points="6 9 12 15 18 9"></polyline>' +
      "</svg>" +
      "</button>" +
      "</div>"

    if (sortColumn === index) {
      th.className = sortAsc ? "sorted-asc" : "sorted-desc"
    }

    headerRow.appendChild(th)
  })

  thead.appendChild(headerRow)

  // Renderizar body
  var tbody = document.getElementById("table-body")
  tbody.innerHTML = ""

  if (displayData.length === 0) {
    var emptyRow = document.createElement("tr")
    var emptyCell = document.createElement("td")
    emptyCell.colSpan = currentData.columns.length
    emptyCell.className = "empty-state"
    emptyCell.textContent = filteredData ? "No se encontraron resultados" : "No hay datos para mostrar"
    emptyRow.appendChild(emptyCell)
    tbody.appendChild(emptyRow)
    return
  }

  displayData.forEach((row, rowIndex) => {
    var tr = document.createElement("tr")
    if (rowIndex % 2 === 1) tr.className = "row-alt"

    row.forEach((cell, colIndex) => {
      var td = document.createElement("td")
      var value = cell.value

      // Formatear según tipo
      if (value == null) {
        td.className = "cell-null"
        td.textContent = "-"
      } else if (typeof value === "number") {
        td.className = "cell-number"

        if (value > 0) {
          td.classList.add("positive")
        } else if (value < 0) {
          td.classList.add("negative")
        }

        td.textContent = value.toLocaleString("es-ES", {
          maximumFractionDigits: 2,
          minimumFractionDigits: 0,
        })
      } else if (value instanceof Date) {
        td.className = "cell-date"
        td.textContent = value.toLocaleDateString("es-ES")
      } else {
        td.textContent = String(value)
      }

      tr.appendChild(td)
    })

    tbody.appendChild(tr)
  })

  document.querySelectorAll(".sort-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      var colIndex = Number.parseInt(this.getAttribute("data-index"))
      sortTable(colIndex)
    })
  })
}

function sortTable(colIndex) {
  if (sortColumn === colIndex) {
    sortAsc = !sortAsc
  } else {
    sortColumn = colIndex
    sortAsc = true
  }

  var dataToSort = filteredData || currentData.rows

  dataToSort.sort((a, b) => {
    var aVal = a[colIndex].value
    var bVal = b[colIndex].value

    if (aVal == null && bVal == null) return 0
    if (aVal == null) return 1
    if (bVal == null) return -1

    var comparison = 0
    if (typeof aVal === "number" && typeof bVal === "number") {
      comparison = aVal - bVal
    } else {
      comparison = String(aVal).localeCompare(String(bVal))
    }

    return sortAsc ? comparison : -comparison
  })

  renderTable()
}

function searchTable(query) {
  if (!query || query.trim() === "") {
    filteredData = null
    renderTable()
    return
  }

  var searchLower = query.toLowerCase().trim()

  filteredData = currentData.rows.filter((row) =>
    row.some((cell) => {
      var value = cell.value
      if (value == null) return false
      return String(value).toLowerCase().indexOf(searchLower) !== -1
    }),
  )

  renderTable()
}

function exportToExcel() {
  if (!currentData) return

  var workbook = XLSX.utils.book_new()
  var displayData = filteredData || currentData.rows

  var sheetData = []
  sheetData.push(currentData.columns.map((col) => col.fieldName))

  displayData.forEach((row) => {
    sheetData.push(row.map((cell) => cell.value))
  })

  var worksheet = XLSX.utils.aoa_to_sheet(sheetData)

  worksheet["!cols"] = currentData.columns.map((col) => ({ wch: Math.max(col.fieldName.length + 2, 15) }))

  XLSX.utils.book_append_sheet(workbook, worksheet, "Datos")

  var filename = currentWorksheet.name + "_" + getTimestamp() + ".xlsx"
  XLSX.writeFile(workbook, filename)
}

function exportToCSV() {
  if (!currentData) return

  var displayData = filteredData || currentData.rows
  var csv = []

  // Headers
  csv.push(currentData.columns.map((col) => escapeCSV(col.fieldName)).join(","))

  // Datos
  displayData.forEach((row) => {
    csv.push(row.map((cell) => escapeCSV(cell.value)).join(","))
  })

  var blob = new Blob(["\ufeff" + csv.join("\n")], { type: "text/csv;charset=utf-8;" })
  var link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = currentWorksheet.name + "_" + getTimestamp() + ".csv"
  link.click()
  URL.revokeObjectURL(link.href)
}

function escapeCSV(value) {
  if (value == null) return ""
  var str = String(value)
  if (str.indexOf(",") >= 0 || str.indexOf('"') >= 0 || str.indexOf("\n") >= 0) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

function refreshData() {
  if (currentWorksheet) {
    loadWorksheet(currentWorksheet.name)
  }
}

// Mostrar loading
function showLoading() {
  document.getElementById("loading").style.display = "flex"
  document.getElementById("error").style.display = "none"
  document.getElementById("table-container").style.display = "none"
}

// Mostrar error
function showError(message) {
  document.getElementById("loading").style.display = "none"
  document.getElementById("error").style.display = "flex"
  document.getElementById("table-container").style.display = "none"
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
  document.getElementById("retry-btn").addEventListener("click", () => {
    location.reload()
  })

  document.getElementById("worksheet-selector").addEventListener("change", function () {
    loadWorksheet(this.value)
  })

  document.getElementById("search-input").addEventListener("input", function () {
    searchTable(this.value)
  })

  document.getElementById("clear-filter").addEventListener("click", () => {
    document.getElementById("search-input").value = ""
    searchTable("")
  })

  document.getElementById("refresh-btn").addEventListener("click", refreshData)
  document.getElementById("export-excel").addEventListener("click", exportToExcel)
  document.getElementById("export-csv").addEventListener("click", exportToCSV)

  // Inicializar extensión
  initializeExtension()
})
