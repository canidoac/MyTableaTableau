// Super Table Pro Extension v4.0 - Completamente refactorizado

var tableau = window.tableau
var XLSX = window.XLSX

// Variables globales
var currentWorksheet = null
var fullData = null
var visibleData = null
var isWorksheetContext = false

// Configuración completa
var config = {
  // General
  tableTitle: "", // Added customizable table title
  showOnlineStatus: true,
  showSearch: true,
  showExportButtons: true,
  showRefreshButton: true,

  // Columnas
  columns: {}, // { columnName: { visible: true, visibleToUser: true, includeInExport: true, tooltip: '', width: 'auto' } }

  // Formato condicional por columna
  columnFormatting: {}, // { columnName: { type: 'number'|'text', rules: [...] } }

  // Formato condicional de filas
  rowFormatting: {
    enabled: false,
    rules: [], // [{ column: 'Status', operator: '=', value: 'Alerta', backgroundColor: '#fee2e2', textColor: '#991b1b' }]
  },

  // Performance
  virtualization: true,
  rowsPerPage: 100,
}

var sortState = { column: null, ascending: true }
var searchQuery = ""
var currentPage = 0

// Inicialización
function initializeExtension() {
  console.log("[v0] Iniciando Super Table Pro v4.0")

  tableau.extensions
    .initializeAsync({ configure: openConfigDialog })
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
    })
    .catch((err) => {
      console.error("[v0] Error:", err)
      showError("Error al inicializar: " + err.toString())
    })
}

function openConfigDialog() {
  console.log("[v0] Abriendo diálogo de configuración")

  // Guardar las columnas actuales en config para que el diálogo las pueda usar
  if (fullData && fullData.columns) {
    config.columns = fullData.columns.map((col) => ({ name: col.fieldName }))
    tableau.extensions.settings.set("config", JSON.stringify(config))
  }

  var popupUrl = window.location.origin + window.location.pathname.replace("index.html", "config.html")

  tableau.extensions.ui
    .displayDialogAsync(popupUrl, "", { height: 600, width: 800 })
    .then((closePayload) => {
      console.log("[v0] Diálogo cerrado:", closePayload)
      if (closePayload === "saved") {
        loadConfig()
        if (currentWorksheet) {
          loadWorksheetData()
        }
      }
    })
    .catch((error) => {
      console.error("[v0] Error al abrir diálogo:", error)
    })
}

function setupDashboardContext() {
  var dashboard = tableau.extensions.dashboardContent.dashboard
  var selector = document.getElementById("worksheet-selector")
  selector.innerHTML = ""

  dashboard.worksheets.forEach((ws, i) => {
    var opt = document.createElement("option")
    opt.value = ws.name
    opt.textContent = ws.name
    if (i === 0) opt.selected = true
    selector.appendChild(opt)
  })

  selector.parentElement.style.display = "block"
  updateStatus("Conectado", "connected")

  if (dashboard.worksheets.length > 0) {
    loadWorksheet(dashboard.worksheets[0].name)
  }
}

function setupWorksheetContext() {
  currentWorksheet = tableau.extensions.worksheetContent.worksheet
  document.getElementById("worksheet-selector").parentElement.style.display = "none"
  updateStatus("Conectado", "connected")
  loadWorksheetData()
}

function setupEventListeners() {
  document.getElementById("search-input").addEventListener("input", handleSearch)
  document.getElementById("worksheet-selector").addEventListener("change", (e) => loadWorksheet(e.target.value))
  document.getElementById("export-excel").addEventListener("click", exportToExcel)
  document.getElementById("export-csv").addEventListener("click", exportToCSV)
  document.getElementById("refresh-btn").addEventListener("click", refreshData)
  document.getElementById("settings-btn").addEventListener("click", openSettings)
  document.getElementById("columns-btn").addEventListener("click", openColumnManager)
  document.getElementById("clear-filter").addEventListener("click", clearSearch)

  // Modales
  document.querySelectorAll(".close-modal").forEach((btn) => {
    btn.addEventListener("click", function () {
      this.closest(".modal").style.display = "none"
    })
  })

  document.getElementById("save-settings-btn").addEventListener("click", saveSettings)
  document.getElementById("add-row-rule-btn").addEventListener("click", addRowRule)
}

