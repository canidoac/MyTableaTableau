# Instrucciones de Deployment

## Paso 1: Habilitar GitHub Pages

1. Ve a tu repositorio: https://github.com/canidoac/MyTableaTableau
2. Click en **Settings** (Configuración)
3. En el menú lateral, click en **Pages**
4. En "Source", selecciona **main** branch
5. Click en **Save**
6. Espera unos minutos hasta que GitHub Pages se active

## Paso 2: Verificar que funciona

1. Abre en tu navegador: https://canidoac.github.io/MyTableaTableau/
2. Deberías ver la interfaz de la extensión
3. Si ves un error 404, espera unos minutos más

## Paso 3: Cargar en Tableau

1. Abre Tableau Desktop
2. Arrastra el objeto **Extensión** a tu dashboard
3. Selecciona el archivo `manifest.trex` de este repositorio
4. La extensión debería cargar correctamente

## Notas importantes

- GitHub Pages puede tardar 5-10 minutos en activarse la primera vez
- Cada vez que hagas cambios y hagas push, GitHub Pages se actualiza automáticamente
- La URL siempre será: `https://canidoac.github.io/MyTableaTableau/`
