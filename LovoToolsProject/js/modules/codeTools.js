import { showToast } from '../utils.js';

export function initCodeTools() {
    const jsonInput = document.getElementById('json-input');
    const jsonOutput = document.getElementById('json-output');
    const htmlPreview = document.getElementById('html-preview');
    const btnRunHtml = document.getElementById('btn-run-html');
    const btnFontSize = document.getElementById('btn-font-size');
    const btnDownloadHtml = document.getElementById('btn-download-html');
    const btnAddFile = document.getElementById('btn-add-file');
    const btnRefreshPreview = document.getElementById('btn-refresh-preview');
    const fileTabsContainer = document.getElementById('file-tabs-container');
    const htmlEditorRaw = document.getElementById('html-editor-raw');
    const btnFormatJson = document.getElementById('btn-format-json');
    const btnMinifyJson = document.getElementById('btn-minify-json');

    const modalAddFile = document.getElementById('modal-add-file');
    const modalFileType = document.getElementById('modal-file-type');
    const modalFileName = document.getElementById('modal-file-name');
    const btnCreateFileSubmit = document.getElementById('btn-create-file-submit');

    /* --- Logic & Templates --- */
    const defaultJson = {
        project: "LovoTools",
        features: ["Emmet Support", "Autocompletion", "Search & Replace", "Multi-file IDE"]
    };

    const defaultHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Website</title>
</head>
<body>
    <h1>Hello World!</h1>
    <p>Start coding your amazing website here!</p>
</body>
</html>`;

    const defaultCss = `/* Add your CSS styles here */
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
}`;

    const defaultJs = `// Add your JavaScript code here