function loadWorksheet(name) {
  var dashboard = tableau.extensions.dashboardContent.dashboard
  currentWorksheet = dashboard.worksheets.find((ws) => ws.name === name)
  loadWorksheetData()
}

function loadWorksheetData() {
  showLoading()

  currentWorksheet
    .getSummaryDataAsync({ maxRows: 10000 })
    .then((dataTable) => {
      console.log("[v0] Datos cargados:", dataTable.data.length, "filas")

      fullData = {
        columns: dataTable.columns.map((col) => ({
          name: col.fieldName,
          type: col.dataType,
          index: col.index,
        })),
        rows: dataTable.data.map((row) => row.map((cell) => cell.value)),
      }

      // Inicializar configuración de columnas si no existe
      fullData.columns.forEach((col) => {
        if (!config.columns[col.name]) {
          config.columns[col.name] = {
            visible: true,
            visibleToUser: true, // Usuario puede mostrar/ocultar
            includeInExport: true,
            tooltip: "",
            width: "auto",
          }
        }
      })

      applyFiltersAndSort()
      renderTable()
    })
    .catch((err) => {
      console.error("[v0] Error cargando datos:", err)
      showError("Error: " + err.toString())
    })
}

function applyFiltersAndSort() {
  var filtered = fullData.rows

  // Búsqueda
  if (searchQuery) {
    filtered = filtered.filter((row) => {
      return row.some((cell) => {
        if (cell == null) return false
        return String(cell).toLowerCase().includes(searchQuery.toLowerCase())
      })
    })
  }

  // Ordenamiento
  if (sortState.column !== null) {
    filtered = filtered.slice().sort((a, b) => {
      var valA = a[sortState.column]
      var valB = b[sortState.column]

      if (valA == null) return 1
      if (valB == null) return -1

      var comparison = 0
      if (typeof valA === "number" && typeof valB === "number") {
        comparison = valA - valB
      } else {
        comparison = String(valA).localeCompare(String(valB))
      }

      return sortState.ascending ? comparison : -comparison
    })
  }

  visibleData = filtered
  currentPage = 0
}

function renderTable() {
  document.getElementById("loading").style.display = "none"
  document.getElementById("table-container").style.display = "block"

  var visibleColumns = fullData.columns.filter((col) => config.columns[col.name]?.visible)

  // Header
  var thead = document.getElementById("table-header")
  thead.innerHTML = ""
  var headerRow = document.createElement("tr")

  visibleColumns.forEach((col) => {
    var th = document.createElement("th")
    var colConfig = config.columns[col.name]

    var sortIcon = sortState.column === col.index ? (sortState.ascending ? "↑" : "↓") : "↕"

    th.innerHTML = `
      <div class="th-content" title="${colConfig.tooltip || col.name}">
        <span>${escapeHtml(col.name)}</span>
        <button class="sort-btn" data-index="${col.index}">${sortIcon}</button>
      </div>
    `

    headerRow.appendChild(th)
  })

  thead.appendChild(headerRow)

  // Body con virtualización
  var tbody = document.getElementById("table-body")
  tbody.innerHTML = ""

  var startRow = currentPage * config.rowsPerPage
  var endRow = Math.min(startRow + config.rowsPerPage, visibleData.length)
  var pageData = visibleData.slice(startRow, endRow)

  pageData.forEach((row, rowIdx) => {
    var tr = document.createElement("tr")

    var rowStyle = getRowFormatting(row)
    if (rowStyle.backgroundColor) {
      tr.style.backgroundColor = rowStyle.backgroundColor
    }
    if (rowStyle.textColor) {
      tr.style.color = rowStyle.textColor
    }

    visibleColumns.forEach((col) => {
      var td = document.createElement("td")
      var value = row[col.index]
      var colConfig = config.columns[col.name]

      // Tooltip
      if (colConfig.tooltip) {
        td.title = colConfig.tooltip
      }

      if (value == null) {
        td.className = "cell-null"
        td.textContent = "-"
      } else {
        var formatted = formatCell(value, col.name, col.type)
        td.innerHTML = formatted.html
        td.className = formatted.className
      }

      tr.appendChild(td)
    })

    tbody.appendChild(tr)
  })

  // Info y paginación
  updateTableInfo()
  setupSortListeners()
}

