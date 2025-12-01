// Super Table Pro Extension v4.0 - Simplificado

var tableau = window.tableau
var XLSX = window.XLSX

// Variables globales
var currentWorksheet = null
var fullData = null
var visibleData = []
var isWorksheetContext = false

// Configuración simplificada
var config = {
  tableTitle: "",
  showOnlineStatus: true,
  showSearch: true,
  showExportButtons: true,
  showRefreshButton: true,
  showStatusText: true,
  showSettingsButton: true,
  columns: {}, // { columnName: { visible: true, includeInExport: true } }
  rowsPerPage: 100,
}

var sortState = { column: null, ascending: true }
var searchQuery = ""
var currentPage = 0

// Inicialización
function initializeExtension() {
  console.log("[v0] Iniciando extensión simplificada")

  tableau.extensions
    .initializeAsync({ configure: openSettings })
    .then(() => {
      console.log("[v0] Extensión inicializada")
      loadConfig()

      if (tableau.extensions.dashboardContent) {
        isWorksheetContext = false
        setupDashboardContext()
      } else if (tableau.extensions.worksheetContent) {
        isWorksheetContext = true
        setupWorksheetContext()
      }

      setupEventListeners()
      applyGeneralSettings()
    })
    .catch((err) => {
      console.error("[v0] Error:", err)
      showError("Error al inicializar: " + err.toString())
    })
}

function setupDashboardContext() {
  console.log("[v0] Setup DASHBOARD context")
  const worksheets = tableau.extensions.dashboardContent.dashboard.worksheets

  if (worksheets.length === 0) {
    showError("No hay worksheets en el dashboard")
    return
  }

  var worksheetSelector = document.getElementById("worksheet-selector")
  worksheetSelector.style.display = "block"
  worksheetSelector.innerHTML = ""

  worksheets.forEach((ws) => {
    var option = document.createElement("option")
    option.value = ws.name
    option.textContent = ws.name
    worksheetSelector.appendChild(option)
  })

  currentWorksheet = worksheets[0]
  loadWorksheetData(currentWorksheet)
}

function setupWorksheetContext() {
  console.log("[v0] Setup WORKSHEET context")
  currentWorksheet = tableau.extensions.worksheetContent.worksheet

  if (!currentWorksheet) {
    showError("No se pudo obtener el worksheet")
    return
  }

  loadWorksheetData(currentWorksheet)
}

function setupEventListeners() {
  document.getElementById("search-input").addEventListener("input", handleSearch)
  document.getElementById("worksheet-selector").addEventListener("change", (e) => loadWorksheet(e.target.value))
  document.getElementById("export-excel").addEventListener("click", exportToExcel)
  document.getElementById("export-csv").addEventListener("click", exportToCSV)
  document.getElementById("refresh-btn").addEventListener("click", () => loadWorksheetData(currentWorksheet))
  document.getElementById("settings-btn").addEventListener("click", openSettings)
  document.getElementById("clear-filter").addEventListener("click", clearSearch)

  document.querySelectorAll(".close-modal").forEach((btn) => {
    btn.addEventListener("click", function () {
      this.closest(".modal").style.display = "none"
    })
  })

  document.getElementById("save-settings-btn").addEventListener("click", saveSettings)

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const tabName = this.getAttribute("data-tab")
      switchTab(tabName)
    })
  })
}

function switchTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"))
  document.querySelectorAll(".tab-content").forEach((content) => content.classList.remove("active"))

  document.querySelector(`[data-tab="${tabName}"]`).classList.add("active")
  document.getElementById(tabName + "-tab").classList.add("active")
}

function loadWorksheet(name) {
  if (isWorksheetContext) {
    currentWorksheet = tableau.extensions.worksheetContent.worksheet
  } else {
    var dashboard = tableau.extensions.dashboardContent.dashboard
    currentWorksheet = dashboard.worksheets.find((ws) => ws.name === name)
  }
  loadWorksheetData(currentWorksheet)
}