console.log("Hello World!");`;


    /* --- JSON Processor --- */
    const updateJsonOutput = (val, minify = false) => {
        if (!val || !val.trim()) return;
        try {
            const obj = JSON.parse(val);
            jsonOutput.textContent = JSON.stringify(obj, null, minify ? 0 : 4);
        } catch (e) {
            showToast("Geçersiz JSON formatı!", "error");
        }
    };

    if (jsonInput && !jsonInput.value) {
        jsonInput.value = JSON.stringify(defaultJson, null, 4);
        setTimeout(() => updateJsonOutput(jsonInput.value), 100);
    }

    btnFormatJson?.addEventListener('click', () => updateJsonOutput(jsonInput.value, false));
    btnMinifyJson?.addEventListener('click', () => updateJsonOutput(jsonInput.value, true));
    jsonInput?.addEventListener('input', () => updateJsonOutput(jsonInput.value));


    /* --- Monaco/CodeMirror IDE Logic --- */
    let files = [];
    let activeFileIndex = 0;
    let cmEditor = null;

    if (htmlEditorRaw && typeof CodeMirror !== 'undefined') {
        cmEditor = CodeMirror.fromTextArea(htmlEditorRaw, {
            theme: 'material-palenight',
            lineNumbers: true,
            lineWrapping: true,
            styleActiveLine: true,
            tabSize: 4,
            indentUnit: 4,
            viewportMargin: Infinity,

            autoCloseTags: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            showHint: true,
            extraKeys: {
                "Ctrl-Space": "autocomplete",

                "Tab": function (cm) {
                    if (cm.atTag && cm.atTag()) return CodeMirror.Pass;
                    try {
                        return cm.execCommand("emmetExpandAbbreviation");
                    } catch (e) {
                        return CodeMirror.Pass;
                    }
                },
                "Enter": "emmetInsertLineBreak",
                "Ctrl-/": "toggleComment",
                "Ctrl-F": "findPersistent"
            }
        });

        cmEditor.setSize('100%', '100%');
        cmEditor.getWrapperElement().style.setProperty('font-size', '16px', 'important');


        const firstDoc = CodeMirror.Doc(defaultHtml, 'htmlmixed');
        files.push({ name: 'index.html', doc: firstDoc });
        cmEditor.swapDoc(firstDoc);
        firstDoc.clearHistory();


        setTimeout(() => {
            cmEditor.refresh();
            updateHtmlPreview();
        }, 200);


        cmEditor.on("inputRead", function (cm, change) {
            if (change.origin !== "+input") return;
            const cur = cm.getCursor();
            const token = cm.getTokenAt(cur);
            if (token.type === "tag" || token.string === "<" || token.string === "/" ||
                (cm.getOption("mode") === "css" && token.string === ":") ||
                (cm.getOption("mode") === "javascript" && token.string === ".")) {
                setTimeout(() => {
                    if (!cm.state.completionActive) {
                        cm.showHint({ completeSingle: false });
                    }
                }, 100);
            }
        });
    }

    /* --- Tab & File Management --- */
    const renderTabs = () => {
        if (!fileTabsContainer) return;
        fileTabsContainer.innerHTML = '';
        files.forEach((file, index) => {
            const isActive = index === activeFileIndex;
            const tab = document.createElement('div');
            tab.style.cssText = `
            background: ${isActive ? '#1e272c' : 'rgba(255,255,255,0.03)'};
            color: ${isActive ? '#fff' : '#888'};
            padding: 0.45rem 0.9rem;
            border-radius: 8px;
            font-size: 0.8rem;
            display: flex;
            align-items: center;
            gap: 0.7rem;
            border: 1px solid ${isActive ? 'rgba(255,255,255,0.1)' : 'transparent'};
            cursor: pointer;
            transition: all 0.2s;
        `;
            tab.innerHTML = `
            ${file.name} 
            ${files.length > 1 ? `<i class="ph ph-x btn-close-tab" data-index="${index}" style="font-size: 0.75rem; opacity: 0.5; cursor: pointer;"></i>` : ''}
        `;
            tab.addEventListener('click', (e) => {
                if (e.target.classList.contains('btn-close-tab')) return;
                switchFile(index);
            });
            const closeBtn = tab.querySelector('.btn-close-tab');
            if (closeBtn) {
                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    removeFile(index);
                });
            }
            fileTabsContainer.appendChild(tab);
        });
    };

    const switchFile = (index) => {
        if (!cmEditor || index === activeFileIndex) return;
        activeFileIndex = index;
        cmEditor.swapDoc(files[index].doc);
        renderTabs();
        setTimeout(() => cmEditor.refresh(), 10);
    };

    const removeFile = (index) => {
        if (files.length <= 1) return;
        const removedWasActive = (index === activeFileIndex);
        files.splice(index, 1);
        if (removedWasActive) {
            activeFileIndex = Math.min(index, files.length - 1);
            cmEditor.swapDoc(files[activeFileIndex].doc);
        } else if (index < activeFileIndex) {
            activeFileIndex--;
        }
        renderTabs();
    };


    btnAddFile?.addEventListener('click', () => {
        if (modalAddFile) {
            modalAddFile.style.display = 'flex';
            modalFileName.value = '';
            modalFileName.focus();
        }
    });

    const closeModal = () => {
        if (modalAddFile) modalAddFile.style.display = 'none';
    };

    document.querySelectorAll('.btn-close-modal').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    btnCreateFileSubmit?.addEventListener('click', () => {
        const name = modalFileName.value.trim();
        const type = modalFileType.value;
        if (!name) {
            showToast("Lütfen bir dosya adı girin!", "error");
            return;
        }

        const fullName = name.includes('.') ? name : name + type;
        if (files.some(f => f.name.toLowerCase() === fullName.toLowerCase())) {
            showToast("Bu isimde bir dosya zaten var!", "error");
            return;
        }

        let initialContent = '';
        let mode = 'htmlmixed';
        if (fullName.endsWith('.html')) initialContent = defaultHtml;
        else if (fullName.endsWith('.css')) { initialContent = defaultCss; mode = 'css'; }
        else if (fullName.endsWith('.js')) { initialContent = defaultJs; mode = 'javascript'; }

        const newDoc = CodeMirror.Doc(initialContent, mode);
        files.push({ name: fullName, doc: newDoc });
        newDoc.clearHistory();

        switchFile(files.length - 1);
        closeModal();
        showToast(`Dosya oluşturuldu: ${fullName}`, "success");
    });

    renderTabs();


    /* --- Preview & Actions --- */
    const updateHtmlPreview = () => {
        if (!htmlPreview || !cmEditor) return;
        const code = cmEditor.getValue();
        const previewDoc = htmlPreview.contentDocument || htmlPreview.contentWindow.document;
        previewDoc.open();
        previewDoc.write(code);
        previewDoc.close();
    };

    btnRunHtml?.addEventListener('click', () => {
        updateHtmlPreview();
        showToast("Kod başarıyla çalıştırıldı!", "success");
    });

    btnRefreshPreview?.addEventListener('click', () => updateHtmlPreview());

    let fontSizeLevel = 1; // 16px başlangıç
    const fontSizes = ['14px', '16px', '18px'];
    btnFontSize?.addEventListener('click', () => {
        if (!cmEditor) return;
        fontSizeLevel = (fontSizeLevel + 1) % 3;
        const newSize = fontSizes[fontSizeLevel];
        const wrapper = cmEditor.getWrapperElement();
        if (wrapper) {
            wrapper.style.setProperty('font-size', newSize, 'important');
            setTimeout(() => cmEditor.refresh(), 50);
        }
    });

    btnDownloadHtml?.addEventListener('click', () => {
        if (!cmEditor) return;
        const activeFile = files[activeFileIndex];
        const blob = new Blob([cmEditor.getValue()], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = activeFile.name;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`${activeFile.name} indiriliyor...`, "success");
    });


    const tabBtns = document.querySelectorAll('.header-tabs .toggle-btn');
    const tabContents = document.querySelectorAll('.code-tab-content');

    const syncTabs = () => {
        const activeBtn = document.querySelector('.header-tabs .toggle-btn.active');
        if (!activeBtn) return;
        const targetTab = activeBtn.dataset.tab;
        tabContents.forEach(content => {
            content.style.display = (content.id === `tab-${targetTab}`) ? 'block' : 'none';
        });
        if (targetTab === 'html' && cmEditor) {
            setTimeout(() => cmEditor.refresh(), 50);
        }
    };

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            syncTabs();
        });
    });


    document.querySelectorAll('.btn-copy').forEach(btn => {
        btn.addEventListener('click', () => {
            let text = "";
            if (btn.dataset.target === 'json-output') {
                text = jsonOutput.textContent;
            } else if (btn.dataset.target === 'code-editor') {
                text = cmEditor.getValue();
            }

            if (text) {
                navigator.clipboard.writeText(text).then(() => {
                    showToast("Panoya kopyalandı!", "success");
                });
            }
        });
    });


    /* --- Layout Resizers --- */
    const resizer = document.getElementById('ide-resizer');
    const editorSide = document.getElementById('ide-editor-side');
    const ideContainer = editorSide?.parentElement;
    if (resizer && editorSide && ideContainer) {
        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = editorSide.offsetWidth;
            const containerWidth = ideContainer.offsetWidth;
            if (htmlPreview) htmlPreview.style.pointerEvents = 'none';
            document.body.style.cursor = 'col-resize';
            resizer.style.background = '#6c5ce7';
            const onMouseMove = (moveEvent) => {
                const deltaX = moveEvent.clientX - startX;
                const newWidth = startWidth + deltaX;
                const newPercent = (newWidth / containerWidth) * 100;
                if (newPercent > 15 && newPercent < 85) {
                    editorSide.style.flex = `0 0 ${newPercent}%`;
                    if (cmEditor) cmEditor.refresh();
                }
            };
            const onMouseUp = () => {
                if (htmlPreview) htmlPreview.style.pointerEvents = 'auto';
                document.body.style.cursor = 'default';
                resizer.style.background = 'transparent';
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                if (cmEditor) cmEditor.refresh();
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }


    const jsonResizer = document.getElementById('json-resizer');
    const jsonInputSide = document.getElementById('json-input-side');
    const jsonContainer = jsonInputSide?.parentElement;
    if (jsonResizer && jsonInputSide && jsonContainer) {
        jsonResizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = jsonInputSide.offsetWidth;
            const containerWidth = jsonContainer.offsetWidth;
            document.body.style.cursor = 'col-resize';
            jsonResizer.style.background = '#6c5ce7';
            const onMouseMove = (moveEvent) => {
                const deltaX = moveEvent.clientX - startX;
                const newWidth = startWidth + deltaX;
                const newPercent = (newWidth / containerWidth) * 100;
                if (newPercent > 20 && newPercent < 80) {
                    jsonInputSide.style.flex = `0 0 ${newPercent}%`;
                }
            };
            const onMouseUp = () => {
                document.body.style.cursor = 'default';
                jsonResizer.style.background = 'transparent';
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    setTimeout(() => {
        updateHtmlPreview();
    }, 100);
}