function getRowFormatting(row) {
  if (!config.rowFormatting.enabled || !config.rowFormatting.rules.length) {
    return {}
  }

  for (var i = 0; i < config.rowFormatting.rules.length; i++) {
    var rule = config.rowFormatting.rules[i]
    var colIndex = fullData.columns.findIndex((c) => c.name === rule.column)

    if (colIndex === -1) continue

    var cellValue = row[colIndex]
    var matches = false

    switch (rule.operator) {
      case "=":
        matches = String(cellValue).toLowerCase() === String(rule.value).toLowerCase()
        break
      case "!=":
        matches = String(cellValue).toLowerCase() !== String(rule.value).toLowerCase()
        break
      case "contains":
        matches = String(cellValue).toLowerCase().includes(String(rule.value).toLowerCase())
        break
      case ">":
        matches = Number(cellValue) > Number(rule.value)
        break
      case "<":
        matches = Number(cellValue) < Number(rule.value)
        break
    }

    if (matches) {
      return {
        backgroundColor: rule.backgroundColor,
        textColor: rule.textColor,
      }
    }
  }

  return {}
}

function formatCell(value, columnName, dataType) {
  var formatting = config.columnFormatting[columnName]
  var html = ""
  var className = ""

  if (formatting && formatting.rules && formatting.rules.length > 0) {
    for (var i = 0; i < formatting.rules.length; i++) {
      var rule = formatting.rules[i]
      var matches = false

      if (formatting.type === "text") {
        matches = String(value).toLowerCase().includes(rule.text.toLowerCase())
      } else if (formatting.type === "number" && typeof value === "number") {
        if (rule.operator === ">") matches = value > rule.value
        else if (rule.operator === "<") matches = value < rule.value
        else if (rule.operator === "=") matches = value === rule.value
      }

      if (matches) {
        var icon = ""
        if (rule.icon === "circle") {
          var iconColor = rule.color || "#64748b"
          icon = `<span style="color: ${iconColor}; font-size: 14px; margin-right: 6px;">●</span>`
        } else if (rule.icon === "diamond") {
          icon = `<span style="color: ${rule.color || "#64748b"}; font-size: 14px; margin-right: 6px;">◆</span>`
        } else if (rule.icon === "arrow-up") {
          icon = `<span style="color: #16a34a; font-size: 14px; margin-right: 6px;">▲</span>`
        } else if (rule.icon === "arrow-down") {
          icon = `<span style="color: #dc2626; font-size: 14px; margin-right: 6px;">▼</span>`
        }

        html = icon + escapeHtml(String(value))
        className = "cell-formatted"
        break
      }
    }
  }

  if (!html) {
    if (typeof value === "number") {
      html = value.toLocaleString("es-ES", { maximumFractionDigits: 2 })
      className = "cell-number"
    } else if (value instanceof Date) {
      html = value.toLocaleDateString("es-ES")
      className = "cell-date"
    } else {
      html = escapeHtml(String(value))
    }
  }

  return { html, className }
}

function updateTableInfo() {
  var title = config.tableTitle || currentWorksheet.name
  document.getElementById("table-title").textContent = title

  var totalRows = visibleData.length
  var startRow = currentPage * config.rowsPerPage + 1
  var endRow = Math.min((currentPage + 1) * config.rowsPerPage, totalRows)

  document.getElementById("row-count").textContent =
    `Mostrando ${startRow}-${endRow} de ${totalRows.toLocaleString()} filas`

  if (searchQuery) {
    document.getElementById("filter-info").style.display = "flex"
    document.getElementById("filtered-count").textContent =
      `Filtrado de ${fullData.rows.length.toLocaleString()} filas totales`
  } else {
    document.getElementById("filter-info").style.display = "none"
  }

  // Paginación
  updatePagination()
}

