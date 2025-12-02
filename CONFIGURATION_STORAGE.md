# SuperTables - Documentación del Almacenamiento de Configuración

**Versión:** 8.2.0  
**Fecha:** Enero 2025

## Resumen

Esta extensión de Tableau utiliza dos sistemas de almacenamiento de configuración que trabajan en conjunto:

1. **Tableau Extensions API Settings** - Almacenamiento persistente oficial de Tableau
2. **Variable `config` en script.js** - Objeto en memoria para gestión durante la sesión

---

## 1. Tableau Extensions API Settings

### ¿Qué es?

El API de Tableau Extensions proporciona un sistema de almacenamiento clave-valor que persiste entre sesiones. Los datos se guardan en el archivo `.twbx` del dashboard.

### Ubicación del Código

- **Guardado:** `config.html` función `autoSave()` (línea ~1437)
- **Carga:** `script.js` función `loadConfig()` (línea ~635)

### Estructura de Datos Guardados

\`\`\`javascript
{
  // Configuración General
  "tableTitle": "Mi Tabla de Datos",           // Título personalizado
  "showSearch": "true",                        // Mostrar buscador (string boolean)
  "showRowCount": "true",                      // Mostrar contador de filas
  "worksheet": "Hoja 1",                       // Hoja de trabajo seleccionada
  
  // Configuración de Exportación
  "exportButtonText": "Exportar",              // Texto del botón de exportar
  "exportFilename": "datos",                   // Nombre base del archivo
  "exportButtonColor": "#28a745",              // Color del botón (verde)
  "exportButtonTextColor": "#ffffff",          // Color del texto del botón
  "exportEnableExcel": "true",                 // Habilitar export a Excel
  "exportEnableCSV": "true",                   // Habilitar export a CSV
  "exportEnablePDF": "false",                  // Habilitar export a PDF
  
  // Datos de Columnas
  "dialogColumns": "[{...}]",                  // Array de columnas (JSON string)
  "columnsConfig": "{...}",                    // Configuración por columna (JSON string)
  
  // Configuración Legacy (versiones anteriores)
  "config": "{...}"                            // Objeto completo de config (deprecated)
}
\`\`\`

### Métodos de la API

\`\`\`javascript
// Guardar un valor
tableau.extensions.settings.set("clave", "valor")

// Leer un valor
const valor = tableau.extensions.settings.get("clave")

// Leer todos los valores
const allSettings = tableau.extensions.settings.getAll()

// Persistir cambios (asíncrono)
tableau.extensions.settings.saveAsync().then(() => {
  console.log("Configuración guardada")
})
\`\`\`

---

## 2. Variable `config` en script.js

### ¿Qué es?

Un objeto JavaScript que mantiene la configuración en memoria durante la sesión activa. Se carga al iniciar y se sincroniza con Tableau Settings.

### Ubicación

- **Declaración:** `script.js` línea ~15
- **Carga:** `script.js` función `loadConfig()` línea ~635
- **Guardado:** `script.js` función `saveConfig()` línea ~660

### Estructura del Objeto

\`\`\`javascript
var config = {
  tableTitle: "",                              // Título de la tabla
  showSearch: true,                            // Mostrar/ocultar buscador
  showRowCount: true,                          // Mostrar/ocultar contador
  showExportButtons: true,                     // Mostrar botones de exportación
  showRefreshButton: true,                     // Mostrar botón de refrescar
  showSettingsButton: true,                    // Mostrar botón de configuración
  
  columns: {                                   // Configuración por columna
    "NombreColumna": {
      visible: true,                           // Columna visible en tabla
      includeInExport: true,                   // Incluir en exportación
      displayName: "Nombre Personalizado",     // Nombre a mostrar
      conditionalFormat: {                     // Formato condicional
        enabled: true,                         // Activar formato
        operator: ">=",                        // Operador (>=, <=, =, >, <, !=)
        value: 100,                            // Valor de comparación
        cellBg: true,                          // Pintar fondo de celda
        cellBgColor: "#ff0000",               // Color de fondo de celda
        cellText: false,                       // Cambiar color de texto de celda
        cellTextColor: "#ffffff",             // Color de texto de celda
        rowBg: false,                          // Pintar fondo de fila
        rowBgColor: "#ffff00",                // Color de fondo de fila
        rowText: false,                        // Cambiar color de texto de fila
        rowTextColor: "#000000",              // Color de texto de fila
        addIcon: true,                         // Agregar icono
        icon: "↑",                             // Icono seleccionado
        iconColor: "#00ff00"                   // Color del icono
      }
    }
  },
  
  rowsPerPage: 100,                            // Filas por página
  exportButtonText: "Exportar",                // Texto botón exportar
  exportButtonColor: "#2563eb",                // Color botón exportar
  exportButtonTextColor: "#ffffff",            // Color texto botón
  exportFilename: "datos"                      // Nombre base archivo export
}
\`\`\`

---

## 3. Flujo de Configuración

### Al Abrir el Dashboard

\`\`\`
1. index.html carga
   ↓
2. script.js se ejecuta
   ↓
3. tableau.extensions.initializeAsync()
   ↓
4. loadConfig() lee de tableau.extensions.settings
   ↓
5. config (objeto en memoria) se puebla
   ↓
6. applyGeneralSettings() aplica la configuración
   ↓
7. renderTable() muestra la tabla
\`\`\`

### Al Abrir el Panel de Configuración

\`\`\`
1. Usuario hace click en botón "Configurar"
   ↓
2. openConfigDialog() en script.js
   ↓
3. Guarda columnas en settings.dialogColumns
   ↓
4. tableau.extensions.ui.displayDialogAsync("config.html")
   ↓
5. config.html se carga
   ↓
6. tableau.extensions.initializeDialogAsync()
   ↓
7. loadSettings() carga valores de tableau.extensions.settings
   ↓
8. Usuario modifica valores en el formulario
\`\`\`

### Al Guardar Configuración

\`\`\`
1. Usuario hace click en "Guardar y Cerrar"
   ↓
2. saveAndClose() en config.html
   ↓
3. autoSave() guarda valores a tableau.extensions.settings
   ↓
4. tableau.extensions.settings.saveAsync()
   ↓
5. tableau.extensions.ui.closeDialog()
   ↓
6. index.html detecta cierre de diálogo
   ↓
7. loadConfig() recarga configuración
   ↓
8. applyGeneralSettings() aplica cambios
   ↓
9. renderTable() re-renderiza tabla
\`\`\`

---

## 4. Problemas Comunes y Soluciones

### Problema: Los checkboxes no aplican los cambios

**Causa:** Inconsistencia entre tipos de datos (string "false" vs boolean false)

**Solución:** 
\`\`\`javascript
// En config.html - al guardar
tableau.extensions.settings.set("showSearch", document.getElementById("show-search").checked ? "true" : "false")

// En config.html - al cargar
document.getElementById("show-search").checked = settings.showSearch !== "false" && settings.showSearch !== false

// En script.js - al aplicar
if (searchBox) searchBox.style.display = config.showSearch ? "flex" : "none"
\`\`\`

### Problema: Las columnas no se muestran en Data tab

**Causa:** `dialogColumns` no es un array o no está definido

**Solución:**
\`\`\`javascript
if (settings.dialogColumns) {
  try {
    const parsed = JSON.parse(settings.dialogColumns)
    if (Array.isArray(parsed)) {
      allColumns = parsed
    } else {
      allColumns = []
    }
  } catch (e) {
    allColumns = []
  }
} else {
  allColumns = []
}
\`\`\`

### Problema: Error "tableau is not defined"

**Causa:** La API de Tableau no se ha cargado correctamente

**Solución:**
\`\`\`javascript
// Verificar que el script esté cargado
if (typeof tableau === 'undefined') {
  console.error("Tableau Extensions API not loaded!")
  alert("Error: La API de Tableau Extensions no se ha cargado correctamente.")
}

// Usar la URL correcta del CDN
<script src="https://cdn.jsdelivr.net/gh/tableau/extensions-api/lib/tableau.extensions.1.latest.min.js"></script>
\`\`\`

---

## 5. Debugging

### Ver Configuración Actual

Abre la consola del navegador (F12) y ejecuta:

\`\`\`javascript
// Ver todos los settings guardados
console.log(tableau.extensions.settings.getAll())

// Ver el objeto config en memoria
console.log(config)

// Ver una configuración específica
console.log(tableau.extensions.settings.get("showSearch"))
\`\`\`

### Logs de Debugging

La extensión incluye logs con el prefijo `[v0]` para rastrear el flujo:

\`\`\`javascript
console.log("[v0] Current settings:", settings)
console.log("[v0] Loaded columns from settings:", allColumns)
console.log("[v0] AutoSave called")
\`\`\`

### Resetear Configuración

Si necesitas limpiar la configuración:

\`\`\`javascript
// Borrar una clave específica
tableau.extensions.settings.erase("showSearch")

// Borrar todas las claves
tableau.extensions.settings.getAll().forEach(key => {
  tableau.extensions.settings.erase(key)
})

// Guardar cambios
tableau.extensions.settings.saveAsync()
\`\`\`

---

## 6. Mejores Prácticas

1. **Siempre usar `saveAsync()`**: Los cambios en settings no persisten hasta que se llama `saveAsync()`

2. **Validar tipos de datos**: Al leer de settings, siempre verificar el tipo antes de usar

3. **Usar try-catch para JSON**: Siempre parsear JSON dentro de try-catch

4. **Mantener sincronización**: Después de guardar en Tableau Settings, actualizar el objeto `config` en memoria

5. **Verificar arrays**: Antes de usar `.forEach()`, verificar que la variable es un array con `Array.isArray()`

---

## 7. Roadmap de Mejoras

- [ ] Migrar todo a un solo sistema de almacenamiento consistente
- [ ] Usar tipos de datos nativos en lugar de strings para booleans
- [ ] Implementar versionado de configuración
- [ ] Agregar validación de esquema de configuración
- [ ] Crear sistema de backup/restore de configuración

---

**Última actualización:** Enero 2025  
**Mantenedor:** SuperTables Team
