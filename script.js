// Super Table Pro Extension v6.5 - Export dropdown, worksheet in General, Export config

var tableau = window.tableau
var XLSX = window.XLSX

// Variables globales
var currentWorksheet = null
var fullData = null
var visibleData = []
var isWorksheetContext = false
var searchQuery = ""
var sortState = { column: null, ascending: true }
var currentPage = 0

// Configuración simplificada
var config = {
  tableTitle: "",
  showSearch: true,
  showRowCount: true,
  showExportButtons: true,
  showRefreshButton: true,
  showSettingsButton: true,
  columns: {}, // { columnName: { visible: true, includeInExport: true, displayName: "", conditionalFormat: { enabled: false, operator: '', value: '', cellBg: false, cellBgColor: '', cellText: false, cellTextColor: '', rowBg: false, rowBgColor: '', rowText: false, rowTextColor: '', addIcon: false, icon: '', iconColor: '' } }
  rowsPerPage: 100,
  exportButtonText: "Exportar",
  exportButtonColor: "#2563eb", // Default color
  exportButtonTextColor: "#ffffff", // Added exportButtonTextColor config
  exportEnableExcel: true,
  exportEnableCSV: true,
  exportEnablePDF: true,
  exportFilename: "export", // Added exportFilename config
}

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
  const searchInput = document.getElementById("search-input")
  const worksheetSelector = document.getElementById("worksheet-selector")
  const exportBtn = document.getElementById("export-btn")
  const exportExcel = document.getElementById("export-excel-opt")
  const exportCSV = document.getElementById("export-csv-opt")
  const exportPDF = document.getElementById("export-pdf-opt")
  const refreshBtn = document.getElementById("refresh-btn")
  const settingsBtn = document.getElementById("settings-btn")
  const clearFilter = document.getElementById("clear-filter")

  if (searchInput) searchInput.addEventListener("input", handleSearch)
  if (worksheetSelector) worksheetSelector.addEventListener("change", (e) => loadWorksheet(e.target.value))
  if (exportBtn) exportBtn.addEventListener("click", toggleExportDropdown)
  if (exportExcel) exportExcel.addEventListener("click", () => handleExport("excel"))
  if (exportCSV) exportCSV.addEventListener("click", () => handleExport("csv"))
  if (exportPDF) exportPDF.addEventListener("click", () => handleExport("pdf"))
  if (refreshBtn) refreshBtn.addEventListener("click", () => loadWorksheetData(currentWorksheet))
  if (settingsBtn) settingsBtn.addEventListener("click", openSettings)
  if (clearFilter) clearFilter.addEventListener("click", clearSearch)

  document.addEventListener("click", (e) => {
    const dropdown = document.getElementById("export-dropdown")
    const menu = document.getElementById("export-dropdown-menu")
    if (dropdown && menu && !dropdown.contains(e.target)) {
      menu.style.display = "none"
    }
  })

  document.querySelectorAll(".close-modal").forEach((btn) => {
    btn.addEventListener("click", function () {
      this.closest(".modal").style.display = "none"
    })
  })

  const saveBtn = document.getElementById("save-settings-btn")
  if (saveBtn) saveBtn.addEventListener("click", saveSettings)

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

    if (dataTable.data.length > 0) {
      console.log("[v0]   - Primera fila:", dataTable.data[0])
      console.log("[v0]   - Tipo primer valor:", typeof dataTable.data[0][0])
      console.log("[v0]   - Primer valor completo:", dataTable.data[0][0])
    }

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
          displayName: "",
          conditionalFormat: {
            enabled: false,
            operator: "",
            value: "",
            cellBg: false,
            cellBgColor: "",
            cellText: false,
            cellTextColor: "",
            rowBg: false,
            rowBgColor: "",
            rowText: false,
            rowTextColor: "",
            addIcon: false,
            icon: "",
            iconColor: "",
          },
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
  console.log("[v0] === RENDERIZANDO TABLA ===")

  if (!fullData || !fullData.columns || !visibleData) {
    console.log("[v0] ✗ No hay datos para renderizar")
    hideLoading()
    return
  }

  hideLoading()
  const tableContainer = document.getElementById("table-container")
  if (tableContainer) tableContainer.style.display = "block"

  var visibleColumns = fullData.columns.filter((col) => {
    const colName = col.fieldName || col.name
    return config.columns[colName]?.visible === true
  })

  console.log("[v0] Columnas visibles:", visibleColumns.length)

  if (visibleColumns.length === 0) {
    showError("No hay columnas visibles. Configura al menos una columna como visible.")
    return
  }

  // Header
  var thead = document.getElementById("table-header")
  thead.innerHTML = ""
  var headerRow = document.createElement("tr")

  visibleColumns.forEach((col, idx) => {
    var th = document.createElement("th")
    var sortIcon = sortState.column === col.index ? (sortState.ascending ? "↑" : "↓") : "↕"

    const colName = col.fieldName || col.name
    const displayName = config.columns[colName]?.displayName || colName

    th.innerHTML = `
      <div class="th-content">
        <span>${escapeHtml(displayName)}</span>
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

  if (pageData.length > 0) {
    console.log("[v0] Primera fila a renderizar:", pageData[0])
  }

  pageData.forEach((row, rowIdx) => {
    var tr = document.createElement("tr")
    let rowFormattingApplied = false
    let rowBgColor = null
    let rowTextColor = null

    visibleColumns.forEach((col) => {
      var td = document.createElement("td")
      var cellData = row[col.index]

      var cellValue = ""
      var numericValue = null

      if (cellData === null || cellData === undefined) {
        cellValue = ""
      } else if (typeof cellData === "object") {
        cellValue = cellData.formattedValue || cellData.value || cellData.nativeValue || ""
        numericValue = cellData.value || cellData.nativeValue

        if (rowIdx === 0) {
          console.log(`[v0] Celda [${col.fieldName}]:`, cellData, "→", cellValue)
        }
      } else {
        cellValue = cellData
        numericValue = cellData
      }

      const colName = col.fieldName || col.name
      const columnConfig = config.columns[colName]

      if (columnConfig && columnConfig.conditionalFormat && columnConfig.conditionalFormat.enabled) {
        const cf = columnConfig.conditionalFormat
        const condValue = Number.parseFloat(cf.value)
        const cellNumValue = Number.parseFloat(numericValue)

        if (!isNaN(cellNumValue) && !isNaN(condValue)) {
          let conditionMet = false

          switch (cf.operator) {
            case ">=":
              conditionMet = cellNumValue >= condValue
              break
            case "<=":
              conditionMet = cellNumValue <= condValue
              break
            case "=":
              conditionMet = cellNumValue === condValue
              break
            case ">":
              conditionMet = cellNumValue > condValue
              break
            case "<":
              conditionMet = cellNumValue < condValue
              break
            case "!=":
              conditionMet = cellNumValue !== condValue
              break
          }

          if (conditionMet) {
            // Apply cell formatting
            if (cf.cellBg) {
              td.style.backgroundColor = cf.cellBgColor
            }
            if (cf.cellText) {
              td.style.color = cf.cellTextColor
            }

            // Track row formatting
            if (cf.rowBg) {
              rowFormattingApplied = true
              rowBgColor = cf.rowBgColor
            }
            if (cf.rowText) {
              rowFormattingApplied = true
              rowTextColor = cf.rowTextColor
            }

            // Add icon if configured
            if (cf.addIcon && cf.icon) {
              const iconSpan = document.createElement("span")
              iconSpan.style.marginRight = "6px"
              iconSpan.style.color = cf.iconColor || "#000000"

              // Map icon names to Unicode symbols
              const iconMap = {
                arrow_upward: "↑",
                arrow_downward: "↓",
                arrow_forward: "→",
                arrow_back: "←",
                circle: "⬤",
                circle_outline: "○",
                square: "■",
                square_outline: "□",
              }

              iconSpan.textContent = iconMap[cf.icon] || ""
              td.prepend(iconSpan)
            }
          }
        }
      }

      td.appendChild(document.createTextNode(cellValue))
      tr.appendChild(td)
    })

    if (rowFormattingApplied) {
      if (rowBgColor) {
        tr.style.backgroundColor = rowBgColor
      }
      if (rowTextColor) {
        tr.querySelectorAll("td").forEach((cell) => {
          if (!cell.style.color) {
            cell.style.color = rowTextColor
          }
        })
      }
    }

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

  updatePagination()
  updateTableInfo()
}

function updatePagination() {
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
  const rowCountEl = document.getElementById("row-count")
  if (rowCountEl) {
    const start = currentPage * config.rowsPerPage + 1
    const end = Math.min((currentPage + 1) * config.rowsPerPage, visibleData.length)
    rowCountEl.textContent = `Mostrando ${start}-${end} de ${visibleData.length} filas`
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

  const worksheetSelect = document.getElementById("settings-worksheet")
  if (worksheetSelect && !isWorksheetContext) {
    worksheetSelect.innerHTML = ""
    const worksheets = tableau.extensions.dashboardContent.dashboard.worksheets
    worksheets.forEach((ws) => {
      const option = document.createElement("option")
      option.value = ws.name
      option.textContent = ws.name
      option.selected = ws.name === currentWorksheet?.name
      worksheetSelect.appendChild(option)
    })
  }

  if (fullData && fullData.columns) {
    const columnsForDialog = {}

    fullData.columns.forEach((col) => {
      const colName = col.fieldName || col.name
      columnsForDialog[colName] = {
        name: colName,
        dataType: col.dataType,
        visible: config.columns[colName]?.visible !== false,
        includeInExport: config.columns[colName]?.includeInExport !== false,
        displayName: config.columns[colName]?.displayName || "",
        conditionalFormat: config.columns[colName]?.conditionalFormat || {
          enabled: false,
          operator: "",
          value: "",
          cellBg: false,
          cellBgColor: "",
          cellText: false,
          cellTextColor: "",
          rowBg: false,
          rowBgColor: "",
          rowText: false,
          rowTextColor: "",
          addIcon: false,
          icon: "",
          iconColor: "",
        },
      }
    })

    console.log("[v0] Columnas para diálogo:", Object.keys(columnsForDialog))
    tableau.extensions.settings.set("dialogColumns", JSON.stringify(columnsForDialog))
    await tableau.extensions.settings.saveAsync()
    console.log("[v0] ✓ Columnas guardadas en dialogColumns")
  }

  const popupUrl = window.location.origin + window.location.pathname.replace("index.html", "config.html")

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
  const worksheetSelect = document.getElementById("settings-worksheet")
  if (worksheetSelect && worksheetSelect.value && !isWorksheetContext) {
    loadWorksheet(worksheetSelect.value)
  }

  config.tableTitle = document.getElementById("settings-title").value.trim()
  config.showSearch = document.getElementById("settings-search").checked
  config.showRowCount = document.getElementById("settings-row-count").checked
  config.showExportButtons = document.getElementById("settings-export").checked
  config.showRefreshButton = document.getElementById("settings-refresh").checked
  config.showSettingsButton = document.getElementById("settings-show-config").checked
  config.exportButtonColor = document.getElementById("settings-export-color").value.trim()
  config.exportButtonTextColor = document.getElementById("settings-export-text-color").value.trim()
  config.exportFilename = document.getElementById("settings-export-filename").value.trim()

  saveConfig()
  applyGeneralSettings()

  document.getElementById("settings-modal").style.display = "none"
  renderTable()
}

function applyGeneralSettings() {
  const searchBox = document.querySelector(".search-box")
  const exportDropdown = document.getElementById("export-dropdown")
  const refreshBtn = document.getElementById("refresh-btn")
  const settingsBtn = document.getElementById("settings-btn")
  const rowCount = document.getElementById("row-count")
  const mainTitle = document.getElementById("main-title")

  if (searchBox) searchBox.style.display = config.showSearch ? "flex" : "none"
  if (rowCount) rowCount.style.display = config.showRowCount ? "block" : "none"
  if (exportDropdown) exportDropdown.style.display = config.showExportButtons ? "inline-block" : "none"
  if (refreshBtn) refreshBtn.style.display = config.showRefreshButton ? "inline-flex" : "none"
  if (settingsBtn) settingsBtn.style.display = config.showSettingsButton ? "inline-flex" : "none"

  if (mainTitle) {
    const displayTitle = config.tableTitle || (currentWorksheet ? currentWorksheet.name : "Mi Tabla")
    mainTitle.textContent = displayTitle
  }

  const exportBtnText = document.getElementById("export-btn-text")
  if (exportBtnText) exportBtnText.textContent = config.exportButtonText || "Exportar"

  const exportBtn = document.getElementById("export-btn")
  if (exportBtn) {
    exportBtn.style.backgroundColor = config.exportButtonColor || "#2563eb"
    exportBtn.style.color = config.exportButtonTextColor || "#ffffff"
  }

  const excelOpt = document.getElementById("export-excel-opt")
  const csvOpt = document.getElementById("export-csv-opt")
  const pdfOpt = document.getElementById("export-pdf-opt")

  if (excelOpt) excelOpt.style.display = config.exportEnableExcel ? "flex" : "none"
  if (csvOpt) csvOpt.style.display = config.exportEnableCSV ? "flex" : "none"
  if (pdfOpt) pdfOpt.style.display = config.exportEnablePDF ? "flex" : "none"
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
    showSearch: savedConfig.showSearch !== false,
    showRowCount: savedConfig.showRowCount !== false,
    showExportButtons: savedConfig.showExportButtons !== false,
    showRefreshButton: savedConfig.showRefreshButton !== false,
    showSettingsButton: savedConfig.showSettingsButton !== false,
    columns: savedConfig.columns || {},
    rowsPerPage: savedConfig.rowsPerPage || 100,
    exportButtonText: savedConfig.exportButtonText || "Exportar",
    exportButtonColor: savedConfig.exportButtonColor || "#2563eb",
    exportButtonTextColor: savedConfig.exportButtonTextColor || "#ffffff",
    exportEnableExcel: savedConfig.exportEnableExcel !== false,
    exportEnableCSV: savedConfig.exportEnableCSV !== false,
    exportEnablePDF: savedConfig.exportEnablePDF !== false,
    exportFilename: savedConfig.exportFilename || "export",
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

  exportData.push(
    exportColumns.map((col) => {
      const colName = col.fieldName || col.name
      return config.columns[colName]?.displayName || colName
    }),
  )

  visibleData.forEach((row) => {
    exportData.push(
      exportColumns.map((col) => {
        const cellData = row[col.index]
        if (cellData === null || cellData === undefined) return ""
        if (typeof cellData === "object") {
          return cellData.formattedValue || cellData.value || cellData.nativeValue || ""
        }
        return cellData
      }),
    )
  })

  var ws = XLSX.utils.aoa_to_sheet(exportData)
  XLSX.utils.book_append_sheet(wb, ws, "Datos")

  const customName = config.exportFilename || "export"
  const timestamp = new Date().toISOString().split("T")[0]
  const fileName = `${customName}_${timestamp}.xlsx`
  XLSX.writeFile(wb, fileName)
}

function exportToCSV() {
  if (!fullData) return

  var exportColumns = fullData.columns.filter((col) => {
    const colName = col.fieldName || col.name
    return config.columns[colName]?.includeInExport !== false
  })

  var csv = []
  csv.push(
    exportColumns
      .map((col) => {
        const colName = col.fieldName || col.name
        return escapeCSV(config.columns[colName]?.displayName || colName)
      })
      .join(","),
  )

  visibleData.forEach((row) => {
    csv.push(
      exportColumns
        .map((col) => {
          const cellData = row[col.index]
          let value = ""
          if (cellData === null || cellData === undefined) {
            value = ""
          } else if (typeof cellData === "object") {
            value = cellData.formattedValue || cellData.value || cellData.nativeValue || ""
          } else {
            value = cellData
          }
          return escapeCSV(value)
        })
        .join(","),
    )
  })

  var blob = new Blob(["\ufeff" + csv.join("\n")], { type: "text/csv;charset=utf-8;" })
  var link = document.createElement("a")
  link.href = URL.createObjectURL(blob)

  const customName = config.exportFilename || "export"
  const timestamp = new Date().toISOString().split("T")[0]
  const fileName = `${customName}_${timestamp}.csv`
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

function toggleExportDropdown(e) {
  e.stopPropagation()
  const menu = document.getElementById("export-dropdown-menu")
  if (menu) {
    menu.style.display = menu.style.display === "none" ? "block" : "none"
  }
}

function handleExport(format) {
  const menu = document.getElementById("export-dropdown-menu")
  if (menu) menu.style.display = "none"

  if (format === "excel" && config.exportEnableExcel) {
    exportToExcel()
  } else if (format === "csv" && config.exportEnableCSV) {
    exportToCSV()
  } else if (format === "pdf" && config.exportEnablePDF) {
    alert("Exportación a PDF próximamente")
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeExtension)
} else {
  initializeExtension()
}
