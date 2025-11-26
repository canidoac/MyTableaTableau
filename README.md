# Super Table Extension para Tableau

Una extensión avanzada de Tableau que proporciona funcionalidades mejoradas para tablas, incluyendo formato condicional, exportación y personalización.

## 🚀 Características

- **Formato Condicional**: Aplica colores automáticamente basados en valores
- **Ordenamiento**: Haz clic en los encabezados para ordenar columnas
- **Totales**: Muestra totales automáticos para columnas numéricas
- **Exportación**: Exporta a CSV y Excel
- **Personalización**: Filas alternadas, bordes configurables
- **Interfaz en Español**: Totalmente traducida

## 📦 Instalación

1. **Hosting de archivos**: Sube los archivos `index.html`, `styles.css` y `script.js` a un servidor web con HTTPS

2. **Actualizar manifest**: Edita `manifest.trex` y cambia la URL a tu servidor:
   \`\`\`xml
   <url>https://tu-servidor.com/index.html</url>
   \`\`\`

3. **Agregar a Tableau Desktop**:
   - Abre Tableau Desktop
   - Crea o abre un dashboard
   - Arrastra "Extensión" al dashboard
   - Selecciona el archivo `manifest.trex`

4. **Configurar permisos**:
   - Acepta los permisos cuando se soliciten
   - La extensión necesita acceso completo a los datos

## 🛠️ Uso

### Configuración Básica

1. Haz clic en **⚙️ Configurar** para abrir el panel de configuración
2. Activa/desactiva opciones:
   - **Mostrar Totales**: Suma automática de columnas numéricas
   - **Filas Alternadas**: Colores alternados para mejor lectura
   - **Mostrar Bordes**: Bordes de tabla

### Formato Condicional

1. En el panel de configuración, selecciona:
   - **Campo**: La columna a formatear
   - **Condición**: Mayor que, menor que, igual a
   - **Valor**: Valor de referencia
   - **Color**: Color de resaltado

2. Haz clic en **Agregar Formato**

### Exportación

- **📥 Exportar CSV**: Descarga datos en formato CSV
- **📊 Exportar Excel**: Descarga datos en formato Excel

### Ordenamiento

- Haz clic en cualquier encabezado de columna para ordenar
- Haz clic nuevamente para invertir el orden

## 🌐 Deployment

### Opción 1: GitHub Pages (Gratis)

1. Crea un repositorio en GitHub
2. Sube los archivos HTML, CSS y JS
3. Habilita GitHub Pages en Settings
4. Actualiza el manifest con la URL de GitHub Pages

### Opción 2: Vercel/Netlify (Gratis)

1. Conecta tu repositorio a Vercel o Netlify
2. Deploy automático
3. Copia la URL HTTPS generada
4. Actualiza el manifest

### Opción 3: Servidor propio

1. Sube los archivos a tu servidor web
2. Asegúrate de tener certificado SSL (HTTPS)
3. Actualiza el manifest con tu URL

## 🔧 Personalización

### Cambiar colores del tema

Edita `styles.css`:

\`\`\`css
.toolbar {
    background: #tu-color; /* Cambia el color de la barra */
}

#data-table thead {
    background: #tu-color; /* Cambia el color del encabezado */
}
\`\`\`

### Agregar más funcionalidades

El código está estructurado para facilitar extensiones. Puedes agregar:
- Búsqueda/filtrado
- Más tipos de formato condicional
- Gráficos embebidos
- Columnas calculadas

## 📋 Requisitos

- Tableau Desktop 2018.2 o superior
- Servidor web con HTTPS
- Navegador moderno (Chrome, Firefox, Edge)

## 🐛 Solución de Problemas

**La extensión no carga**:
- Verifica que la URL en el manifest sea correcta y use HTTPS
- Asegúrate de que el servidor esté accesible públicamente

**No se muestran datos**:
- Verifica que el worksheet tenga datos
- Revisa la consola del navegador (F12) para errores

**Error de permisos**:
- Asegúrate de aceptar los permisos cuando Tableau lo solicite
- Verifica que el manifest tenga `<permission>full data</permission>`

## 📄 Licencia

MIT License - Libre para usar y modificar

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Siéntete libre de mejorar el código.