function updatePagination() {
  var container = document.getElementById("pagination")
  container.innerHTML = ""

  var totalPages = Math.ceil(visibleData.length / config.rowsPerPage)

  if (totalPages <= 1) {
    container.style.display = "none"
    return
  }

  container.style.display = "flex"

  // Botón anterior
  var prevBtn = document.createElement("button")
  prevBtn.className = "btn btn-sm btn-secondary"
  prevBtn.textContent = "← Anterior"
  prevBtn.disabled = currentPage === 0
  prevBtn.onclick = () => {
    currentPage--
    renderTable()
  }
  container.appendChild(prevBtn)

  // Info de página
  var pageInfo = document.createElement("span")
  pageInfo.textContent = `Página ${currentPage + 1} de ${totalPages}`
  pageInfo.style.padding = "0 16px"
  container.appendChild(pageInfo)

  // Botón siguiente
  var nextBtn = document.createElement("button")
  nextBtn.className = "btn btn-sm btn-secondary"
  nextBtn.textContent = "Siguiente →"
  nextBtn.disabled = currentPage >= totalPages - 1
  nextBtn.onclick = () => {
    currentPage++
    renderTable()
  }
  container.appendChild(nextBtn)
}

function setupSortListeners() {
  document.querySelectorAll(".sort-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      var colIndex = Number.parseInt(this.getAttribute("data-index"))

      if (sortState.column === colIndex) {
        sortState.ascending = !sortState.ascending
      } else {
        sortState.column = colIndex
        sortState.ascending = true
      }

      applyFiltersAndSort()
      renderTable()
    })
  })
}

function handleSearch(e) {
  searchQuery = e.target.value.trim()
  applyFiltersAndSort()
  renderTable()
}

function clearSearch() {
  document.getElementById("search-input").value = ""
  searchQuery = ""
  applyFiltersAndSort()
  renderTable()
}

function openColumnManager() {
  var modal = document.getElementById("columns-modal")
  var list = document.getElementById("columns-list")
  list.innerHTML = ""

  fullData.columns.forEach((col) => {
    var colConfig = config.columns[col.name]
    var div = document.createElement("div")
    div.className = "column-item"

    div.innerHTML = `
      <div class="column-item-header">
        <label class="checkbox-label">
          <input type="checkbox" class="column-visibility" data-column="${col.name}" 
            ${colConfig.visible ? "checked" : ""}>
          <span>${escapeHtml(col.name)}</span>
        </label>
        <button class="btn-icon btn-sm config-column-btn" data-column="${col.name}" title="Configurar">
          ⚙️
        </button>
      </div>
      <div class="column-options" style="margin-left: 28px; font-size: 12px; color: #64748b;">
        <label class="checkbox-label" style="font-size: 12px;">
          <input type="checkbox" class="column-user-toggle" data-column="${col.name}"
            ${colConfig.visibleToUser ? "checked" : ""}>
          <span>Usuario puede mostrar/ocultar</span>
        </label>
        <label class="checkbox-label" style="font-size: 12px;">
          <input type="checkbox" class="column-export" data-column="${col.name}"
            ${colConfig.includeInExport ? "checked" : ""}>
          <span>Incluir en exportación</span>
        </label>
      </div>
    `

    list.appendChild(div)
  })

  // Event listeners
  list.querySelectorAll(".column-visibility").forEach((checkbox) => {
    checkbox.addEventListener("change", function () {
      var colName = this.getAttribute("data-column")
      config.columns[colName].visible = this.checked
    })
  })

  list.querySelectorAll(".column-user-toggle").forEach((checkbox) => {
    checkbox.addEventListener("change", function () {
      var colName = this.getAttribute("data-column")
      config.columns[colName].visibleToUser = this.checked
    })
  })

  list.querySelectorAll(".column-export").forEach((checkbox) => {
    checkbox.addEventListener("change", function () {
      var colName = this.getAttribute("data-column")
      config.columns[colName].includeInExport = this.checked
    })
  })

  list.querySelectorAll(".config-column-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      var colName = this.getAttribute("data-column")
      openColumnConfig(colName)
    })
  })

  modal.style.display = "flex"
}

function openColumnConfig(columnName) {
  var modal = document.getElementById("column-config-modal")
  var colConfig = config.columns[columnName]
  var formatting = config.columnFormatting[columnName] || { type: "text", rules: [] }

  document.getElementById("config-col-name").textContent = columnName
  document.getElementById("config-col-tooltip").value = colConfig.tooltip || ""

  // Tipo de formato
  document.getElementById("config-format-type").value = formatting.type || "text"

  // Mostrar reglas existentes
  renderFormatRules(columnName, formatting.rules)

  modal.setAttribute("data-column", columnName)
  modal.style.display = "flex"
}