async function loadWorksheetData(worksheet) {
  console.log("[v0] === CARGANDO DATOS DEL WORKSHEET ===")
  console.log("[v0] Worksheet:", worksheet.name)
  showLoading()

  try {
    const dataTable = await worksheet.getSummaryDataAsync()
    console.log("[v0] ✓ Datos recibidos:")
    console.log("[v0]   - Filas:", dataTable.totalRowCount)
    console.log("[v0]   - Columnas:", dataTable.columns.length)
    console.log(
      "[v0]   - Nombres columnas:",
      dataTable.columns.map((c) => c.fieldName),
    )

    fullData = {
      columns: dataTable.columns,
      data: dataTable.data,
    }

    dataTable.columns.forEach((col) => {
      const colName = col.fieldName || col.name
      if (!config.columns[colName]) {
        config.columns[colName] = {
          name: colName,
          dataType: col.dataType,
          visible: true,
          includeInExport: true,
        }
        console.log("[v0]   ✓ Columna agregada:", colName, "visible:", true)
      }
    })

    console.log("[v0] Total columnas en config:", Object.keys(config.columns).length)

    saveConfig()
    applyFiltersAndSort()
    renderTable()
    updateTableInfo()
  } catch (error) {
    console.error("[v0] ✗ Error al cargar datos:", error)
    hideLoading()
    showError("Error al cargar datos: " + error.message)
  }
}

function applyFiltersAndSort() {
  if (!fullData || !fullData.data) {
    visibleData = []
    return
  }

  visibleData = [...fullData.data]

  // Búsqueda
  if (searchQuery) {
    visibleData = visibleData.filter((row) => {
      return row.some((cell) => {
        return String(cell).toLowerCase().includes(searchQuery.toLowerCase())
      })
    })
  }

  // Ordenamiento
  if (sortState.column !== null) {
    visibleData.sort((a, b) => {
      var valA = a[sortState.column]
      var valB = b[sortState.column]

      if (valA === valB) return 0
      if (valA == null) return 1
      if (valB == null) return -1

      var result = valA < valB ? -1 : 1
      return sortState.ascending ? result : -result
    })
  }

  currentPage = 0
}

function renderTable() {
  console.log("[v0] Renderizando tabla...")

  if (!fullData || !fullData.columns || !visibleData) {
    hideLoading()
    return
  }

  hideLoading()
  document.getElementById("table-container").style.display = "block"

  var visibleColumns = fullData.columns.filter((col) => {
    const colName = col.fieldName || col.name
    return config.columns[colName]?.visible === true
  })

  console.log("[v0] Columnas visibles:", visibleColumns.length)

  if (visibleColumns.length === 0) {
    showError("No hay columnas visibles. Haz clic en 'Extensión de formato' para configurar columnas.")
    return
  }

  // Header
  var thead = document.getElementById("table-header")
  thead.innerHTML = ""
  var headerRow = document.createElement("tr")

  visibleColumns.forEach((col, idx) => {
    var th = document.createElement("th")
    var sortIcon = sortState.column === col.index ? (sortState.ascending ? "↑" : "↓") : "↕"

    th.innerHTML = `
      <div class="th-content">
        <span>${escapeHtml(col.fieldName || col.name)}</span>
        <button class="sort-btn" data-index="${col.index}">${sortIcon}</button>
      </div>
    `
    headerRow.appendChild(th)
  })

  thead.appendChild(headerRow)

  // Body
  var tbody = document.getElementById("table-body")
  tbody.innerHTML = ""

  var start = currentPage * config.rowsPerPage
  var end = Math.min(start + config.rowsPerPage, visibleData.length)
  var pageData = visibleData.slice(start, end)

  pageData.forEach((row) => {
    var tr = document.createElement("tr")

    visibleColumns.forEach((col) => {
      var td = document.createElement("td")
      var cellValue = row[col.index]
      td.textContent = cellValue != null ? cellValue : ""
      tr.appendChild(td)
    })

    tbody.appendChild(tr)
  })

  document.querySelectorAll(".sort-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      var idx = Number.parseInt(this.getAttribute("data-index"))
      if (sortState.column === idx) {
        sortState.ascending = !sortState.ascending
      } else {
        sortState.column = idx
        sortState.ascending = true
      }
      applyFiltersAndSort()
      renderTable()
      updateTableInfo()
    })
  })

  renderPagination()
  updateTableInfo()
}

