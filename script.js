// Super Table Pro Extension v3.1

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
var isWorksheetContext = false

var config = {
  showSearch: true,
  showExportButtons: true,
  showRefreshButton: true,
  conditionalFormatting: {},
}

// Función de inicialización
function initializeExtension() {
  console.log("[v0] Inicializando extensión...")

  tableau.extensions.initializeAsync().then(
    () => {
      console.log("[v0] Extensión inicializada correctamente")

      loadConfig()

      if (tableau.extensions.dashboardContent) {
        // Contexto de dashboard
        isWorksheetContext = false
        dashboard = tableau.extensions.dashboardContent.dashboard
        console.log("[v0] Dashboard:", dashboard.name)
        console.log("[v0] Worksheets:", dashboard.worksheets.length)

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
        selector.parentElement.style.display = "block"

        enableControls()

        if (dashboard.worksheets.length > 0) {
          console.log("[v0] Cargando primer worksheet...")
          loadWorksheet(dashboard.worksheets[0].name)
        }
      } else if (tableau.extensions.worksheetContent) {
        isWorksheetContext = true
        currentWorksheet = tableau.extensions.worksheetContent.worksheet
        console.log("[v0] Worksheet:", currentWorksheet.name)

        updateStatus("Conectado", "connected")

        // Ocultar selector de worksheets
        document.getElementById("worksheet-selector").parentElement.style.display = "none"

        enableControls()
        console.log("[v0] Cargando datos del worksheet...")
        loadWorksheetData()
      } else {
        showError("No se pudo detectar el contexto de la extensión")
      }
    },
    (err) => {
      console.error("[v0] Error inicializando:", err)
      showError("Error al conectar con Tableau: " + err.toString())
    },
  )
}

function enableControls() {
  document.getElementById("search-input").disabled = false
  document.getElementById("export-excel").disabled = false
  document.getElementById("export-csv").disabled = false
  document.getElementById("refresh-btn").disabled = false

  applyConfig()
}

function applyConfig() {
  var searchBox = document.querySelector(".search-box")
  var exportButtons = document.querySelectorAll("#export-excel, #export-csv")
  var refreshBtn = document.getElementById("refresh-btn")

  searchBox.style.display = config.showSearch ? "flex" : "none"
  exportButtons.forEach((btn) => {
    btn.style.display = config.showExportButtons ? "inline-flex" : "none"
  })
  refreshBtn.style.display = config.showRefreshButton ? "inline-flex" : "none"
}

function loadWorksheet(worksheetName) {
  console.log("[v0] loadWorksheet:", worksheetName)
  showLoading()

  var worksheet = dashboard.worksheets.find((ws) => ws.name === worksheetName)

  if (!worksheet) {
    showError("No se encontró el worksheet: " + worksheetName)
    return
  }

  currentWorksheet = worksheet
  loadWorksheetData()
}

function loadWorksheetData() {
  console.log("[v0] loadWorksheetData - inicio")
  if (!currentData) {
    showLoading()
  }

  currentWorksheet
    .getSummaryDataAsync()
    .then((dataTable) => {
      console.log("[v0] Datos cargados:", dataTable.data.length, "filas", dataTable.columns.length, "columnas")

      currentData = {
        columns: dataTable.columns,
        rows: dataTable.data,
      }

      filteredData = null
      sortColumn = null
      sortAsc = true

      console.log("[v0] Renderizando tabla...")
      renderTable()
    })
    .catch((err) => {
      console.error("[v0] Error cargando datos:", err)
      showError("Error cargando datos: " + err.toString())
    })
}

function renderTable() {
  console.log("[v0] renderTable - inicio")
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
      '<button class="config-btn" data-index="' +
      index +
      '" title="Configurar formato">' +
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<circle cx="12" cy="12" r="3"></circle>' +
      '<path d="M12 1v6m0 6v6M5.6 5.6l4.2 4.2m4.2 4.2l4.2 4.2M1 12h6m6 0h6m-16.4.4l4.2-4.2m4.2-4.2l4.2-4.2"></path>' +
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
      var colName = currentData.columns[colIndex].fieldName

      // Formatear según tipo
      if (value == null) {
        td.className = "cell-null"
        td.textContent = "-"
      } else if (typeof value === "number") {
        td.className = "cell-number"

        var formatting = applyConditionalFormat(value, colName)
        if (formatting.icon) {
          td.innerHTML = formatting.icon + " " + formatting.text
          td.className += " " + formatting.className
        } else {
          if (value > 0) {
            td.classList.add("positive")
          } else if (value < 0) {
            td.classList.add("negative")
          }

          td.textContent = value.toLocaleString("es-ES", {
            maximumFractionDigits: 2,
            minimumFractionDigits: 0,
          })
        }
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

  // Event listeners para botones de ordenamiento
  document.querySelectorAll(".sort-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      var colIndex = Number.parseInt(this.getAttribute("data-index"))
      sortTable(colIndex)
    })
  })

  document.querySelectorAll(".config-btn").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.stopPropagation()
      var colIndex = Number.parseInt(this.getAttribute("data-index"))
      openColumnConfig(colIndex)
    })
  })

  console.log("[v0] Tabla renderizada correctamente")
}