function renderFormatRules(columnName, rules) {
  var container = document.getElementById("format-rules-list")
  container.innerHTML = ""

  if (!rules || rules.length === 0) {
    container.innerHTML = '<p class="help-text">No hay reglas de formato. Agrega una para comenzar.</p>'
    return
  }

  rules.forEach((rule, idx) => {
    var ruleDiv = document.createElement("div")
    ruleDiv.className = "format-rule-item"

    var ruleText = ""
    if (rule.text) {
      ruleText = `Contiene "${rule.text}"`
    } else if (rule.operator && rule.value !== undefined) {
      ruleText = `${rule.operator} ${rule.value}`
    }

    var iconPreview = ""
    if (rule.icon === "circle") {
      iconPreview = `<span style="color: ${rule.color};">●</span>`
    } else if (rule.icon === "diamond") {
      iconPreview = `<span style="color: ${rule.color};">◆</span>`
    } else if (rule.icon === "arrow-up") {
      iconPreview = '<span style="color: #16a34a;">▲</span>'
    } else if (rule.icon === "arrow-down") {
      iconPreview = '<span style="color: #dc2626;">▼</span>'
    }

    ruleDiv.innerHTML = `
      ${iconPreview}
      <span class="rule-text">${ruleText}</span>
      <button class="rule-delete-btn" data-index="${idx}">×</button>
    `

    container.appendChild(ruleDiv)
  })

  // Delete listeners
  container.querySelectorAll(".rule-delete-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      var idx = Number.parseInt(this.getAttribute("data-index"))
      rules.splice(idx, 1)
      renderFormatRules(columnName, rules)
    })
  })
}

function saveColumnConfig() {
  var modal = document.getElementById("column-config-modal")
  var columnName = modal.getAttribute("data-column")

  // Guardar tooltip
  config.columns[columnName].tooltip = document.getElementById("config-col-tooltip").value

  // Guardar en configuración
  saveConfig()
  modal.style.display = "none"

  // Re-renderizar
  renderTable()
}

function saveColumnManager() {
  saveConfig()
  document.getElementById("columns-modal").style.display = "none"
  renderTable()
}

function openSettings() {
  var modal = document.getElementById("settings-modal")

  // Cargar valores actuales
  document.getElementById("settings-title").value = config.tableTitle || "" // Load table title
  document.getElementById("settings-online").checked = config.showOnlineStatus
  document.getElementById("settings-search").checked = config.showSearch
  document.getElementById("settings-export").checked = config.showExportButtons
  document.getElementById("settings-refresh").checked = config.showRefreshButton

  var columnSelector = document.getElementById("row-rule-column")
  columnSelector.innerHTML = '<option value="">Selecciona una columna...</option>'
  if (fullData && fullData.columns) {
    fullData.columns.forEach((col) => {
      var option = document.createElement("option")
      option.value = col.name
      option.textContent = col.name
      columnSelector.appendChild(option)
    })
  }

  // Cargar estado del formato de fila
  document.getElementById("settings-row-format").checked = config.rowFormatting.enabled

  // Reglas de formato de fila
  renderRowRules()

  modal.style.display = "flex"
  switchTab("general")
}

function switchTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"))
  document.querySelectorAll(".tab-content").forEach((content) => content.classList.remove("active"))

  document.querySelector(`[data-tab="${tabName}"]`).classList.add("active")
  document.getElementById(tabName + "-tab").classList.add("active")
}

function renderRowRules() {
  var container = document.getElementById("row-rules-list")
  container.innerHTML = ""

  var rules = config.rowFormatting.rules || []

  if (rules.length === 0) {
    container.innerHTML =
      '<p class="help-text">No hay reglas de fila. Las reglas pintan toda la fila según condiciones.</p>'
    return
  }

  rules.forEach((rule, idx) => {
    var div = document.createElement("div")
    div.className = "row-rule-item"

    div.innerHTML = `
      <div style="flex: 1;">
        <strong>${rule.column}</strong> ${rule.operator} "${rule.value}"
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <div style="width: 24px; height: 24px; background: ${rule.backgroundColor}; border: 1px solid #e2e8f0; border-radius: 4px;"></div>
        <button class="rule-delete-btn" data-index="${idx}">×</button>
      </div>
    `

    container.appendChild(div)
  })

  // Delete listeners
  container.querySelectorAll(".rule-delete-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      var idx = Number.parseInt(this.getAttribute("data-index"))
      config.rowFormatting.rules.splice(idx, 1)
      renderRowRules()
    })
  })
}