function renderPagination() {
  var container = document.getElementById("pagination")
  var totalPages = Math.ceil(visibleData.length / config.rowsPerPage)

  if (totalPages <= 1) {
    container.innerHTML = ""
    return
  }

  container.innerHTML = `
    <button onclick="goToPage(${currentPage - 1})" ${currentPage === 0 ? "disabled" : ""}>Anterior</button>
    <span>Página ${currentPage + 1} de ${totalPages}</span>
    <button onclick="goToPage(${currentPage + 1})" ${currentPage >= totalPages - 1 ? "disabled" : ""}>Siguiente</button>
  `
}

function goToPage(page) {
  var totalPages = Math.ceil(visibleData.length / config.rowsPerPage)
  if (page < 0 || page >= totalPages) return

  currentPage = page
  renderTable()
}

function updateTableInfo() {
  const title = config.tableTitle || (currentWorksheet ? currentWorksheet.name : "Tabla")
  document.getElementById("main-title").textContent = title
  document.getElementById("table-title").textContent = title

  var start = currentPage * config.rowsPerPage + 1
  var end = Math.min((currentPage + 1) * config.rowsPerPage, visibleData.length)

  document.getElementById("row-count").textContent = `Mostrando ${start}-${end} de ${visibleData.length} filas`

  if (searchQuery) {
    document.getElementById("filter-info").style.display = "flex"
    document.getElementById("filtered-count").textContent =
      `${visibleData.length} de ${fullData.data.length} filas (filtrado)`
  } else {
    document.getElementById("filter-info").style.display = "none"
  }
}

function handleSearch() {
  searchQuery = document.getElementById("search-input").value
  applyFiltersAndSort()
  renderTable()
}

function clearSearch() {
  document.getElementById("search-input").value = ""
  searchQuery = ""
  applyFiltersAndSort()
  renderTable()
}

async function openSettings() {
  console.log("[v0] === ABRIENDO CONFIGURACIÓN ===")
  console.log("[v0] fullData existe:", !!fullData)
  console.log("[v0] fullData.columns:", fullData?.columns?.length)

  if (fullData && fullData.columns) {
    const columnsForDialog = {}

    fullData.columns.forEach((col) => {
      const colName = col.fieldName || col.name
      columnsForDialog[colName] = {
        name: colName,
        dataType: col.dataType,
        visible: config.columns[colName]?.visible !== false,
        includeInExport: config.columns[colName]?.includeInExport !== false,
      }
    })

    console.log("[v0] Columnas para diálogo:", Object.keys(columnsForDialog))
    tableau.extensions.settings.set("dialogColumns", JSON.stringify(columnsForDialog))
    await tableau.extensions.settings.saveAsync()
    console.log("[v0] ✓ Columnas guardadas en dialogColumns")
  } else {
    console.log("[v0] ✗ ERROR: No hay fullData o columnas disponibles")
  }

  var popupUrl = window.location.origin + window.location.pathname.replace("index.html", "config.html")

  tableau.extensions.ui
    .displayDialogAsync(popupUrl, "", { height: 700, width: 1200 })
    .then((closePayload) => {
      if (closePayload === "saved") {
        console.log("[v0] Configuración guardada, recargando...")
        loadConfig()
        applyGeneralSettings()
        renderTable()
      }
    })
    .catch((error) => {
      console.log("[v0] Diálogo cerrado:", error)
    })
}

function saveSettings() {
  config.tableTitle = document.getElementById("settings-title").value.trim()
  config.showOnlineStatus = document.getElementById("settings-online").checked
  config.showStatusText = document.getElementById("settings-status").checked
  config.showSearch = document.getElementById("settings-search").checked
  config.showExportButtons = document.getElementById("settings-export").checked
  config.showRefreshButton = document.getElementById("settings-refresh").checked
  config.showSettingsButton = document.getElementById("settings-show-config").checked

  saveConfig()
  applyGeneralSettings()

  document.getElementById("settings-modal").style.display = "none"
  renderTable()
}