function applyConditionalFormat(value, columnName) {
  var rules = config.conditionalFormatting[columnName]
  if (!rules || !rules.enabled) {
    return { text: value.toLocaleString("es-ES", { maximumFractionDigits: 2 }), className: "", icon: null }
  }

  var icon = ""
  var className = ""

  if (rules.useIcons) {
    if (value > rules.greenThreshold) {
      icon = '<span class="icon-positive">●</span>'
      className = "formatted-positive"
    } else if (value < rules.redThreshold) {
      icon = '<span class="icon-negative">●</span>'
      className = "formatted-negative"
    } else {
      icon = '<span class="icon-neutral">●</span>'
      className = "formatted-neutral"
    }
  }

  return {
    text: value.toLocaleString("es-ES", { maximumFractionDigits: 2 }),
    className: className,
    icon: icon,
  }
}

function openColumnConfig(colIndex) {
  var colName = currentData.columns[colIndex].fieldName
  var existingRules = config.conditionalFormatting[colName] || {
    enabled: false,
    useIcons: true,
    greenThreshold: 0,
    redThreshold: 0,
  }

  var modal = document.getElementById("config-modal")
  document.getElementById("config-column-name").textContent = colName
  document.getElementById("config-enabled").checked = existingRules.enabled
  document.getElementById("config-icons").checked = existingRules.useIcons
  document.getElementById("config-green").value = existingRules.greenThreshold
  document.getElementById("config-red").value = existingRules.redThreshold

  modal.style.display = "flex"

  document.getElementById("save-config-btn").onclick = () => {
    config.conditionalFormatting[colName] = {
      enabled: document.getElementById("config-enabled").checked,
      useIcons: document.getElementById("config-icons").checked,
      greenThreshold: Number.parseFloat(document.getElementById("config-green").value) || 0,
      redThreshold: Number.parseFloat(document.getElementById("config-red").value) || 0,
    }

    saveConfig()
    modal.style.display = "none"
    renderTable()
  }
}

function saveConfig() {
  tableau.extensions.settings.set("config", JSON.stringify(config))
  tableau.extensions.settings.saveAsync()
}

function loadConfig() {
  var saved = tableau.extensions.settings.get("config")
  if (saved) {
    try {
      var parsed = JSON.parse(saved)
      config = parsed
    } catch (e) {
      console.error("[v0] Error cargando configuración:", e)
    }
  }
}

function openSettings() {
  var modal = document.getElementById("settings-modal")
  document.getElementById("settings-search").checked = config.showSearch
  document.getElementById("settings-export").checked = config.showExportButtons
  document.getElementById("settings-refresh").checked = config.showRefreshButton

  modal.style.display = "flex"
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
    if (isWorksheetContext) {
      loadWorksheetData()
    } else {
      loadWorksheet(currentWorksheet.name)
    }
  }
}

function showLoading() {
  document.getElementById("loading").style.display = "flex"
  document.getElementById("error").style.display = "none"
  document.getElementById("table-container").style.display = "none"
}

function showError(message) {
  document.getElementById("loading").style.display = "none"
  document.getElementById("error").style.display = "flex"
  document.getElementById("table-container").style.display = "none"
  document.getElementById("error-message").textContent = message
  updateStatus("Error", "error")
}

function updateStatus(text, className) {
  var el = document.getElementById("status")
  el.textContent = text
  el.className = "status" + (className ? " " + className : "")
}

function escapeHtml(str) {
  var div = document.createElement("div")
  div.textContent = str
  return div.innerHTML
}

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

  document.getElementById("settings-btn").addEventListener("click", openSettings)

  document.getElementById("save-settings-btn").addEventListener("click", () => {
    config.showSearch = document.getElementById("settings-search").checked
    config.showExportButtons = document.getElementById("settings-export").checked
    config.showRefreshButton = document.getElementById("settings-refresh").checked

    saveConfig()
    applyConfig()
    document.getElementById("settings-modal").style.display = "none"
  })

  // Cerrar modales
  document.querySelectorAll(".close-modal").forEach((btn) => {
    btn.addEventListener("click", function () {
      this.closest(".modal").style.display = "none"
    })
  })

  window.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) {
      e.target.style.display = "none"
    }
  })

  // Inicializar extensión
  initializeExtension()
})