function addRowRule() {
  var column = document.getElementById("row-rule-column").value
  var operator = document.getElementById("row-rule-operator").value
  var value = document.getElementById("row-rule-value").value
  var bgColor = document.getElementById("row-rule-bgcolor").value
  var textColor = document.getElementById("row-rule-textcolor").value

  if (!column || !value) {
    alert("Por favor completa todos los campos")
    return
  }

  if (!config.rowFormatting.rules) {
    config.rowFormatting.rules = []
  }

  config.rowFormatting.rules.push({
    column: column,
    operator: operator,
    value: value,
    backgroundColor: bgColor,
    textColor: textColor,
  })

  // Limpiar
  document.getElementById("row-rule-value").value = ""

  renderRowRules()
}

function saveSettings() {
  config.tableTitle = document.getElementById("settings-title").value.trim() // Save custom title
  config.showOnlineStatus = document.getElementById("settings-online").checked
  config.showSearch = document.getElementById("settings-search").checked
  config.showExportButtons = document.getElementById("settings-export").checked
  config.showRefreshButton = document.getElementById("settings-refresh").checked
  config.rowFormatting.enabled = document.getElementById("settings-row-format").checked

  document.getElementById("online-indicator").style.display = config.showOnlineStatus ? "flex" : "none"
  document.querySelector(".search-box").style.display = config.showSearch ? "flex" : "none"
  document.getElementById("export-excel").style.display = config.showExportButtons ? "inline-flex" : "none"
  document.getElementById("export-csv").style.display = config.showExportButtons ? "inline-flex" : "none"
  document.getElementById("refresh-btn").style.display = config.showRefreshButton ? "inline-flex" : "none"

  saveConfig()
  document.getElementById("settings-modal").style.display = "none"
  renderTable()
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
      config = Object.assign(config, parsed)
    } catch (e) {
      console.error("[v0] Error cargando config:", e)
    }
  }
}

function refreshData() {
  loadWorksheetData()
}

function exportToExcel() {
  if (!fullData) return

  var wb = XLSX.utils.book_new()
  var exportData = []

  // Headers (solo columnas marcadas para exportación)
  var exportColumns = fullData.columns.filter((col) => config.columns[col.name]?.includeInExport)
  exportData.push(exportColumns.map((col) => col.name))

  // Datos
  visibleData.forEach((row) => {
    exportData.push(exportColumns.map((col) => row[col.index]))
  })

  var ws = XLSX.utils.aoa_to_sheet(exportData)
  ws["!cols"] = exportColumns.map(() => ({ wch: 15 }))

  XLSX.utils.book_append_sheet(wb, ws, "Datos")
  XLSX.writeFile(wb, `${currentWorksheet.name}_${Date.now()}.xlsx`)
}

function exportToCSV() {
  if (!fullData) return

  var exportColumns = fullData.columns.filter((col) => config.columns[col.name]?.includeInExport)
  var csv = []

  csv.push(exportColumns.map((col) => escapeCSV(col.name)).join(","))

  visibleData.forEach((row) => {
    csv.push(exportColumns.map((col) => escapeCSV(row[col.index])).join(","))
  })

  var blob = new Blob(["\ufeff" + csv.join("\n")], { type: "text/csv;charset=utf-8;" })
  var link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = `${currentWorksheet.name}_${Date.now()}.csv`
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
}

function showError(msg) {
  document.getElementById("error").style.display = "flex"
  document.getElementById("error-message").textContent = msg
  document.getElementById("loading").style.display = "none"
}

function updateStatus(text, className) {
  var el = document.getElementById("status")
  el.textContent = text
  el.className = "status " + (className || "")
}

function escapeHtml(str) {
  var div = document.createElement("div")
  div.textContent = str
  return div.innerHTML
}

// Iniciar cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeExtension)
} else {
  initializeExtension()
}