function applyGeneralSettings() {
  document.getElementById("online-indicator").style.display = config.showOnlineStatus ? "flex" : "none"
  document.getElementById("status").style.display = config.showStatusText ? "inline" : "none"
  document.querySelector(".search-box").style.display = config.showSearch ? "flex" : "none"
  document.getElementById("export-excel").style.display = config.showExportButtons ? "inline-flex" : "none"
  document.getElementById("export-csv").style.display = config.showExportButtons ? "inline-flex" : "none"
  document.getElementById("refresh-btn").style.display = config.showRefreshButton ? "inline-flex" : "none"
  document.getElementById("settings-btn").style.display = config.showSettingsButton ? "inline-flex" : "none"

  if (config.tableTitle) {
    document.getElementById("main-title").textContent = config.tableTitle
  }
}

function saveConfig() {
  tableau.extensions.settings.set("config", JSON.stringify(config))
  tableau.extensions.settings.saveAsync()
}

function loadConfig() {
  const settings = tableau.extensions.settings.getAll()
  const savedConfig = JSON.parse(settings.config || "{}")

  config = {
    tableTitle: savedConfig.tableTitle || "",
    showOnlineStatus: savedConfig.showOnlineStatus !== false,
    showSearch: savedConfig.showSearch !== false,
    showExportButtons: savedConfig.showExportButtons !== false,
    showRefreshButton: savedConfig.showRefreshButton !== false,
    showStatusText: savedConfig.showStatusText !== false,
    showSettingsButton: savedConfig.showSettingsButton !== false,
    columns: savedConfig.columns || {},
    rowsPerPage: savedConfig.rowsPerPage || 100,
  }

  console.log("[v0] Configuración cargada, columnas:", Object.keys(config.columns).length)
}

function exportToExcel() {
  if (!fullData) return

  var wb = XLSX.utils.book_new()
  var exportData = []

  var exportColumns = fullData.columns.filter((col) => {
    const colName = col.fieldName || col.name
    return config.columns[colName]?.includeInExport !== false
  })

  exportData.push(exportColumns.map((col) => col.fieldName || col.name))

  visibleData.forEach((row) => {
    exportData.push(exportColumns.map((col) => row[col.index]))
  })

  var ws = XLSX.utils.aoa_to_sheet(exportData)
  XLSX.utils.book_append_sheet(wb, ws, "Datos")

  const fileName = currentWorksheet ? `${currentWorksheet.name}_${Date.now()}.xlsx` : `export_${Date.now()}.xlsx`
  XLSX.writeFile(wb, fileName)
}

function exportToCSV() {
  if (!fullData) return

  var exportColumns = fullData.columns.filter((col) => {
    const colName = col.fieldName || col.name
    return config.columns[colName]?.includeInExport !== false
  })

  var csv = []
  csv.push(exportColumns.map((col) => escapeCSV(col.fieldName || col.name)).join(","))

  visibleData.forEach((row) => {
    csv.push(exportColumns.map((col) => escapeCSV(row[col.index])).join(","))
  })

  var blob = new Blob(["\ufeff" + csv.join("\n")], { type: "text/csv;charset=utf-8;" })
  var link = document.createElement("a")
  link.href = URL.createObjectURL(blob)

  const fileName = currentWorksheet ? `${currentWorksheet.name}_${Date.now()}.csv` : `export_${Date.now()}.csv`
  link.download = fileName
  link.click()
}

function escapeCSV(val) {
  if (val == null) return ""
  var str = String(val)
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

function showLoading() {
  document.getElementById("loading").style.display = "flex"
  document.getElementById("table-container").style.display = "none"
  document.getElementById("error").style.display = "none"
}

function hideLoading() {
  document.getElementById("loading").style.display = "none"
}

function showError(msg) {
  document.getElementById("error").style.display = "flex"
  document.getElementById("error-message").textContent = msg
  document.getElementById("loading").style.display = "none"
}

function escapeHtml(str) {
  var div = document.createElement("div")
  div.textContent = str
  return div.innerHTML
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeExtension)
} else {
  initializeExtension()
}
