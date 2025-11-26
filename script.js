// Declare the tableau variable
let worksheet = null
let dataTable = null
const conditionalFormats = []
const sortState = { column: -1, ascending: true }
const tableConfig = {
  showTotals: false,
  alternatingRows: true,
  showBorders: true,
}

// Declare the $ variable
const $ = window.$ // Assuming jQuery is loaded globally
let tableauExt = null
;(() => {
  async function init() {
    console.log("[v0] Inicializando Super Table Extension...")

    try {
      const dashboard = tableauExt.dashboardContent.dashboard
      console.log("[v0] Dashboard cargado:", dashboard.name)

      const worksheets = dashboard.worksheets
      console.log("[v0] Worksheets disponibles:", worksheets.length)

      if (worksheets.length > 0) {
        worksheet = worksheets[0]
        console.log("[v0] Usando worksheet:", worksheet.name)
        await loadData()
        setupButtons()
      } else {
        showError("No hay hojas de trabajo en este dashboard")
      }
    } catch (error) {
      console.error("[v0] Error en init:", error)
      showError("Error al inicializar: " + error.message)
    }
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
      console.log("[v0] Cargando datos de:", worksheet.name)
      $("#loading").show()
      $("#data-table").hide()

      const dataTableReader = await worksheet.getSummaryDataAsync()
      dataTable = dataTableReader

      console.log("[v0] Datos obtenidos:", dataTable.data.length, "filas")

      renderTable()

      $("#loading").hide()
      $("#data-table").show()
    } catch (error) {
      console.error("[v0] Error cargando datos:", error)
      showError("Error al cargar datos: " + error.message)
    }
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
      $th.attr("data-column-index", index)
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

        if (typeof row[colIndex].value === "number") {
          $td.addClass("number-cell")
        }

        applyConditionalFormatting($td, row[colIndex].value, colIndex)
        $tr.append($td)
      })

      $tbody.append($tr)
    })

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
          cell.css("backgroundColor", format.color)
          cell.addClass("cell-highlight")
          const rgb = Number.parseInt(format.color.slice(1), 16)
          const brightness = ((rgb >> 16) & 0xff) * 0.299 + ((rgb >> 8) & 0xff) * 0.587 + (rgb & 0xff) * 0.114
          cell.css("color", brightness > 128 ? "#000" : "#fff")
        }
      }
    })
  }

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

    $("#table-head th").removeClass("sorted-asc sorted-desc")
    $(`#table-head th[data-column-index="${columnIndex}"]`).addClass(sortState.ascending ? "sorted-asc" : "sorted-desc")

    renderTable()
  }

  function exportToCSV() {
    if (!dataTable) return

    let csv = ""
    csv += dataTable.columns.map((col) => col.fieldName).join(",") + "\n"

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

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "tableau_export.csv"
    link.click()
  }

  function exportToExcel() {
    if (!dataTable) return

    let content = "<table>"
    content += "<tr>"
    dataTable.columns.forEach((col) => {
      content += `<th>${col.fieldName}</th>`
    })
    content += "</tr>"

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

  function showWorksheetSelector() {
    const worksheets = tableauExt.dashboardContent.dashboard.worksheets
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

function waitForTableau(maxAttempts = 20, interval = 100) {
  let attempts = 0

  function checkTableau() {
    attempts++
    console.log(`[v0] Intento ${attempts}: Buscando tableau.extensions...`)

    if (window.tableau && window.tableau.extensions) {
      console.log("[v0] tableau.extensions encontrado!")
      tableauExt = window.tableau.extensions
      initializeExtension()
    } else if (attempts < maxAttempts) {
      setTimeout(checkTableau, interval)
    } else {
      console.error("[v0] No se encontró tableau.extensions después de", maxAttempts, "intentos")
      showError(
        "No se pudo conectar con la API de Tableau. " +
          "Intenta recargar la extensión con el botón 'Recargar Extensión'.",
      )
    }
  }

  checkTableau()
}

  function initializeExtension() {
    tableauExt.initializeAsync().then(
      () => {
        console.log("[v0] Extension inicializada correctamente")
        init()
      },
      (err) => {
        console.error("[v0] Error al inicializar extension:", err)
        showError("Error al inicializar: " + err.toString())
      },
    )
  }

  // Start waiting for Tableau API
  waitForTableau()
})()
