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
  columns: {}, // { columnName: { visible: true, includeInExport: true, displayName: "", conditionalRules: [], conditionalFormat: { enabled: false, operator: '', value: '', value2: '', cellBg: false, cellBgColor: '', cellText: false, cellTextColor: '', rowBg: false, rowBgColor: '', rowText: false, rowTextColor: '', addIcon: false, icon: '', iconColor: '' } } }
  rowsPerPage: 100,
  exportButtonText: "Exportar",
  exportButtonColor: "#2563eb", // Default color
  exportButtonTextColor: "#ffffff", // Added exportButtonTextColor config
  exportEnableExcel: true,
  exportEnableCSV: true,
  exportEnablePDF: true,
  exportFilename: "export", // Added exportFilename config
}

let isSaving = false

async function safeSettingsSave() {
  if (isSaving) {
    console.log("[v0] Save already in progress, skipping...")
    return false
  }

  try {
    isSaving = true
    await tableau.extensions.settings.saveAsync()
    console.log("[v0] Settings saved successfully")
    return true
  } catch (error) {
    console.error("[v0] Error saving settings:", error)
    return false
  } finally {
    isSaving = false
  }
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
      setupTableauEventListeners()
      applyGeneralSettings() // Ensure this function is declared before use
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
          conditionalRules: [],
          conditionalFormat: {
            enabled: false,
            operator: "",
            value: "",
            value2: "",
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
    console.log("[v0] fullData:", fullData)
    console.log("[v0] visibleData:", visibleData)
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
  console.log("[v0] Datos visibles:", visibleData.length)

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
    const rowFormattingApplied = false
    const rowBgColor = null
    const rowTextColor = null

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

      td.textContent = cellValue

      applyConditionalFormatting(td, col, cellValue, numericValue, config, rowIdx)
      tr.appendChild(td)
    })

    if (rowFormattingApplied) {
      if (rowBgColor) tr.style.backgroundColor = rowBgColor
      if (rowTextColor) tr.style.color = rowTextColor
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

  setTimeout(() => {
    applyDesignSettings()
  }, 100)
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
        conditionalRules: config.columns[colName]?.conditionalRules || [],
        conditionalFormat: config.columns[colName]?.conditionalFormat || {
          enabled: false,
          operator: "",
          value: "",
          value2: "",
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
    await safeSettingsSave()
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

function saveConfig() {
  tableau.extensions.settings.set("config", JSON.stringify(config))
  safeSettingsSave()
}

function loadConfig() {
  const settings = tableau.extensions.settings.getAll()

  console.log("[v0] Loading configuration from settings:", settings)

  const columnsConfigStr = settings.columnsConfig || "{}"
  let columnsConfig = {}
  try {
    columnsConfig = JSON.parse(columnsConfigStr)
    console.log("[v0] Parsed columnsConfig:", columnsConfig)
  } catch (error) {
    console.error("[v0] Error parsing columnsConfig:", error)
    columnsConfig = {}
  }

  config = {
    tableTitle: settings.tableTitle || "",
    showSearch: settings.showSearch !== "false",
    showRowCount: settings.showRowCount !== "false",
    showExportButtons: settings.showExportButtons !== "false",
    showRefreshButton: settings.showRefreshButton !== "false",
    showSettingsButton: settings.showSettingsButton !== "false",
    columns: columnsConfig, // Use the parsed columnsConfig
    rowsPerPage: Number.parseInt(settings.rowsPerPage) || 100,
    exportButtonText: settings.exportButtonText || "Exportar",
    exportButtonColor: settings.exportButtonColor || "#2563eb",
    exportButtonTextColor: settings.exportButtonTextColor || "#ffffff",
    exportEnableExcel: settings.exportEnableExcel !== "false",
    exportEnableCSV: settings.exportEnableCSV !== "false",
    exportEnablePDF: settings.exportEnablePDF !== "false",
    exportFilename: settings.exportFilename || "export",
  }

  console.log("[v0] Configuración cargada, columnas:", Object.keys(config.columns).length)
  console.log("[v0] Full config:", config)
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

function setupTableauEventListeners() {
  console.log("[v0] Setting up Tableau event listeners")

  let worksheet
  if (tableau.extensions.dashboardContent) {
    worksheet = currentWorksheet
  } else if (tableau.extensions.worksheetContent) {
    worksheet = tableau.extensions.worksheetContent.worksheet
  }

  if (!worksheet) {
    console.log("[v0] No worksheet found for event listeners")
    return
  }

  console.log("[v0] Setting up listeners for worksheet:", worksheet.name)

  // Listen for filter changes
  worksheet.addEventListener(tableau.TableauEventType.FilterChanged, async (event) => {
    console.log("[v0] 🔄 Filter changed event:", event)
    loadConfig()
    await loadWorksheetData(worksheet)
  })

  // Listen for mark selection changes
  worksheet.addEventListener(tableau.TableauEventType.MarkSelectionChanged, async (event) => {
    console.log("[v0] 🔄 Mark selection changed:", event)
    loadConfig()
    await loadWorksheetData(worksheet)
  })

  // Listen for data changes
  worksheet.addEventListener(tableau.TableauEventType.SummaryDataChanged, async (event) => {
    console.log("[v0] 🔄 Summary data changed:", event)
    loadConfig()
    await loadWorksheetData(worksheet)
  })

  console.log("[v0] ✅ Tableau event listeners setup complete")
}

function applyConditionalFormatting(td, col, cellValue, numericValue, config, rowIdx) {
  const colName = col.fieldName || col.name
  const columnConfig = config.columns[colName]

  if (rowIdx === 0 && columnConfig) {
    console.log(`[v0] 🎨 Checking conditional format for column [${colName}]`)
    console.log(`[v0]   - columnConfig:`, columnConfig)
    console.log(`[v0]   - Has conditionalRules:`, !!columnConfig.conditionalRules)
    if (columnConfig.conditionalRules) {
      console.log(`[v0]   - Rules:`, columnConfig.conditionalRules)
    }
  }

  if (!columnConfig || !columnConfig.conditionalRules || !Array.isArray(columnConfig.conditionalRules)) {
    return
  }

  for (let i = 0; i < columnConfig.conditionalRules.length; i++) {
    const cf = columnConfig.conditionalRules[i]
    let conditionMet = false

    const isTextValue = typeof cellValue === "string" || col.dataType === "string"

    if (rowIdx === 0) {
      console.log(`[v0]   - Evaluating rule ${i + 1}:`, cf)
      console.log(`[v0]   - Cell value: "${cellValue}" (type: ${typeof cellValue})`)
    }

    if (isTextValue) {
      const strValue = String(cellValue)
      switch (cf.operator) {
        case "equals":
          conditionMet = strValue === cf.value
          break
        case "notEquals":
          conditionMet = strValue !== cf.value
          break
        case "contains":
          conditionMet = strValue.includes(cf.value)
          break
        case "notContains":
          conditionMet = !strValue.includes(cf.value)
          break
        case "startsWith":
          conditionMet = strValue.startsWith(cf.value)
          break
        case "endsWith":
          conditionMet = strValue.endsWith(cf.value)
          break
        case "isEmpty":
          conditionMet = strValue === "" || strValue === null || strValue === undefined
          break
        case "isNotEmpty":
          conditionMet = strValue !== "" && strValue !== null && strValue !== undefined
          break
      }
    } else {
      const cellNumValue = Number.parseFloat(numericValue)
      const condValue = Number.parseFloat(cf.value)
      const condValue2 = Number.parseFloat(cf.value2)

      if (!isNaN(cellNumValue)) {
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
          case "between":
            conditionMet = cellNumValue >= condValue && cellNumValue <= condValue2
            if (rowIdx === 0) {
              console.log(
                `[v0] Between check: ${cellNumValue} between ${condValue} and ${condValue2} = ${conditionMet}`,
              )
            }
            break
        }
      }
    }

    if (conditionMet) {
      if (rowIdx === 0) {
        console.log(`[v0]   ✅ Rule ${i + 1} MATCHED!`)
        console.log(`[v0]   - Applying format:`, {
          bgColor: cf.bgColor,
          textColor: cf.textColor,
          rowBgColor: cf.rowBgColor,
          rowTextColor: cf.rowTextColor,
        })
      }

      if (cf.bgColor) {
        td.style.setProperty("background-color", cf.bgColor, "important")
      }
      if (cf.textColor) {
        td.style.setProperty("color", cf.textColor, "important")
      }

      // Apply row formatting
      if (cf.rowBgColor || cf.rowTextColor) {
        const row = td.parentElement
        if (row) {
          if (cf.rowBgColor) {
            row.style.setProperty("background-color", cf.rowBgColor, "important")
          }
          if (cf.rowTextColor) {
            row.style.setProperty("color", cf.rowTextColor, "important")
          }
        }
      }

      // Apply icon if specified
      if (cf.icon && cf.icon !== "ninguno") {
        const iconSpan = document.createElement("span")
        iconSpan.textContent = cf.icon
        iconSpan.style.marginRight = "4px"
        if (cf.iconColor) {
          iconSpan.style.color = cf.iconColor
        }
        td.insertBefore(iconSpan, td.firstChild)
      }

      // Only apply the first matching rule
      break
    }
  }
}

function applyGeneralSettings() {
  // Placeholder for applyGeneralSettings function
  console.log("[v0] Applying general settings")
}

function applyDesignSettings() {
  const settings = tableau.extensions.settings.getAll()

  // Apply header colors
  const headerBg = settings.headerBackgroundColor || "#f3f4f6"
  const headerText = settings.headerTextColor || "#111827"
  const headerFont = settings.headerFont || "Arial, sans-serif"
  const headerFontSize = settings.headerFontSize || "14px"

  const headers = document.querySelectorAll("#table-header th")
  headers.forEach((th) => {
    th.style.backgroundColor = headerBg
    th.style.color = headerText
    th.style.fontFamily = headerFont
    th.style.fontSize = headerFontSize
  })

  // Apply body colors
  const bodyFont = settings.bodyFont || "Arial, sans-serif"
  const bodyFontSize = settings.bodyFontSize || "13px"
  const bodyTextColor = settings.bodyTextColor || "#374151"
  const rowEvenBg = settings.rowEvenColor || "#ffffff"
  const rowOddBg = settings.rowOddColor || "#f9fafb"

  const rows = document.querySelectorAll("#table-body tr")
  rows.forEach((tr, index) => {
    const cells = tr.querySelectorAll("td")
    cells.forEach((td) => {
      td.style.fontFamily = bodyFont
      td.style.fontSize = bodyFontSize
      td.style.color = bodyTextColor
    })

    // Apply row background if no conditional formatting applied
    if (!tr.style.backgroundColor) {
      tr.style.backgroundColor = index % 2 === 0 ? rowEvenBg : rowOddBg
    }
  })

  // Apply border styling
  const borderColor = settings.borderColor || "#e5e7eb"
  const borderWidth = settings.borderWidth || "1px"

  const table = document.querySelector(".data-table")
  if (table) {
    table.style.setProperty("--border-color", borderColor)
    table.style.setProperty("--border-width", borderWidth)
  }

  console.log("[v0] Design settings applied")
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeExtension)
} else {
  initializeExtension()
}
