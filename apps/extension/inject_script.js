
(function () {
    // Read data passed via data attributes on the executing script tag
    // The script tag is document.currentScript
    const scriptTag = document.currentScript;
    if (!scriptTag) return;

    const targetLang = scriptTag.dataset.language || "";
    const targetCode = scriptTag.dataset.code || ""; // This might be URI encoded or base64 to avoid syntax errors

    console.log("Peekle: Inject script running...", { targetLang, length: targetCode.length });

    // Decode if needed (recommended for code content)
    let decodedCode = targetCode;
    try {
        decodedCode = decodeURIComponent(targetCode);
    } catch (e) { console.error("Peekle: Decode failed", e); }

    function mapLanguageToBoj(lang) {
        if (!lang) return '';
        const l = lang.toLowerCase();
        if (l.includes('python')) return 'Python 3';
        if (l.includes('java')) return 'Java 11';
        if (l.includes('cpp') || l.includes('c++')) return 'C++';
        return lang; // fallback
    }

    const bojLangName = mapLanguageToBoj(targetLang);

    function attemptFill(retries) {
        // 1. Find CodeMirror instance
        const cmEl = document.querySelector('.CodeMirror');
        const cm = cmEl ? cmEl.CodeMirror : null;

        // 2. Find Language Select
        const langSelect = document.getElementById('language');

        // Retry faster (50ms)
        if ((!cm || !langSelect) && retries > 0) {
            setTimeout(() => attemptFill(retries - 1), 50);
            return;
        }

        if (!cm) {
            console.error("Peekle: CodeMirror instance not found!");
            return;
        }

        // --- Set Language ---
        if (langSelect && bojLangName) {
            let langVal = null;
            for (let opt of langSelect.options) {
                const optText = opt.text.trim();
                if (optText === bojLangName || optText.includes(bojLangName)) {
                    langVal = opt.value;
                    if (optText === 'Python 3') break;
                    if (optText === 'Java 11') break;
                }
            }

            if (langVal) {
                // If language needs changing
                if (langSelect.value !== langVal) {
                    console.log("Peekle: Setting language to " + langVal);
                    langSelect.value = langVal;
                    langSelect.dispatchEvent(new Event('change'));
                    if (window.jQuery) {
                        try {
                            window.jQuery('#language').trigger('chosen:updated');
                            window.jQuery('#language').trigger('change');
                        } catch (e) { }
                    }

                    // Wait briefly for editor refresh (200ms)
                    setTimeout(() => {
                        pollForCodeApply(decodedCode);
                    }, 200);

                    // UI Update
                    const chosenContainer = document.getElementById('language_chosen');
                    if (chosenContainer) {
                        const span = chosenContainer.querySelector('a.chosen-single span');
                        if (span) {
                            span.textContent = langSelect.options[langSelect.selectedIndex].text;
                        }
                    }
                    return; // Stored callback handles the code fill
                }
            }
        }

        // Apply immediately if no lang change needed
        pollForCodeApply(decodedCode);
    }

    function pollForCodeApply(code) {
        let attempts = 0;
        const maxAttempts = 50; // Try more times since interval is short

        // Check extremely fast (50ms)
        const interval = setInterval(() => {
            attempts++;

            const freshCmEl = document.querySelector('.CodeMirror');
            const freshCm = freshCmEl ? freshCmEl.CodeMirror : null;

            if (freshCm) {
                const currentVal = freshCm.getValue();
                if (currentVal === code) {
                    console.log("Peekle: Code verified.");
                    clearInterval(interval);

                    // Scroll logic: Position footer top near bottom of viewport
                    const footer = document.querySelector('.footer-v3') || document.querySelector('.footer');
                    if (footer) {
                        try {
                            const footerTop = footer.getBoundingClientRect().top + window.pageYOffset;
                            // Scroll so that footer top is slightly visible (150px) from bottom
                            const offsetPosition = footerTop - window.innerHeight + 150;

                            window.scrollTo({
                                top: offsetPosition,
                                behavior: "smooth"
                            });
                        } catch (e) { console.error('Scroll failed', e); }
                    }
                    return;
                }
                // Only set if different to avoid cursor jumping if user edits
                if (currentVal !== code) {
                    freshCm.setValue(code);
                }
            }

            if (attempts >= maxAttempts) {
                clearInterval(interval);
            }
        }, 50);
    }

    // Start immediately (don't wait for DOMContentLoaded)
    console.log("Peekle: Starting fast injection...");
    attemptFill(100);

})();
