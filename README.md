# MD Wysiwyg 📝✨

> **Editor y Visor WYSIWYG profesional de Markdown con conversor inteligente de PDF a Markdown.**  
> Desarrollado por **Merke Software** — *Perry Daniels* ([merke.net](https://merke.net)).

---

## 📥 Descargas Directas (Instaladores Listos para Usar)

Descarga directamente los ejecutables e instaladores de la última versión:

| Plataforma | Tipo de Paquete | Descarga Directa en GitHub |
| :--- | :--- | :--- |
| **🐧 Linux (Universal)** | AppImage Portable | [📦 `MD Wysiwyg-1.0.0.AppImage`](https://github.com/peledahe/MD-Wysiwyg/raw/main/dist/MD%20Wysiwyg-1.0.0.AppImage) |
| **🐧 Linux (Debian/Ubuntu)** | Paquete `.deb` | [📦 `md-wysiwyg_1.0.0_amd64.deb`](https://github.com/peledahe/MD-Wysiwyg/raw/main/dist/md-wysiwyg_1.0.0_amd64.deb) |
| **🪟 Windows (x64)** | Paquete Portable ZIP | [📦 `MD Wysiwyg-1.0.0-win.zip`](https://github.com/peledahe/MD-Wysiwyg/raw/main/dist/MD%20Wysiwyg-1.0.0-win.zip) |

> **Nota para Linux AppImage:** Otorga permisos de ejecución antes de abrirlo:  
> `chmod +x "MD Wysiwyg-1.0.0.AppImage"`

---

## 🌟 Características Principales

### ✏️ Edición y Visualización Bidireccional
- **Modo Dividido (Split):** Edición en vivo con sincronización de scroll entre el editor Markdown y la vista previa WYSIWYG.
- **Modo Solo Previsualización (WYSIWYG):** Espacio limpio de lectura y edición interactiva visual.
- **Modo Solo Editor:** Entorno enfocado exclusivamente en la edición de código Markdown con numeración de líneas y resaltado.

### 📄 Conversor Inteligente de PDF a Markdown (100% Offline)
- **Motor PDF.js Integrado:** Extracción espacial precisa sin dependencias de servicios externos ni conexión a internet.
- **Jerarquía Tipográfica Dinámica:** Infiere títulos (`#`, `##`, `###`) según el tamaño de fuente relativo a la mediana del documento.
- **Formato Enriquecido:** Detecta textos en **negrita**, *cursiva*, `código en línea`, listas (`•`, `-`, `1.`, `a)`), casillas de verificación `[ ]` y pares clave: valor.
- **Tablas Automáticas:** Reconoce columnas alineadas horizontalmente y las convierte en tablas compatibles con GitHub Flavored Markdown (`| col |`).

### 📊 Diagramas, Fórmulas y Matemáticas
- **Mermaid.js:** Renderizado vectorial e interactivo de diagramas de Flujo, Secuencia, Gantt, Clases y Estados.
- **KaTeX:** Soporte para fórmulas matemáticas tanto en línea (`$e=mc^2$`) como en bloque (`$$\sum_{i=1}^n x_i$$`).
- **Highlight.js:** Resaltado de sintaxis para decenas de lenguajes de programación.

### 💾 Exportación y Gestión de Documentos
- **Exportar a PDF:** Generación de documentos PDF vectorizados de alta calidad listos para imprimir o compartir.
- **Exportar a HTML:** Páginas web autónomas con estilos oscuros y fuentes modernas incrustadas.
- **Historial de Recientes y Notificaciones:** Acceso rápido a archivos recientes con notificaciones de tipo sticky y modales de confirmación para acciones destructivas.

---

## ⌨️ Atajos de Teclado

| Atajo | Acción |
| :--- | :--- |
| `Ctrl + N` | Nuevo documento Markdown |
| `Ctrl + O` | Abrir archivo (`.md`, `.pdf`, `.txt`) |
| `Ctrl + S` | Guardar documento actual |
| `Ctrl + Shift + S` | Guardar como nuevo archivo |
| `Ctrl + F` | Buscar en el documento (Editor y Visor) |
| `F1` | Abrir Guía de Ayuda interactiva |

---

## 🚀 Instalación y Desarrollo

### Requisitos
- **Node.js** (v18 o superior)
- **npm** (v9 o superior)

### Ejecutar en Desarrollo
```bash
# Instalar dependencias
npm install

# Iniciar la aplicación
npm start
```

---

## 📦 Compilación de Instaladores

### Linux (`.AppImage` y `.deb`)
```bash
npm run build:linux
```
Los archivos generados se ubicarán en `dist/`:
- `dist/MD Wysiwyg-1.0.0.AppImage`
- `dist/md-wysiwyg_1.0.0_amd64.deb`

### Windows (Portátil / Distribución)
```bash
npm run build:win
```
Los ejecutables y paquetes para Windows se generarán en `dist/`:
- `dist/MD Wysiwyg-1.0.0-win.zip`
- `dist/win-unpacked/MD Wysiwyg.exe`

---

## 🛠️ Stack Tecnológico

- **Runtime:** [Electron](https://www.electronjs.org/)
- **Procesamiento Markdown:** [Marked](https://marked.js.org/) & [Turndown](https://github.com/mixmark-io/turndown)
- **Motor PDF:** [PDF.js (pdfjs-dist)](https://mozilla.github.io/pdf.js/)
- **Diagramas y Gráficos:** [Mermaid.js](https://mermaid.js.org/)
- **Matemáticas:** [KaTeX](https://katex.org/)
- **Resaltado de Código:** [Highlight.js](https://highlightjs.org/)
- **Empaquetado:** [Electron-Builder](https://www.electron.build/)

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT** — Libre para uso personal y comercial.  
Desarrollado con dedicación por **Merke Software** ([info@merke.net](mailto:info@merke.net)).
