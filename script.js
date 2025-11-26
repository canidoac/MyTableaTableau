// Super Table Extension v2.0.1
// Exportación profesional de datos de Tableau

;(() => {
  // Variables globales
  let dashboard = null
  const worksheetsData = new Map()
  const tableau = window.tableau // Declare the tableau variable
  const XLSX = window.XLSX // Declare the XLSX variable

  // Inicializar cuando el DOM esté listo
  document.addEventListener("DOMContentLoaded", () => {
    // Inicializar la API de Tableau directamente (patrón oficial)
    tableau.extensions.initializeAsync().then(
      () => {
        // Extensión inicializada correctamente
        console.log("Extension inicializada")

        // Obtener el dashboard
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

        // Cargar datos de todos los worksheets
        loadAllWorksheets()
      },
      (err) => {
        // Error de inicialización
        console.error("Error inicializando:", err)
        showError("Error al conectar: " + err.toString())
      },
    )
  })

  // Event listeners
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("retry-btn").addEventListener("click", () => {
      location.reload()
    })
    document.getElementById("refresh-btn").addEventListener("click", refreshAllData)
    document.getElementById("export-all-excel").addEventListener("click", exportAllToExcel)
    document.getElementById("export-csv").addEventListener("click", exportAllToCSV)
  })

  // Cargar datos de todos los worksheets
  function loadAllWorksheets() {
    showLoading()
    worksheetsData.clear()

    const worksheets = dashboard.worksheets
    const loadPromises = []

    worksheets.forEach((worksheet) => {
      const promise = worksheet
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

  // Renderizar el dashboard
  function renderDashboard() {
    document.getElementById("loading").style.display = "none"
    document.getElementById("error").style.display = "none"
    document.getElementById("dashboard-info").style.display = "block"

    const listEl = document.getElementById("worksheets-list")
    listEl.innerHTML = ""

    worksheetsData.forEach((wsData, name) => {
      const card = createWorksheetCard(name, wsData)
      listEl.appendChild(card)
    })
  }

  // Crear tarjeta de worksheet
  function createWorksheetCard(name, wsData) {
    const card = document.createElement("div")
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

    // Crear tabla preview
    const previewRows = wsData.data.slice(0, 5)
    let tableHtml = "<table><thead><tr>"

    wsData.columns.forEach((col) => {
      tableHtml += "<th>" + escapeHtml(col.fieldName) + "</th>"
    })
    tableHtml += "</tr></thead><tbody>"

    previewRows.forEach((row) => {
      tableHtml += "<tr>"
      row.forEach((cell) => {
        const isNum = typeof cell.value === "number"
        const val = isNum
          ? cell.value.toLocaleString("es-ES", { maximumFractionDigits: 2 })
          : escapeHtml(String(cell.value || ""))
        tableHtml += '<td class="' + (isNum ? "number-cell" : "") + '">' + val + "</td>"
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
      '<button class="btn btn-secondary btn-sm export-excel" data-ws="' +
      escapeHtml(name) +
      '">Excel</button>' +
      '<button class="btn btn-secondary btn-sm export-csv" data-ws="' +
      escapeHtml(name) +
      '">CSV</button>' +
      "</div>"

    card.querySelector(".export-excel").addEventListener("click", (e) => {
      exportSingleToExcel(e.target.getAttribute("data-ws"))
    })
    card.querySelector(".export-csv").addEventListener("click", (e) => {
      exportSingleToCSV(e.target.getAttribute("data-ws"))
    })

    return card
  }

  // Exportar todo a Excel
  function exportAllToExcel() {
    const workbook = XLSX.utils.book_new()

    worksheetsData.forEach((wsData, name) => {
      if (wsData.error) return

      const sheetData = prepareSheetData(wsData)
      const worksheet = XLSX.utils.aoa_to_sheet(sheetData)

      // Anchos de columna
      worksheet["!cols"] = wsData.columns.map((col) => ({ wch: Math.max(col.fieldName.length, 12) }))

      const safeName = name.substring(0, 31).replace(/[\\/*?:[\]]/g, "_")
      XLSX.utils.book_append_sheet(workbook, worksheet, safeName)
    })

    const filename = dashboard.name + "_" + getTimestamp() + ".xlsx"
    XLSX.writeFile(workbook, filename)
  }

  // Exportar worksheet individual a Excel
  function exportSingleToExcel(worksheetName) {
    const wsData = worksheetsData.get(worksheetName)
    if (!wsData || wsData.error) return

    const workbook = XLSX.utils.book_new()
    const sheetData = prepareSheetData(wsData)
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData)

    worksheet["!cols"] = wsData.columns.map((col) => ({ wch: Math.max(col.fieldName.length, 12) }))

    const safeName = worksheetName.substring(0, 31).replace(/[\\/*?:[\]]/g, "_")
    XLSX.utils.book_append_sheet(workbook, worksheet, safeName)

    const filename = worksheetName + "_" + getTimestamp() + ".xlsx"
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
    const wsData = worksheetsData.get(worksheetName)
    if (!wsData || wsData.error) return

    const sheetData = prepareSheetData(wsData)
    const csv = sheetData
      .map((row) =>
        row
          .map((cell) => {
            const str = String(cell || "")
            if (str.indexOf(",") >= 0 || str.indexOf('"') >= 0 || str.indexOf("\n") >= 0) {
              return '"' + str.replace(/"/g, '""') + '"'
            }
            return str
          })
          .join(","),
      )
      .join("\n")

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = worksheetName + "_" + getTimestamp() + ".csv"
    link.click()
    URL.revokeObjectURL(link.href)
  }

  // Preparar datos para exportación
  function prepareSheetData(wsData) {
    const data = []
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
    const el = document.getElementById("status")
    el.textContent = text
    el.className = "status" + (className ? " " + className : "")
  }

  // Escapar HTML
  function escapeHtml(str) {
    const div = document.createElement("div")
    div.textContent = str
    return div.innerHTML
  }

  // Timestamp para archivos
  function getTimestamp() {
    const now = new Date()
    return (
      now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0") +
      "_" +
      String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0")
    )
  }
})()
