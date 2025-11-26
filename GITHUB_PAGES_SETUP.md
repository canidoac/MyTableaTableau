# Configuración de GitHub Pages

Tu extensión de Tableau necesita estar alojada en un servidor HTTPS. GitHub Pages es perfecto para esto.

## Pasos para habilitar GitHub Pages:

### 1. Ve a la configuración de tu repositorio
- Abre https://github.com/canidoac/MyTableaTableau
- Haz clic en **Settings** (Configuración) en la parte superior

### 2. Habilita GitHub Pages
- En el menú lateral izquierdo, busca **Pages**
- En **Source** (Fuente), selecciona:
  - **Branch**: `main`
  - **Folder**: `/ (root)`
- Haz clic en **Save** (Guardar)

### 3. Espera unos minutos
- GitHub Pages tarda 1-3 minutos en construir tu sitio
- Verás un mensaje verde cuando esté listo: "Your site is published at https://canidoac.github.io/MyTableaTableau/"

### 4. Verifica que funciona
Abre esta URL en tu navegador:
\`\`\`
https://canidoac.github.io/MyTableaTableau/index.html
\`\`\`

Deberías ver la interfaz de la extensión Super Table.

### 5. Carga la extensión en Tableau
- Abre Tableau Desktop
- Arrastra el objeto **Extensión** a tu dashboard
- Selecciona el archivo `manifest.trex` de tu proyecto
- La extensión debería cargar correctamente

## Solución de problemas

**Si sigues viendo 404:**
- Asegúrate de hacer commit y push de todos los archivos
- Espera unos minutos más (puede tardar hasta 10 minutos)
- Verifica que los archivos index.html, styles.css y script.js están en la raíz del repositorio

**Si Tableau rechaza el manifest:**
- Verifica que el archivo manifest.trex esté bien formado
- Asegúrate de que todas las URLs en el manifest usen HTTPS
