// Declare the tableau variable
let worksheet = null
let dataTable = null
const conditionalFormats = []
const tableConfig = {
  showTotals: false,
  alternatingRows: true,
  showBorders: true,
}

// Declare the $ variable
const $ = window.$ // Assuming jQuery is loaded globally
const tableau = window.tableau // Declare the tableau variable

$(document).ready(() => {
  console.log("[v0] DOM cargado - v1.0.5")
  console.log("[v0] window.tableau disponible?", typeof window.tableau !== "undefined")

  setTimeout(initExtension, 500)
})

function initExtension() {
  if (typeof tableau === "undefined") {
    console.error("[v0] Tableau API no está disponible")
    showError("Error: Esta extensión debe ejecutarse dentro de Tableau Desktop o Server.")
    return
  }

  console.log("[v0] Tableau API encontrada, inicializando...")

  tableau.extensions.initializeAsync().then(
    () => {
      console.log("[v0] ✓ Extensión inicializada correctamente")

      const worksheets = tableau.extensions.dashboardContent.dashboard.worksheets
      console.log("[v0] Worksheets disponibles:", worksheets.length)

      if (worksheets.length > 0) {
        worksheet = worksheets[0]
        console.log("[v0] Usando worksheet:", worksheet.name)
        loadData()
        setupButtons()
      } else {
        showError("No hay hojas de trabajo en este dashboard")
      }
    },
    (err) => {
      console.error("[v0] Error al inicializar extensión:", err)
      showError("Error al inicializar: " + err.toString())
    },
  )
}

function setupButtons() {
  $("#configure-btn").click(() => {
    showWorksheetSelector()
  })

  $("#export-csv").click(() => {
    exportToCSV()
  })

  $("#export-excel").click(() => {
    exportToExcel()
  })

  $("#refresh-btn").click(() => {
    loadData()
  })

  $("#reload-btn").click(() => {
    location.reload()
  })
}

async function loadData() {
  try {
    console.log("[v0] Loading data from:", worksheet.name)
    $("#loading").show()
    $("#data-table").hide()

    if (!worksheet) {
      throw new Error("No hay worksheet disponible")
    }

    console.log("[v0] Obteniendo datos del worksheet:", worksheet.name)
    const dataTableReader = await worksheet.getSummaryDataAsync()
    dataTable = dataTableReader

    console.log("[v0] Datos obtenidos:", dataTable.data.length, "filas,", dataTable.columns.length, "columnas")

    populateFormatFields()
    renderTable()

    $("#loading").hide()
    $("#data-table").show()
    console.log("[v0] Tabla renderizada exitosamente")
  } catch (error) {
    console.error("[v0] Error cargando datos:", error)
    $("#loading").html("<div style='color:red;padding:20px'>" + error.message + "</div>")
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
  const $thead = $("#table-head")
  $thead.empty()
  const $headerRow = $("<tr></tr>")

  columns.forEach((column, index) => {
    const $th = $("<th></th>").text(column.fieldName)
    $th.addClass("sortable")
    $th.data("columnIndex", index)
    $th.click(() => sortTable(index))
    $headerRow.append($th)
  })

  $thead.append($headerRow)

  // Renderizar datos
  const $tbody = $("#table-body")
  $tbody.empty()

  data.forEach((row, rowIndex) => {
    const $tr = $("<tr></tr>")
    if (tableConfig.alternatingRows && rowIndex % 2 === 1) {
      $tr.addClass("alternate")
    }

    columns.forEach((column, colIndex) => {
      const $td = $("<td></td>").text(row[colIndex].value)

      // Aplicar formato numérico
      if (typeof row[colIndex].value === "number") {
        $td.addClass("number-cell")
      }

      // Aplicar formato condicional
      applyConditionalFormatting($td, row[colIndex].value, colIndex)

      $tr.append($td)
    })

    $tbody.append($tr)
  })

  // Renderizar totales
  if (tableConfig.showTotals) {
    renderTotals()
  } else {
    $("#table-foot").empty()
  }
}

function renderTotals() {
  const $tfoot = $("#table-foot")
  $tfoot.empty()

  const $totalRow = $("<tr></tr>")
  const columns = dataTable.columns
  const data = dataTable.data

  columns.forEach((column, colIndex) => {
    const $td = $("<td></td>")

    if (colIndex === 0) {
      $td.text("TOTAL")
    } else {
      // Calcular suma si es numérico
      const values = data.map((row) => row[colIndex].value).filter((v) => typeof v === "number")
      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0)
        $td.text(sum.toLocaleString("es-ES", { maximumFractionDigits: 2 }))
        $td.addClass("number-cell")
      } else {
        $td.text("-")
      }
    }

    $totalRow.append($td)
  })

  $tfoot.append($totalRow)
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

function showWorksheetSelector() {
  const worksheets = tableau.extensions.dashboardContent.dashboard.worksheets
  const names = worksheets.map((w) => w.name)

  const selection = prompt("Selecciona un worksheet:\n" + names.join("\n"))

  if (selection) {
    const selected = worksheets.find((w) => w.name === selection)
    if (selected) {
      worksheet = selected
      loadData()
    }
  }
}

function showError(message) {
  $("#loading").html("<div style='color:red;padding:20px'>" + message + "</div>")
}
