/* ==========================================================================
   MD-VISOR APP RENDERER LOGIC
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const currentFilenameEl = document.getElementById('current-filename');
  const unsavedBadgeEl = document.getElementById('unsaved-badge');
  
  const btnNew = document.getElementById('btn-new');
  const btnOpen = document.getElementById('btn-open');
  const btnSave = document.getElementById('btn-save');
  
  const winMinimize = document.getElementById('win-minimize');
  const winMaximize = document.getElementById('win-maximize');
  const winClose = document.getElementById('win-close');


  const searchInput = document.getElementById('search-input');
  const btnSearchClear = document.getElementById('btn-search-clear');
  const searchCount = document.getElementById('search-count');
  const btnSearchPrev = document.getElementById('btn-search-prev');
  const btnSearchNext = document.getElementById('btn-search-next');
  
  const sidebar = document.getElementById('sidebar');
  const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
  const btnOpenSidebar = document.getElementById('btn-open-sidebar');
  const tabToc = document.getElementById('tab-toc');
  const tabRecent = document.getElementById('tab-recent');
  const paneToc = document.getElementById('pane-toc');
  const paneRecent = document.getElementById('pane-recent');
  const tocContainer = document.getElementById('toc-container');
  const recentFilesList = document.getElementById('recent-files-list');
  const btnClearRecent = document.getElementById('btn-clear-recent');
  
  const workspaceContainer = document.getElementById('workspace-container');
  const paneEditorWrap = document.getElementById('pane-editor-wrap');
  const paneResizer = document.getElementById('pane-resizer');
  const markdownInput = document.getElementById('markdown-input');
  const lineNumbers = document.getElementById('line-numbers');
  const markdownPreview = document.getElementById('markdown-preview');
  const btnWordWrap = document.getElementById('btn-word-wrap');
  
  const statLines = document.getElementById('stat-lines');
  const statWords = document.getElementById('stat-words');
  const statChars = document.getElementById('stat-chars');
  
  const stickyToastContainer = document.getElementById('sticky-toast-container');
  const confirmModal = document.getElementById('confirm-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalMessage = document.getElementById('modal-message');
  const modalBtnCancel = document.getElementById('modal-btn-cancel');
  const modalBtnConfirm = document.getElementById('modal-btn-confirm');

  // Integrated Menu Dropdown Buttons
  const menuBtnArchivo = document.getElementById('menu-btn-archivo');
  const dropdownArchivo = document.getElementById('dropdown-archivo');
  const menuItemNew = document.getElementById('menu-item-new');
  const menuItemOpen = document.getElementById('menu-item-open');
  const menuItemSave = document.getElementById('menu-item-save');
  const menuItemSaveAs = document.getElementById('menu-item-save-as');
  const menuItemExportPdf = document.getElementById('menu-item-export-pdf');
  const menuItemExportHtml = document.getElementById('menu-item-export-html');

  const menuBtnEdicion = document.getElementById('menu-btn-edicion');
  const dropdownEdicion = document.getElementById('dropdown-edicion');
  const menuItemSearch = document.getElementById('menu-item-search');
  const menuItemClearHistory = document.getElementById('menu-item-clear-history');

  const menuBtnVer = document.getElementById('menu-btn-ver');
  const dropdownVer = document.getElementById('dropdown-ver');
  const menuItemViewSplit = document.getElementById('menu-item-view-split');
  const menuItemViewPreview = document.getElementById('menu-item-view-preview');
  const menuItemViewEditor = document.getElementById('menu-item-view-editor');
  const menuItemToggleWrap = document.getElementById('menu-item-toggle-wrap');

  const menuBtnTema = document.getElementById('menu-btn-tema');
  const dropdownTema = document.getElementById('dropdown-tema');
  const themeOptObsidian = document.getElementById('theme-opt-obsidian');
  const themeOptLight = document.getElementById('theme-opt-light');
  const themeOptForest = document.getElementById('theme-opt-forest');
  const themeOptCyberpunk = document.getElementById('theme-opt-cyberpunk');

  const menuBtnAyuda = document.getElementById('menu-btn-ayuda');
  const dropdownAyuda = document.getElementById('dropdown-ayuda');
  const menuItemHelp = document.getElementById('menu-item-help');
  const menuItemAbout = document.getElementById('menu-item-about');

  // Help & About Modals
  const helpModal = document.getElementById('help-modal');
  const helpBtnClose = document.getElementById('help-btn-close');
  const aboutModal = document.getElementById('about-modal');
  const aboutBtnClose = document.getElementById('about-btn-close');
  const aboutUrlLink = document.getElementById('about-url-link');

  // Application State
  let currentFilePath = null;
  let currentFileName = 'Sin título.md';
  let isUnsaved = false;
  let initialContent = '';
  let recentFiles = JSON.parse(localStorage.getItem('mdvisor_recents') || '[]');
  
  // Dual Search State
  let searchMatchesPreview = [];
  let searchMatchesEditor = [];
  let totalSearchMatches = 0;
  let currentMatchIndex = -1;

  // Window Controls
  if (winMinimize) winMinimize.addEventListener('click', () => window.electronAPI.minimizeWindow());
  if (winMaximize) winMaximize.addEventListener('click', () => window.electronAPI.maximizeWindow());
  if (winClose) winClose.addEventListener('click', () => window.electronAPI.closeWindow());

  // Initialize Mermaid
  if (window.mermaid) {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose'
    });
  }

  // Configure Marked
  if (window.marked) {
    marked.setOptions({
      gfm: true,
      breaks: true,
      highlight: function(code, lang) {
        if (window.hljs && lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value;
          } catch (e) {}
        }
        if (window.hljs) {
          return hljs.highlightAuto(code).value;
        }
        return code;
      }
    });
  }

  // --- Sticky Notification System with Reasonable Auto-Dismiss & Pause-on-Hover ---
  function showStickyToast(title, message, type = 'sticky', durationMs = 4500) {
    const toast = document.createElement('div');
    toast.className = `sticky-toast ${type}`;
    
    let iconSvg = type === 'sticky' || type === 'success'
      ? `<svg class="sticky-toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
      : `<svg class="sticky-toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

    toast.innerHTML = `
      ${iconSvg}
      <div class="sticky-toast-content">
        <div class="sticky-toast-title">${title}</div>
        <div class="sticky-toast-message">${message}</div>
      </div>
      <button class="sticky-toast-close" title="Cerrar">&times;</button>
    `;

    function dismissToast() {
      if (toast.classList.contains('toast-slide-out')) return;
      toast.classList.add('toast-slide-out');
      setTimeout(() => {
        if (toast.parentNode) toast.remove();
      }, 300);
    }

    toast.querySelector('.sticky-toast-close').addEventListener('click', dismissToast);
    stickyToastContainer.appendChild(toast);

    // Auto dismiss timer with pause on hover
    let dismissTimer = setTimeout(dismissToast, durationMs);

    toast.addEventListener('mouseenter', () => {
      clearTimeout(dismissTimer);
    });

    toast.addEventListener('mouseleave', () => {
      dismissTimer = setTimeout(dismissToast, 2500);
    });
  }

  // --- Confirmation Modal System ---
  function showConfirmModal({ title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', onConfirm }) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalBtnConfirm.textContent = confirmText;
    modalBtnCancel.textContent = cancelText;

    confirmModal.classList.remove('hidden');

    const handleConfirm = () => {
      cleanup();
      confirmModal.classList.add('hidden');
      if (onConfirm) onConfirm();
    };

    const handleCancel = () => {
      cleanup();
      confirmModal.classList.add('hidden');
    };

    function cleanup() {
      modalBtnConfirm.removeEventListener('click', handleConfirm);
      modalBtnCancel.removeEventListener('click', handleCancel);
    }

    modalBtnConfirm.addEventListener('click', handleConfirm);
    modalBtnCancel.addEventListener('click', handleCancel);
  }

  // --- Render Markdown Engine ---
  function renderMarkdown() {
    if (isSyncingFromWysiwyg) return;
    const rawText = markdownInput.value;
    updateLineNumbersAndStats(rawText);

    let processedText = rawText;
    const mathBlocks = [];
    
    // Block Math $$ ... $$
    processedText = processedText.replace(/\$\$([\s\S]+?)\$\$/g, (match, math) => {
      try {
        const rendered = katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
        mathBlocks.push(rendered);
        return `<!--MATH_BLOCK_${mathBlocks.length - 1}-->`;
      } catch (e) {
        return match;
      }
    });

    // Inline Math $ ... $
    processedText = processedText.replace(/\$([^\$\n]+?)\$/g, (match, math) => {
      try {
        const rendered = katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
        mathBlocks.push(rendered);
        return `<!--MATH_BLOCK_${mathBlocks.length - 1}-->`;
      } catch (e) {
        return match;
      }
    });

    let html = window.marked ? marked.parse(processedText) : processedText;

    html = html.replace(/<!--MATH_BLOCK_(\d+)-->/g, (match, index) => {
      return mathBlocks[parseInt(index, 10)] || match;
    });

    markdownPreview.innerHTML = html;
    renderMermaidDiagrams();
    generateTOC();
    setUnsaved(markdownInput.value !== initialContent);

    // Re-apply search if query active
    if (searchInput.value.trim()) {
      performSearch();
    }
  }

  function renderMermaidDiagrams() {
    const codeBlocks = markdownPreview.querySelectorAll('pre code.language-mermaid');
    codeBlocks.forEach((block, index) => {
      const parent = block.parentElement;
      const code = block.textContent;
      const id = `mermaid-graph-${index}-${Math.floor(Math.random() * 10000)}`;

      if (window.mermaid) {
        try {
          mermaid.render(id, code).then(result => {
            const wrapper = document.createElement('div');
            wrapper.className = 'mermaid-diagram';
            wrapper.setAttribute('data-mermaid-code', code);
            wrapper.setAttribute('contenteditable', 'false');
            wrapper.innerHTML = result.svg;
            parent.replaceWith(wrapper);
          }).catch(err => console.error('Mermaid render error:', err));
        } catch (e) {}
      }
    });
  }

  let currentActiveLine = -1;
  let isSyncScrolling = false;

  function updateActiveLineHighlight() {
    const textBefore = markdownInput.value.substring(0, markdownInput.selectionStart);
    const activeLineNum = textBefore.split('\n').length;
    
    if (activeLineNum !== currentActiveLine) {
      if (currentActiveLine > 0) {
        const prevEl = document.getElementById(`line-num-${currentActiveLine}`);
        if (prevEl) prevEl.classList.remove('active');
      }
      const newEl = document.getElementById(`line-num-${activeLineNum}`);
      if (newEl) newEl.classList.add('active');
      currentActiveLine = activeLineNum;
    }
  }

  function updateLineNumbersAndStats(text) {
    const lines = text.split('\n');
    const lineCount = lines.length;
    
    let lineNumsHtml = '';
    for (let i = 1; i <= lineCount; i++) {
      lineNumsHtml += `<div class="line-num" id="line-num-${i}">${i}</div>`;
    }
    lineNumbers.innerHTML = lineNumsHtml;
    
    currentActiveLine = -1;
    updateActiveLineHighlight();

    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;

    statLines.textContent = `${lineCount} líneas`;
    statWords.textContent = `${words} palabras`;
    statChars.textContent = `${chars} caracteres`;
  }

  ['keyup', 'click', 'focus', 'select', 'input'].forEach(evt => {
    markdownInput.addEventListener(evt, updateActiveLineHighlight);
  });

  // Sincronización en tiempo real: cambios en el editor de fuente → WYSIWYG
  let renderDebounceTimer = null;
  markdownInput.addEventListener('input', () => {
    clearTimeout(renderDebounceTimer);
    renderDebounceTimer = setTimeout(() => {
      if (!isSyncingFromWysiwyg) {
        renderMarkdown();
      }
    }, 300);
  });

  // Bi-directional synchronized scrolling in Dual Split View
  markdownInput.addEventListener('scroll', () => {
    lineNumbers.scrollTop = markdownInput.scrollTop;
    if (workspaceContainer.classList.contains('mode-split') && !isSyncScrolling) {
      isSyncScrolling = true;
      const maxInputScroll = markdownInput.scrollHeight - markdownInput.clientHeight;
      if (maxInputScroll > 0) {
        const ratio = markdownInput.scrollTop / maxInputScroll;
        const maxPreviewScroll = markdownPreview.scrollHeight - markdownPreview.clientHeight;
        markdownPreview.scrollTop = ratio * maxPreviewScroll;
      }
      setTimeout(() => { isSyncScrolling = false; }, 30);
    }
  });

  markdownPreview.addEventListener('scroll', () => {
    if (workspaceContainer.classList.contains('mode-split') && !isSyncScrolling) {
      isSyncScrolling = true;
      const maxPreviewScroll = markdownPreview.scrollHeight - markdownPreview.clientHeight;
      if (maxPreviewScroll > 0) {
        const ratio = markdownPreview.scrollTop / maxPreviewScroll;
        const maxInputScroll = markdownInput.scrollHeight - markdownInput.clientHeight;
        markdownInput.scrollTop = ratio * maxInputScroll;
        lineNumbers.scrollTop = markdownInput.scrollTop;
      }
      setTimeout(() => { isSyncScrolling = false; }, 30);
    }
  });

  function generateTOC() {
    const headings = markdownPreview.querySelectorAll('h1, h2, h3, h4');
    tocContainer.innerHTML = '';

    if (headings.length === 0) {
      tocContainer.innerHTML = '<p class="empty-state">No se han encontrado encabezados</p>';
      return;
    }

    headings.forEach((heading, idx) => {
      const id = `heading-${idx}`;
      heading.id = id;

      const level = parseInt(heading.tagName.replace('H', ''), 10);
      const a = document.createElement('a');
      a.className = `toc-item level-${level}`;
      a.textContent = heading.textContent;
      a.href = `#${id}`;

      a.addEventListener('click', (e) => {
        e.preventDefault();
        heading.scrollIntoView({ behavior: 'smooth' });
      });

      tocContainer.appendChild(a);
    });
  }

  function updateRecentFilesUI() {
    recentFilesList.innerHTML = '';
    if (recentFiles.length === 0) {
      recentFilesList.innerHTML = '<p class="empty-state">Sin historial reciente</p>';
      return;
    }

    recentFiles.forEach(file => {
      const item = document.createElement('div');
      item.className = 'recent-item';
      item.innerHTML = `
        <span class="recent-name" title="${file.filePath}">${file.fileName}</span>
        <button class="icon-btn-sm btn-delete-recent" title="Quitar de historial">&times;</button>
      `;

      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-delete-recent')) return;
        openFileFromPath(file.filePath);
      });

      item.querySelector('.btn-delete-recent').addEventListener('click', (e) => {
        e.stopPropagation();
        showConfirmModal({
          title: '¿Quitar del historial?',
          message: `¿Deseas remover "${file.fileName}" del historial de archivos recientes?`,
          confirmText: 'Quitar',
          onConfirm: () => {
            recentFiles = recentFiles.filter(f => f.filePath !== file.filePath);
            localStorage.setItem('mdvisor_recents', JSON.stringify(recentFiles));
            updateRecentFilesUI();
            showStickyToast('Historial Actualizado', `Se ha removido "${file.fileName}" del historial.`, 'sticky');
          }
        });
      });

      recentFilesList.appendChild(item);
    });
  }

  function addRecentFile(filePath, fileName) {
    if (!filePath) return;
    recentFiles = recentFiles.filter(f => f.filePath !== filePath);
    recentFiles.unshift({ filePath, fileName, timestamp: Date.now() });
    if (recentFiles.length > 10) recentFiles.pop();
    localStorage.setItem('mdvisor_recents', JSON.stringify(recentFiles));
    updateRecentFilesUI();
  }

  btnClearRecent.addEventListener('click', () => {
    if (recentFiles.length === 0) return;
    showConfirmModal({
      title: '¿Limpiar Historial?',
      message: '¿Estás seguro de que deseas vaciar completamente el historial de archivos recientes?',
      confirmText: 'Limpiar Todo',
      onConfirm: () => {
        recentFiles = [];
        localStorage.removeItem('mdvisor_recents');
        updateRecentFilesUI();
        showStickyToast('Historial Limpiado', 'El historial de archivos recientes ha sido vaciado.', 'sticky');
      }
    });
  });

  function setUnsaved(unsaved) {
    isUnsaved = unsaved;
    if (isUnsaved) {
      unsavedBadgeEl.classList.remove('hidden');
    } else {
      unsavedBadgeEl.classList.add('hidden');
    }
  }

  function setDocument(filePath, fileName, content) {
    currentFilePath = filePath;
    currentFileName = fileName || 'Sin título.md';
    initialContent = content;
    markdownInput.value = content;
    currentFilenameEl.textContent = currentFileName;
    document.title = `${currentFileName} - MD Wysiwyg`;
    
    setUnsaved(false);
    renderMarkdown();

    if (filePath) {
      addRecentFile(filePath, currentFileName);
    }
  }

  async function actionOpen() {
    if (isUnsaved) {
      showConfirmModal({
        title: '¿Descartar Cambios?',
        message: 'Tienes cambios no guardados en el documento actual. ¿Deseas continuar y abrir otro archivo?',
        confirmText: 'Descartar y Abrir',
        onConfirm: doOpenDialog
      });
    } else {
      doOpenDialog();
    }
  }

  async function doOpenDialog() {
    try {
      const res = await window.electronAPI.openFileDialog();
      if (res) {
        setDocument(res.filePath, res.fileName, res.content);
        if (res.isPdf) {
          setUnsaved(true);
          showStickyToast('PDF Convertido a Markdown', `Se extrajeron ${res.pageCount} páginas de "${res.fileName}". Puedes editarlo o guardarlo como .md.`, 'sticky');
        } else {
          showStickyToast('Archivo Cargado', `Se abrió "${res.fileName}" correctamente.`, 'sticky');
        }
      }
    } catch (err) {
      showStickyToast('Error', err.message, 'error');
    }
  }

  async function openFileFromPath(filePath) {
    try {
      const res = await window.electronAPI.readFile(filePath);
      if (res) {
        setDocument(res.filePath, res.fileName, res.content);
        if (res.isPdf) {
          setUnsaved(true);
          showStickyToast('PDF Convertido a Markdown', `Se extrajeron ${res.pageCount} páginas de "${res.fileName}". Puedes guardarlo como .md.`, 'sticky');
        } else {
          showStickyToast('Archivo Cargado', `Se cargó "${res.fileName}".`, 'sticky');
        }
      }
    } catch (err) {
      showStickyToast('Error al abrir', err.message, 'error');
    }
  }

  async function actionNew() {
    if (isUnsaved) {
      showConfirmModal({
        title: '¿Descartar Cambios?',
        message: 'El documento actual tiene cambios no guardados. ¿Deseas descartarlos y crear uno nuevo?',
        confirmText: 'Nuevo Documento',
        onConfirm: () => {
          setDocument(null, 'Sin título.md', '# Nuevo Documento Markdown\n\nEmpieza a escribir tu contenido aquí...');
          showStickyToast('Nuevo Documento', 'Se ha creado un documento en blanco.', 'sticky');
        }
      });
    } else {
      setDocument(null, 'Sin título.md', '# Nuevo Documento Markdown\n\nEmpieza a escribir tu contenido aquí...');
      showStickyToast('Nuevo Documento', 'Se ha creado un documento en blanco.', 'sticky');
    }
  }

  async function actionSave() {
    try {
      const res = await window.electronAPI.saveFile({
        filePath: currentFilePath,
        content: markdownInput.value
      });

      if (res && res.success) {
        currentFilePath = res.filePath;
        currentFileName = res.fileName;
        initialContent = markdownInput.value;
        currentFilenameEl.textContent = currentFileName;
        setUnsaved(false);
        addRecentFile(res.filePath, res.fileName);
        showStickyToast('Archivo Guardado', `"${res.fileName}" se guardó exitosamente en el disco.`, 'sticky');
      }
    } catch (err) {
      showStickyToast('Error al guardar', err.message, 'error');
    }
  }

  async function actionSaveAs() {
    try {
      const res = await window.electronAPI.saveFileAs({
        content: markdownInput.value,
        defaultName: currentFileName
      });

      if (res && res.success) {
        currentFilePath = res.filePath;
        currentFileName = res.fileName;
        initialContent = markdownInput.value;
        currentFilenameEl.textContent = currentFileName;
        setUnsaved(false);
        addRecentFile(res.filePath, res.fileName);
        showStickyToast('Archivo Guardado', `Guardado como "${res.fileName}".`, 'sticky');
      }
    } catch (err) {
      showStickyToast('Error', err.message, 'error');
    }
  }

  // Help & About Modals Controllers
  function openHelpModal() {
    if (helpModal) helpModal.classList.remove('hidden');
  }

  function closeHelpModal() {
    if (helpModal) helpModal.classList.add('hidden');
  }

  function openAboutModal() {
    if (aboutModal) aboutModal.classList.remove('hidden');
  }

  function closeAboutModal() {
    if (aboutModal) aboutModal.classList.add('hidden');
  }

  // Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F1') {
      e.preventDefault();
      openHelpModal();
      return;
    }

    if (e.key === 'Escape') {
      closeHelpModal();
      closeAboutModal();
      closeTableModal();
      closeMermaidModal();
      closeLinkModal();
      closeConfirmModal();
    }

    if (e.ctrlKey || e.metaKey) {
      if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (e.shiftKey) actionSaveAs(); else actionSave();
      } else if (e.key.toLowerCase() === 'o') {
        e.preventDefault(); actionOpen();
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault(); actionNew();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault(); searchInput.focus(); searchInput.select();
      }
    }
  });

  // --- Integrated Dropdown Menus Logic ---
  const allDropdowns = [dropdownArchivo, dropdownEdicion, dropdownVer, dropdownTema, dropdownAyuda];
  const allMenuBtns = [menuBtnArchivo, menuBtnEdicion, menuBtnVer, menuBtnTema, menuBtnAyuda];

  function closeAllMenus() {
    allDropdowns.forEach(d => { if (d) d.classList.add('hidden'); });
    allMenuBtns.forEach(b => { if (b) b.classList.remove('active'); });
  }

  function toggleMenu(btn, dropdown) {
    if (!dropdown || !btn) return;
    const isHidden = dropdown.classList.contains('hidden');
    closeAllMenus();
    if (isHidden) {
      dropdown.classList.remove('hidden');
      btn.classList.add('active');
    }
  }

  if (menuBtnArchivo) menuBtnArchivo.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(menuBtnArchivo, dropdownArchivo); });
  if (menuBtnEdicion) menuBtnEdicion.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(menuBtnEdicion, dropdownEdicion); });
  if (menuBtnVer) menuBtnVer.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(menuBtnVer, dropdownVer); });
  if (menuBtnTema) menuBtnTema.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(menuBtnTema, dropdownTema); });
  if (menuBtnAyuda) menuBtnAyuda.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(menuBtnAyuda, dropdownAyuda); });

  document.addEventListener('click', closeAllMenus);

  // Menu Item Event Listeners
  if (menuItemNew) menuItemNew.addEventListener('click', () => { closeAllMenus(); actionNew(); });
  if (menuItemOpen) menuItemOpen.addEventListener('click', () => { closeAllMenus(); actionOpen(); });
  if (menuItemSave) menuItemSave.addEventListener('click', () => { closeAllMenus(); actionSave(); });
  if (menuItemSaveAs) menuItemSaveAs.addEventListener('click', () => { closeAllMenus(); actionSaveAs(); });

  // Clean Exports (PDF / HTML only export rendered visualizer preview)
  if (menuItemExportPdf) menuItemExportPdf.addEventListener('click', async () => {
    closeAllMenus();
    removeSearchHighlights();
    try {
      showStickyToast('Exportando', 'Generando PDF...', 'sticky');
      const res = await window.electronAPI.exportPDF({ defaultName: currentFileName });
      if (res && res.success) showStickyToast('Exportación Exitosa', `Guardado como PDF en "${res.filePath}".`, 'sticky');
    } catch (err) { showStickyToast('Error', err.message, 'error'); }
  });

  if (menuItemExportHtml) menuItemExportHtml.addEventListener('click', async () => {
    closeAllMenus();
    removeSearchHighlights();
    try {
      const res = await window.electronAPI.exportHTML({ contentHtml: markdownPreview.innerHTML, title: currentFileName });
      if (res && res.success) showStickyToast('Exportación Exitosa', `Guardado como HTML en "${res.filePath}".`, 'sticky');
    } catch (err) { showStickyToast('Error', err.message, 'error'); }
  });

  if (menuItemSearch) menuItemSearch.addEventListener('click', () => { closeAllMenus(); searchInput.focus(); searchInput.select(); });
  if (menuItemClearHistory) menuItemClearHistory.addEventListener('click', () => {
    closeAllMenus();
    if (btnClearRecent) btnClearRecent.click();
  });

  if (menuItemViewSplit) menuItemViewSplit.addEventListener('click', () => { closeAllMenus(); setViewMode('split'); });
  if (menuItemViewPreview) menuItemViewPreview.addEventListener('click', () => { closeAllMenus(); setViewMode('preview'); });
  if (menuItemViewEditor) menuItemViewEditor.addEventListener('click', () => { closeAllMenus(); setViewMode('editor'); });
  if (menuItemToggleWrap) menuItemToggleWrap.addEventListener('click', () => { closeAllMenus(); if (btnWordWrap) btnWordWrap.click(); });

  if (menuItemHelp) menuItemHelp.addEventListener('click', () => { closeAllMenus(); openHelpModal(); });
  if (menuItemAbout) menuItemAbout.addEventListener('click', () => { closeAllMenus(); openAboutModal(); });

  if (helpBtnClose) helpBtnClose.addEventListener('click', closeHelpModal);
  if (aboutBtnClose) aboutBtnClose.addEventListener('click', closeAboutModal);

  if (aboutUrlLink) {
    aboutUrlLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.electronAPI && window.electronAPI.openExternal) {
        window.electronAPI.openExternal('https://merk.net');
      }
    });
  }

  function applyTheme(theme, label) {
    closeAllMenus();
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mdvisor_theme', theme);
    const hljsLink = document.getElementById('hljs-theme');
    if (hljsLink) {
      if (theme === 'light') hljsLink.href = '../node_modules/highlight.js/styles/github.css';
      else hljsLink.href = '../node_modules/highlight.js/styles/github-dark.css';
    }
    showStickyToast('Tema Cambiado', `Se aplicó el tema ${label}.`, 'sticky');
  }

  if (themeOptObsidian) themeOptObsidian.addEventListener('click', () => applyTheme('obsidian', 'Dark Obsidian'));
  if (themeOptLight) themeOptLight.addEventListener('click', () => applyTheme('light', 'Clean Light'));
  if (themeOptForest) themeOptForest.addEventListener('click', () => applyTheme('forest', 'Emerald Forest'));
  if (themeOptCyberpunk) themeOptCyberpunk.addEventListener('click', () => applyTheme('cyberpunk', 'Cyberpunk'));

  // Quick Action Toolbar Buttons
  btnNew.addEventListener('click', actionNew);
  btnOpen.addEventListener('click', actionOpen);
  btnSave.addEventListener('click', actionSave);

  // --- Caret Position & Editor State Tracking System ---
  let lastActiveEditor = 'preview'; // Default to preview
  let savedInputCaretPos = 0;
  let savedWysiwygRange = null;
  let lastActiveWysiwygNode = null;

  function trackInputCaret(e) {
    if (e && e.target && e.target.closest && e.target.closest('.wysiwyg-toolbar, .editor-toolbar, .modal-backdrop, button')) {
      return;
    }
    lastActiveEditor = 'editor';
    savedInputCaretPos = markdownInput.selectionStart;
  }
  ['click', 'keyup', 'focus', 'select'].forEach(evt => markdownInput.addEventListener(evt, trackInputCaret));

  function trackWysiwygCaret(e) {
    if (e && e.target && e.target.closest && e.target.closest('.wysiwyg-toolbar, .editor-toolbar, .modal-backdrop, button')) {
      return;
    }
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const r = sel.getRangeAt(0);
      if (markdownPreview.contains(r.commonAncestorContainer)) {
        lastActiveEditor = 'preview';
        savedWysiwygRange = r.cloneRange();

        let node = r.startContainer;
        if (node.nodeType === 3) node = node.parentNode;
        while (node && node.parentNode !== markdownPreview) {
          node = node.parentNode;
        }
        if (node && node !== markdownPreview) {
          lastActiveWysiwygNode = node;
        }
      }
    }
  }

  ['mouseup', 'keyup', 'focus', 'click'].forEach(evt => {
    markdownPreview.addEventListener(evt, trackWysiwygCaret);
  });

  // --- Markdown Formatting Toolbar Helper ---
  function insertFormattingAtSavedInputCaret(prefix, suffix = '', defaultText = '') {
    markdownInput.focus();
    const pos = (savedInputCaretPos !== undefined && savedInputCaretPos !== null) ? savedInputCaretPos : markdownInput.value.length;
    const endPos = (markdownInput.selectionEnd && markdownInput.selectionEnd >= pos) ? markdownInput.selectionEnd : pos;
    const text = markdownInput.value;
    const selectedText = text.substring(pos, endPos);
    const replacement = selectedText.length > 0 ? selectedText : defaultText;
    
    const newContent = text.substring(0, pos) + prefix + replacement + suffix + text.substring(endPos);
    markdownInput.value = newContent;
    
    const cursorStart = pos + prefix.length;
    const cursorEnd = cursorStart + replacement.length;
    markdownInput.setSelectionRange(cursorStart, cursorEnd);
    savedInputCaretPos = cursorEnd;
    
    renderMarkdown();
  }

  function insertFormatting(prefix, suffix = '', defaultText = '') {
    insertFormattingAtSavedInputCaret(prefix, suffix, defaultText);
  }

  // Helper for context-aware insertion at saved caret in WYSIWYG Editor (after block if inside code/table)
  function insertHtmlAtSavedWysiwygCaret(htmlStr) {
    markdownPreview.focus();
    const sel = window.getSelection();
    sel.removeAllRanges();

    let inserted = false;

    if (savedWysiwygRange) {
      try {
        sel.addRange(savedWysiwygRange);
        if (sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          let node = range.startContainer;
          if (node.nodeType === 3) node = node.parentNode;

          const blockParent = node.closest('pre, table, .mermaid-diagram, svg, blockquote');
          if (blockParent && markdownPreview.contains(blockParent)) {
            blockParent.insertAdjacentHTML('afterend', htmlStr);
            inserted = true;
          } else {
            range.deleteContents();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlStr;
            const frag = document.createDocumentFragment();
            let lastNode;
            while (tempDiv.firstChild) {
              lastNode = frag.appendChild(tempDiv.firstChild);
            }
            range.insertNode(frag);
            if (lastNode) {
              range.setStartAfter(lastNode);
              range.setEndAfter(lastNode);
              sel.removeAllRanges();
              sel.addRange(range);
            }
            inserted = true;
          }
        }
      } catch (e) {
        console.warn('Range insertion error:', e);
      }
    }

    if (!inserted) {
      if (lastActiveWysiwygNode && markdownPreview.contains(lastActiveWysiwygNode)) {
        lastActiveWysiwygNode.insertAdjacentHTML('afterend', htmlStr);
      } else {
        markdownPreview.insertAdjacentHTML('beforeend', htmlStr);
      }
    }

    if (sel.rangeCount > 0) {
      try {
        savedWysiwygRange = sel.getRangeAt(0).cloneRange();
      } catch (e) {}
    }

    syncWysiwygToMarkdown();
  }

  // Formatting Toolbar Event Listeners (except tb-table which uses custom modal)
  const toolbarBindings = [
    { id: 'tb-bold', prefix: '**', suffix: '**', text: 'texto en negrita' },
    { id: 'tb-italic', prefix: '*', suffix: '*', text: 'texto en cursiva' },
    { id: 'tb-heading', prefix: '### ', suffix: '', text: 'Encabezado' },
    { id: 'tb-strikethrough', prefix: '~~', suffix: '~~', text: 'texto tachado' },
    { id: 'tb-ul', prefix: '- ', suffix: '', text: 'Elemento de lista' },
    { id: 'tb-ol', prefix: '1. ', suffix: '', text: 'Elemento numerado' },
    { id: 'tb-quote', prefix: '> ', suffix: '', text: 'Texto en cita' },
    { id: 'tb-code', prefix: '`', suffix: '`', text: 'código en línea' },
    { id: 'tb-codeblock', prefix: '```javascript\n', suffix: '\n```', text: '// Tu código aquí' },
    { id: 'tb-link', prefix: '[', suffix: '](https://ejemplo.com)', text: 'texto del enlace' },
    { id: 'tb-image', prefix: '![', suffix: '](https://ejemplo.com/imagen.jpg)', text: 'descripción de imagen' },
    { id: 'tb-math', prefix: '$', suffix: '$', text: 'e = mc^2' },
    { id: 'tb-hr', prefix: '\n---\n', suffix: '', text: '' }
  ];

  toolbarBindings.forEach(item => {
    const el = document.getElementById(item.id);
    if (el) {
      el.addEventListener('click', () => {
        insertFormatting(item.prefix, item.suffix, item.text);
      });
    }
  });

  // --- Dynamic Table Generation Modal Logic ---
  const tableModal = document.getElementById('table-modal');
  const tableRowsInput = document.getElementById('table-rows-input');
  const tableColsInput = document.getElementById('table-cols-input');
  const tableBtnCancel = document.getElementById('table-btn-cancel');
  const tableBtnInsert = document.getElementById('table-btn-insert');
  const tbTableBtn = document.getElementById('tb-table');

  function openTableModal() {
    // Capturar contexto ANTES de que el modal tome el foco
    modalInsertAnchor = lastActiveWysiwygNode;
    modalInsertEditor = lastActiveEditor;
    tableRowsInput.value = 3;
    tableColsInput.value = 3;
    tableModal.classList.remove('hidden');
    setTimeout(() => {
      tableRowsInput.focus();
      tableRowsInput.select();
    }, 50);
  }

  function closeTableModal() {
    tableModal.classList.add('hidden');
  }

  function generateTableMarkdown(rows, cols) {
    const rCount = Math.max(1, Math.min(100, parseInt(rows, 10) || 3));
    const cCount = Math.max(1, Math.min(30, parseInt(cols, 10) || 3));

    let headerRow = '|';
    let separatorRow = '|';
    for (let c = 1; c <= cCount; c++) {
      headerRow += ` Encabezado ${c} |`;
      separatorRow += ' --- |';
    }

    const dataRows = [];
    for (let r = 1; r <= rCount; r++) {
      let rowStr = '|';
      for (let c = 1; c <= cCount; c++) {
        rowStr += ` Dato ${r}.${c} |`;
      }
      dataRows.push(rowStr);
    }

    return `\n${headerRow}\n${separatorRow}\n${dataRows.join('\n')}\n`;
  }

  // --- Initialize Turndown HTML-to-Markdown Engine ---
  let turndownService = null;
  if (window.TurndownService) {
    turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
      strongDelimiter: '**'
    });

    // Rule for GFM Tables conversion back to Markdown
    turndownService.addRule('tables', {
      filter: ['table'],
      replacement: function(content, node) {
        const rows = Array.from(node.querySelectorAll('tr'));
        if (rows.length === 0) return '';
        
        const mdRows = [];
        rows.forEach((tr, rIdx) => {
          const cells = Array.from(tr.querySelectorAll('th, td'));
          const cellStrs = cells.map(td => td.textContent.trim().replace(/\|/g, '\\|'));
          mdRows.push(`| ${cellStrs.join(' | ')} |`);
          
          if (rIdx === 0) {
            const sepStrs = cells.map(() => '---');
            mdRows.push(`| ${sepStrs.join(' | ')} |`);
          }
        });
        
        return `\n\n${mdRows.join('\n')}\n\n`;
      }
    });

    // Rule for Mermaid Diagrams conversion back to Markdown code blocks
    turndownService.addRule('mermaidDiagrams', {
      filter: function(node) {
        return node.classList && node.classList.contains('mermaid-diagram');
      },
      replacement: function(content, node) {
        const code = node.getAttribute('data-mermaid-code') || content || '';
        return `\n\n\`\`\`mermaid\n${code.trim()}\n\`\`\`\n\n`;
      }
    });
  }

  // --- Mermaid Preset Diagrams & Modal System ---
  const mermaidModal = document.getElementById('mermaid-modal');
  const mermaidTypeSelect = document.getElementById('mermaid-type-select');
  const mermaidBtnCancel = document.getElementById('mermaid-btn-cancel');
  const mermaidBtnInsert = document.getElementById('mermaid-btn-insert');
  const tbMermaidBtn = document.getElementById('tb-mermaid');
  const wyMermaidBtn = document.getElementById('wy-mermaid');

  const MERMAID_PRESETS = {
    flowchart: `\n\`\`\`mermaid\ngraph TD\n    A[Inicio] --> B{¿Es correcto?}\n    B -- Sí --> C[Procesar Registro]\n    B -- No --> D[Mostrar Error]\n    C --> E[Fin]\n\`\`\`\n`,
    sequence: `\n\`\`\`mermaid\nsequenceDiagram\n    autonumber\n    Cliente->>Servidor: Solicitud de datos\n    Servidor-->>Cliente: Respuesta con información\n\`\`\`\n`,
    gantt: `\n\`\`\`mermaid\ngantt\n    title Cronograma del Proyecto\n    dateFormat YYYY-MM-DD\n    section Planificación\n    Análisis          :a1, 2026-08-01, 5d\n    Diseño            :after a1, 7d\n\`\`\`\n`,
    class: `\n\`\`\`mermaid\nclassDiagram\n    class Usuario {\n        +String nombre\n        +String email\n        +login()\n    }\n\`\`\`\n`,
    state: `\n\`\`\`mermaid\nstateDiagram-v2\n    [*] --> Inactivo\n    Inactivo --> Activo : Iniciar sesión\n    Activo --> [*] : Cerrar sesión\n\`\`\`\n`
  };

  function openMermaidModal() {
    if (mermaidModal) mermaidModal.classList.remove('hidden');
  }

  function closeMermaidModal() {
    if (mermaidModal) mermaidModal.classList.add('hidden');
  }



  function handleConfirmMermaid() {
    const selectedType = mermaidTypeSelect ? mermaidTypeSelect.value : 'flowchart';
    const mermaidCode = MERMAID_PRESETS[selectedType] || MERMAID_PRESETS.flowchart;

    if (lastActiveEditor === 'preview') {
      const cleanMermaid = mermaidCode.trim().replace(/^```mermaid\n/, '').replace(/\n```$/, '');
      const tempHtml = `<pre><code class="language-mermaid">${cleanMermaid}</code></pre><p><br></p>`;
      insertHtmlAtSavedWysiwygCaret(tempHtml);
      renderMermaidDiagrams();
    } else {
      insertFormattingAtSavedInputCaret(mermaidCode, '', '');
    }

    closeMermaidModal();
    showStickyToast('Diagrama Insertado', `Se ha agregado un diagrama Mermaid (${selectedType}).`, 'sticky');
  }

  preventSelectionLoss(wyMermaidBtn);
  if (tbMermaidBtn) tbMermaidBtn.addEventListener('click', openMermaidModal);
  if (wyMermaidBtn) wyMermaidBtn.addEventListener('click', openMermaidModal);
  if (mermaidBtnCancel) mermaidBtnCancel.addEventListener('click', closeMermaidModal);
  if (mermaidBtnInsert) mermaidBtnInsert.addEventListener('click', handleConfirmMermaid);

  // Synchronize caret and line highlight from WYSIWYG Editor to Source Text Editor
  function syncCaretFromWysiwygToEditor() {
    const activeEl = document.activeElement;
    if (activeEl !== markdownPreview && !markdownPreview.contains(activeEl)) return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    let node = sel.anchorNode;
    if (!node) return;
    if (node.nodeType === 3) node = node.parentNode;

    // Traverse up to direct child of markdownPreview
    let block = node;
    while (block && block.parentNode !== markdownPreview) {
      block = block.parentNode;
    }
    if (!block || block === markdownPreview) return;

    const blockText = (block.textContent || '').trim();
    if (!blockText) return;

    const lines = markdownInput.value.split('\n');
    let matchedLineIndex = -1;

    // Search for line in markdownInput matching blockText
    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const cleanLine = rawLine.replace(/^[#*>\-\d\.\s\|]+/, '').replace(/[\|\s]+$/, '').trim();
      
      if (cleanLine && (blockText.includes(cleanLine) || cleanLine.includes(blockText.substring(0, 15)))) {
        matchedLineIndex = i;
        break;
      }
    }

    if (matchedLineIndex !== -1) {
      let charPos = 0;
      for (let i = 0; i < matchedLineIndex; i++) {
        charPos += lines[i].length + 1;
      }

      markdownInput.selectionStart = charPos;
      markdownInput.selectionEnd = charPos;
      updateActiveLineHighlight();

      if (workspaceContainer.classList.contains('mode-split') && !isSyncScrolling) {
        isSyncScrolling = true;
        const lineEl = document.getElementById(`line-num-${matchedLineIndex + 1}`);
        if (lineEl) {
          const lineTop = lineEl.offsetTop - 60;
          markdownInput.scrollTop = Math.max(0, lineTop);
          lineNumbers.scrollTop = markdownInput.scrollTop;
        }
        setTimeout(() => { isSyncScrolling = false; }, 40);
      }
    }
  }

  ['click', 'keyup', 'focus'].forEach(evt => {
    markdownPreview.addEventListener(evt, syncCaretFromWysiwygToEditor);
  });
  document.addEventListener('selectionchange', () => {
    if (document.activeElement === markdownPreview || markdownPreview.contains(document.activeElement)) {
      syncCaretFromWysiwygToEditor();
    }
  });

  // --- Bi-Directional Synchronized WYSIWYG Engine ---
  let isSyncingFromWysiwyg = false;

  function syncWysiwygToMarkdown() {
    if (isSyncingFromWysiwyg || !turndownService) return;
    isSyncingFromWysiwyg = true;
    try {
      const cleanClone = markdownPreview.cloneNode(true);
      const marks = cleanClone.querySelectorAll('mark.search-highlight');
      marks.forEach(m => {
        const parent = m.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(m.textContent), m);
          parent.normalize();
        }
      });

      const markdown = turndownService.turndown(cleanClone.innerHTML);
      const prevPos = markdownInput.selectionStart;
      markdownInput.value = markdown;
      updateLineNumbersAndStats(markdown);

      if (document.activeElement === markdownPreview || markdownPreview.contains(document.activeElement)) {
        syncCaretFromWysiwygToEditor();
      } else if (prevPos !== undefined) {
        markdownInput.selectionStart = prevPos;
        markdownInput.selectionEnd = prevPos;
        updateActiveLineHighlight();
      }

      generateTOC();
      setUnsaved(markdown !== initialContent);
    } catch (err) {
      console.error('Wysiwyg sync error:', err);
    } finally {
      isSyncingFromWysiwyg = false;
    }
  }

  // Listen for real-time edits in WYSIWYG container
  markdownPreview.addEventListener('input', syncWysiwygToMarkdown);
  markdownPreview.addEventListener('keyup', (e) => {
    if (e.key === 'Enter' || e.key === 'Backspace' || e.key === 'Delete') {
      syncWysiwygToMarkdown();
    }
  });

  // Helper para restaurar la selección guardada y enfocar el preview
  function restoreWysiwygSelection() {
    markdownPreview.focus();
    if (savedWysiwygRange) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      try {
        sel.addRange(savedWysiwygRange.cloneRange());
      } catch (e) {}
    }
    lastActiveEditor = 'preview';
  }

  // Previene pérdida de selección en todos los botones de la barra WYSIWYG
  function preventSelectionLoss(btn) {
    if (btn) btn.addEventListener('mousedown', (e) => e.preventDefault());
  }

  // WYSIWYG Toolbar Event Listeners
  const wysiwygBindings = [
    { id: 'wy-bold', cmd: 'bold' },
    { id: 'wy-italic', cmd: 'italic' },
    { id: 'wy-h1', cmd: 'formatBlock', arg: '<h1>' },
    { id: 'wy-h2', cmd: 'formatBlock', arg: '<h2>' },
    { id: 'wy-h3', cmd: 'formatBlock', arg: '<h3>' },
    { id: 'wy-strike', cmd: 'strikeThrough' },
    { id: 'wy-ul', cmd: 'insertUnorderedList' },
    { id: 'wy-ol', cmd: 'insertOrderedList' },
    { id: 'wy-quote', cmd: 'formatBlock', arg: '<blockquote>' },
    { id: 'wy-clear', cmd: 'removeFormat' }
  ];

  // Helper: devuelve el tag del bloque donde está el cursor
  function getCurrentBlockTag() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return 'p';
    let node = sel.anchorNode;
    if (node && node.nodeType === 3) node = node.parentNode;
    while (node && node !== markdownPreview) {
      const tag = node.nodeName.toLowerCase();
      if (['h1','h2','h3','h4','h5','h6','blockquote','pre','p','div','li'].includes(tag)) return tag;
      node = node.parentNode;
    }
    return 'p';
  }

  // Helper: actualiza clases 'active' en botones WYSIWYG según el contexto del cursor
  function updateWysiwygButtonStates() {
    const currentTag = getCurrentBlockTag();
    const isBold = document.queryCommandState('bold');
    const isItalic = document.queryCommandState('italic');
    const isStrike = document.queryCommandState('strikeThrough');
    const isUL = document.queryCommandState('insertUnorderedList');
    const isOL = document.queryCommandState('insertOrderedList');

    const stateMap = {
      'wy-bold': isBold,
      'wy-italic': isItalic,
      'wy-strike': isStrike,
      'wy-ul': isUL,
      'wy-ol': isOL,
      'wy-h1': currentTag === 'h1',
      'wy-h2': currentTag === 'h2',
      'wy-h3': currentTag === 'h3',
      'wy-quote': currentTag === 'blockquote'
    };

    Object.entries(stateMap).forEach(([id, active]) => {
      const btn = document.getElementById(id);
      if (btn) btn.classList.toggle('active', active);
    });
  }

  wysiwygBindings.forEach(item => {
    const el = document.getElementById(item.id);
    if (el) {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Impedir que el clic pierda la selección actual
      });
      el.addEventListener('click', () => {
        restoreWysiwygSelection();

        if (item.cmd === 'formatBlock') {
          // Toggle: si ya está en ese bloque, volver a párrafo
          const currentTag = getCurrentBlockTag();
          const targetTag = item.arg.replace(/[<>]/g, ''); // e.g. 'h1', 'blockquote'
          const revertTag = targetTag === 'blockquote' ? '<p>' : '<p>';
          if (currentTag === targetTag) {
            document.execCommand('formatBlock', false, revertTag);
          } else {
            document.execCommand('formatBlock', false, item.arg);
          }
        } else {
          document.execCommand(item.cmd, false, item.arg || null);
        }

        updateWysiwygButtonStates();
        syncWysiwygToMarkdown();
      });
    }
  });

  // Actualizar estados de botones al mover el cursor en el WYSIWYG
  markdownPreview.addEventListener('keyup', updateWysiwygButtonStates);
  markdownPreview.addEventListener('mouseup', updateWysiwygButtonStates);
  markdownPreview.addEventListener('selectionchange', updateWysiwygButtonStates);

  // Nodo activo capturado al abrir el modal (antes de que el foco en inputs invalide el Range)
  let modalInsertAnchor = null;
  let modalInsertEditor = null;

  // --- Link Configuration Modal Logic ---
  const linkModal = document.getElementById('link-modal');
  const linkTextInput = document.getElementById('link-text-input');
  const linkUrlInput = document.getElementById('link-url-input');
  const linkBtnCancel = document.getElementById('link-btn-cancel');
  const linkBtnInsert = document.getElementById('link-btn-insert');
  const tbLinkBtn = document.getElementById('tb-link');
  const wyLinkBtn = document.getElementById('wy-link');

  function openLinkModal() {
    // Capturar contexto ANTES de que el modal tome el foco
    modalInsertAnchor = lastActiveWysiwygNode;
    modalInsertEditor = lastActiveEditor;
    let selText = '';
    if (lastActiveEditor === 'preview' && savedWysiwygRange) {
      selText = savedWysiwygRange.toString();
    } else if (lastActiveEditor === 'editor') {
      selText = markdownInput.value.substring(markdownInput.selectionStart, markdownInput.selectionEnd);
    }
    if (linkTextInput) linkTextInput.value = selText || 'Mi Enlace';
    if (linkUrlInput) linkUrlInput.value = 'https://';
    if (linkModal) linkModal.classList.remove('hidden');
    setTimeout(() => {
      if (linkUrlInput) {
        linkUrlInput.focus();
        linkUrlInput.select();
      }
    }, 50);
  }

  function closeLinkModal() {
    if (linkModal) linkModal.classList.add('hidden');
  }

  function handleConfirmLink() {
    const text = linkTextInput ? linkTextInput.value.trim() : 'Mi Enlace';
    const url = linkUrlInput ? linkUrlInput.value.trim() : 'https://';

    if (modalInsertEditor === 'preview') {
      const htmlLink = `<a href="${url}" target="_blank" rel="noopener noreferrer">${text || url}</a>`;
      if (modalInsertAnchor && markdownPreview.contains(modalInsertAnchor)) {
        modalInsertAnchor.insertAdjacentHTML('afterend', htmlLink);
        syncWysiwygToMarkdown();
      } else {
        insertHtmlAtSavedWysiwygCaret(htmlLink);
      }
    } else {
      const mdLink = `[${text || url}](${url})`;
      insertFormattingAtSavedInputCaret(mdLink, '', '');
    }

    closeLinkModal();
    showStickyToast('Enlace Insertado', `Se ha añadido el enlace a "${url}".`, 'sticky');
  }

  preventSelectionLoss(wyLinkBtn);
  if (tbLinkBtn) tbLinkBtn.addEventListener('click', openLinkModal);
  if (wyLinkBtn) wyLinkBtn.addEventListener('click', openLinkModal);
  if (linkBtnCancel) linkBtnCancel.addEventListener('click', closeLinkModal);
  if (linkBtnInsert) linkBtnInsert.addEventListener('click', handleConfirmLink);

  if (linkTextInput) {
    linkTextInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleConfirmLink(); });
  }
  if (linkUrlInput) {
    linkUrlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleConfirmLink(); });
  }

  const wyTableBtn = document.getElementById('wy-table');
  preventSelectionLoss(wyTableBtn);
  if (wyTableBtn) {
    wyTableBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openTableModal();
    });
  }

  function handleConfirmTable() {
    const rows = tableRowsInput.value;
    const cols = tableColsInput.value;
    
    if (modalInsertEditor === 'preview') {
      const rCount = Math.max(1, Math.min(100, parseInt(rows, 10) || 3));
      const cCount = Math.max(1, Math.min(30, parseInt(cols, 10) || 3));
      
      let htmlTable = '<table style="width:100%; border-collapse:collapse; margin:1em 0;"><thead><tr>';
      for (let c = 1; c <= cCount; c++) htmlTable += `<th style="border:1px solid var(--border-color); padding:8px;">Encabezado ${c}</th>`;
      htmlTable += '</tr></thead><tbody>';
      for (let r = 1; r <= rCount; r++) {
        htmlTable += '<tr>';
        for (let c = 1; c <= cCount; c++) htmlTable += `<td style="border:1px solid var(--border-color); padding:8px;">Dato ${r}.${c}</td>`;
        htmlTable += '</tr>';
      }
      htmlTable += '</tbody></table><p><br></p>';
      
      if (modalInsertAnchor && markdownPreview.contains(modalInsertAnchor)) {
        modalInsertAnchor.insertAdjacentHTML('afterend', htmlTable);
        syncWysiwygToMarkdown();
      } else {
        insertHtmlAtSavedWysiwygCaret(htmlTable);
      }
    } else {
      const tableMd = generateTableMarkdown(rows, cols);
      insertFormattingAtSavedInputCaret(tableMd, '', '');
    }

    closeTableModal();
    showStickyToast('Tabla Insertada', `Se ha generado una tabla de ${rows} filas por ${cols} columnas.`, 'sticky');
  }

  if (tbTableBtn) tbTableBtn.addEventListener('click', openTableModal);
  if (tableBtnCancel) tableBtnCancel.addEventListener('click', closeTableModal);
  if (tableBtnInsert) tableBtnInsert.addEventListener('click', handleConfirmTable);

  [tableRowsInput, tableColsInput].forEach(input => {
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleConfirmTable();
        } else if (e.key === 'Escape') {
          closeTableModal();
        }
      });
    }
  });

  // Synced View Mode Switches
  function setViewMode(mode) {
    workspaceContainer.className = `workspace mode-${mode}`;
    document.querySelectorAll('.mode-btn-split').forEach(btn => btn.classList.toggle('active', mode === 'split'));
    document.querySelectorAll('.mode-btn-preview').forEach(btn => btn.classList.toggle('active', mode === 'preview'));
    document.querySelectorAll('.mode-btn-editor').forEach(btn => btn.classList.toggle('active', mode === 'editor'));

    if (totalSearchMatches > 0 && currentMatchIndex >= 0) {
      setTimeout(updateMatchHighlighting, 50);
    }
  }

  document.querySelectorAll('.mode-btn-split').forEach(btn => {
    btn.addEventListener('click', () => setViewMode('split'));
  });
  document.querySelectorAll('.mode-btn-preview').forEach(btn => {
    btn.addEventListener('click', () => setViewMode('preview'));
  });
  document.querySelectorAll('.mode-btn-editor').forEach(btn => {
    btn.addEventListener('click', () => setViewMode('editor'));
  });

  // Restore Theme
  const savedTheme = localStorage.getItem('mdvisor_theme') || 'obsidian';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Sidebar Controls
  btnToggleSidebar.addEventListener('click', () => {
    sidebar.classList.add('collapsed');
    btnOpenSidebar.classList.remove('hidden');
  });

  btnOpenSidebar.addEventListener('click', () => {
    sidebar.classList.remove('collapsed');
    btnOpenSidebar.classList.add('hidden');
  });

  tabToc.addEventListener('click', () => {
    tabToc.classList.add('active');
    tabRecent.classList.remove('active');
    paneToc.classList.add('active');
    paneRecent.classList.remove('active');
  });

  tabRecent.addEventListener('click', () => {
    tabRecent.classList.add('active');
    tabToc.classList.remove('active');
    paneRecent.classList.add('active');
    paneToc.classList.remove('active');
  });

  btnWordWrap.addEventListener('click', () => {
    btnWordWrap.classList.toggle('active');
    markdownInput.classList.toggle('wrap-active');
  });

  // --- DUAL SYNCHRONIZED SEARCH & SCROLL ENGINE ---
  function removeSearchHighlights() {
    const marks = markdownPreview.querySelectorAll('mark.search-highlight');
    marks.forEach(mark => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize();
      }
    });
  }

  function highlightMatchesInNode(node, query) {
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
    const nodesToReplace = [];

    let currentNode;
    while (currentNode = walker.nextNode()) {
      if (currentNode.parentNode.closest('mark.search-highlight') || 
          currentNode.parentNode.tagName === 'SCRIPT' || 
          currentNode.parentNode.tagName === 'STYLE') {
        continue;
      }
      if (regex.test(currentNode.nodeValue)) {
        nodesToReplace.push(currentNode);
      }
    }

    nodesToReplace.forEach(textNode => {
      const parent = textNode.parentNode;
      const frag = document.createDocumentFragment();
      let lastIdx = 0;
      textNode.nodeValue.replace(regex, (match, p1, offset) => {
        frag.appendChild(document.createTextNode(textNode.nodeValue.substring(lastIdx, offset)));
        const mark = document.createElement('mark');
        mark.className = 'search-highlight';
        mark.textContent = match;
        frag.appendChild(mark);
        lastIdx = offset + match.length;
      });
      frag.appendChild(document.createTextNode(textNode.nodeValue.substring(lastIdx)));
      parent.replaceChild(frag, textNode);
    });
  }

  function performSearch() {
    const query = searchInput.value.trim();
    removeSearchHighlights();

    if (!query) {
      if (btnSearchClear) btnSearchClear.classList.add('hidden');
      searchCount.classList.add('hidden');
      searchMatchesPreview = [];
      searchMatchesEditor = [];
      totalSearchMatches = 0;
      currentMatchIndex = -1;
      return;
    }

    if (btnSearchClear) btnSearchClear.classList.remove('hidden');

    // 1. Find & Highlight matches in Rendered Preview DOM
    highlightMatchesInNode(markdownPreview, query);
    searchMatchesPreview = Array.from(markdownPreview.querySelectorAll('mark.search-highlight'));

    // 2. Find matches in Raw Text Editor Textarea
    const rawText = markdownInput.value;
    searchMatchesEditor = [];
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    let match;
    while ((match = regex.exec(rawText)) !== null) {
      searchMatchesEditor.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0]
      });
    }

    totalSearchMatches = Math.max(searchMatchesPreview.length, searchMatchesEditor.length);

    if (totalSearchMatches > 0) {
      currentMatchIndex = 0;
      updateMatchHighlighting();
    } else {
      currentMatchIndex = -1;
      searchCount.textContent = '0/0';
      searchCount.classList.remove('hidden');
    }
  }

  function updateMatchHighlighting() {
    if (totalSearchMatches === 0) return;

    const isEditorVisible = !workspaceContainer.classList.contains('mode-preview');
    const isPreviewVisible = !workspaceContainer.classList.contains('mode-editor');

    // 1. SCROLL & HIGHLIGHT IN VISOR (PREVIEW)
    if (isPreviewVisible && searchMatchesPreview.length > 0) {
      const previewIndex = currentMatchIndex % searchMatchesPreview.length;
      searchMatchesPreview.forEach((m, idx) => {
        if (idx === previewIndex) {
          m.classList.add('active-match');
          
          const containerRect = markdownPreview.getBoundingClientRect();
          const markRect = m.getBoundingClientRect();
          const relativeTop = markRect.top - containerRect.top;
          const targetScrollTop = markdownPreview.scrollTop + relativeTop - (markdownPreview.clientHeight / 3);
          
          markdownPreview.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: 'smooth'
          });
        } else {
          m.classList.remove('active-match');
        }
      });
    }

    // 2. SCROLL & SELECTION IN TEXT EDITOR
    if (isEditorVisible && searchMatchesEditor.length > 0) {
      const editorIndex = currentMatchIndex % searchMatchesEditor.length;
      const editorMatch = searchMatchesEditor[editorIndex];
      if (editorMatch) {
        markdownInput.setSelectionRange(editorMatch.start, editorMatch.end);
        
        const textBefore = markdownInput.value.substring(0, editorMatch.start);
        const lineIndex = textBefore.split('\n').length - 1;
        const lineHeight = 22.4; // 14px font-size * 1.6 line-height
        const targetEditorTop = (lineIndex * lineHeight) - (markdownInput.clientHeight / 3);
        
        markdownInput.scrollTop = Math.max(0, targetEditorTop);
        lineNumbers.scrollTop = markdownInput.scrollTop;
      }
    }

    searchCount.textContent = `${currentMatchIndex + 1}/${totalSearchMatches}`;
    searchCount.classList.remove('hidden');
  }

  function goToNextMatch() {
    if (totalSearchMatches === 0) return;
    currentMatchIndex = (currentMatchIndex + 1) % totalSearchMatches;
    updateMatchHighlighting();
  }

  function goToPrevMatch() {
    if (totalSearchMatches === 0) return;
    currentMatchIndex = (currentMatchIndex - 1 + totalSearchMatches) % totalSearchMatches;
    updateMatchHighlighting();
  }

  // Search Event Listeners
  searchInput.addEventListener('input', performSearch);

  if (btnSearchClear) {
    btnSearchClear.addEventListener('click', () => {
      searchInput.value = '';
      performSearch();
      searchInput.focus();
    });
  }

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        goToPrevMatch();
      } else {
        goToNextMatch();
      }
    } else if (e.key === 'Escape') {
      searchInput.value = '';
      performSearch();
      markdownInput.focus();
    }
  });

  btnSearchNext.addEventListener('click', goToNextMatch);
  btnSearchPrev.addEventListener('click', goToPrevMatch);

  // Resizable Splitter
  let isResizing = false;
  paneResizer.addEventListener('mousedown', () => {
    isResizing = true;
    paneResizer.classList.add('resizing');
    document.body.style.cursor = 'col-resize';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const containerWidth = workspaceContainer.clientWidth;
    const sidebarWidth = sidebar.classList.contains('collapsed') ? 0 : sidebar.clientWidth;
    const newEditorWidth = e.clientX - sidebarWidth;
    
    if (newEditorWidth > 200 && (containerWidth - newEditorWidth) > 200) {
      paneEditorWrap.style.flex = `0 0 ${newEditorWidth}px`;
    }
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      paneResizer.classList.remove('resizing');
      document.body.style.cursor = '';
    }
  });

  window.electronAPI.onFileExternallyChanged((filePath) => {
    if (filePath === currentFilePath) {
      showStickyToast('Archivo Modificado Externamente', `El archivo en disco cambió. Vuelve a cargarlo para ver la última versión.`, 'sticky');
    }
  });

  // Initial Load
  updateRecentFilesUI();

  const cliFile = await window.electronAPI.getCliFile();
  if (cliFile) {
    setDocument(cliFile.filePath, cliFile.fileName, cliFile.content);
    if (cliFile.isPdf) {
      setUnsaved(true);
      showStickyToast('PDF Convertido a Markdown', `Se extrajeron ${cliFile.pageCount} páginas de "${cliFile.fileName}". Puedes guardarlo como .md.`, 'sticky');
    }
  } else {
    const defaultDemo = `# ¡Bienvenido a MD Wysiwyg! 🚀

**MD Wysiwyg** es una suite profesional desarrollada por **Merke Software** (Autor: **Perry Daniels** • [merk.net](https://merk.net)) diseñada para **visualizar, editar interactivamente (WYSIWYG) y exportar** tus documentos Markdown y PDF con máxima velocidad y precisión.

---

## 🎨 Menú Unificado e Integrado
La barra de herramientas superior integra los menús **Archivo, Edición, Ver, Tema y Ayuda** junto con los botones de acción rápida y controles integrados de ventana.

---

## ✍️ Edición Visual Bidireccional (WYSIWYG)
Puedes editar directamente sobre esta vista interactiva o en el editor de código a la izquierda. Los cambios se sincronizan en tiempo real con scroll coordinado y selección preservada.

---

## 📄 Conversión de Archivos PDF a Markdown
Ahora puedes abrir archivos **.pdf** directamente desde el botón "Abrir" o diálogo de archivos. MD Wysiwyg extraerá automáticamente el texto y lo convertirá a un formato **Markdown (.md)** listo para ser editado y guardado.

---

## 📊 Tablas y Código

### Ejemplo de Tabla

| Característica | Estado | Rendimiento |
| :--- | :---: | ---: |
| GFM Markdown | ✅ Incluido | Ultrarrápido |
| KaTeX Math | ✅ Incluido | Preciso |
| Mermaid Diagrams | ✅ Incluido | Dinámico |
| Conversor de PDF | ✅ Incluido | Inteligente |
| Exportación PDF / HTML | ✅ Incluido | Nativo |

### Bloque de Código JavaScript

\`\`\`javascript
function calcularFactorial(n) {
  if (n <= 1) return 1;
  return n * calcularFactorial(n - 1);
}

console.log('Factorial de 5:', calcularFactorial(5));
\`\`\`

---

## 🧮 Expresiones Matemáticas (KaTeX)

$$E = mc^2 \quad \text{y} \quad \int_{0}^{\infty} e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$$

---

## 📈 Diagrama Mermaid

\`\`\`mermaid
graph TD
    A[Abrir Archivo PDF] --> B[Extracción e Inteligencia]
    B --> C[Convertido a Markdown .md]
    C --> D[Visualizar / Editar]
    D --> E[Guardar como .md]
\`\`\`
`;
    setDocument(null, 'Bienvenida.md', defaultDemo);
  }
});
