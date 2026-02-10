
// Programmers Problem Description Copy Script

(function () {
    console.log("Peekle: Programmers script loaded");

    function init() {
        // Wait for the element to appear
        const observer = new MutationObserver((mutations, obs) => {
            const descriptionDiv = document.querySelector('.guide-section-description');
            if (descriptionDiv) {
                if (!document.getElementById('peekle-copy-btn')) {
                    injectCopyButton(descriptionDiv);
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Initial check
        const descriptionDiv = document.querySelector('.guide-section-description');
        if (descriptionDiv && !document.getElementById('peekle-copy-btn')) {
            injectCopyButton(descriptionDiv);
        }
    }

    function injectCopyButton(descriptionDiv) {
        // Locate title or header to place button next to
        // Programmers structure: .guide-section-description -> h6.guide-section-title
        const title = descriptionDiv.querySelector('.guide-section-title');
        if (!title) return;

        const btn = document.createElement('button');
        btn.id = 'peekle-copy-btn';
        btn.innerText = '문제 설명 복사';
        btn.style.marginLeft = '10px';
        btn.style.padding = '4px 8px';
        btn.style.fontSize = '12px';
        btn.style.backgroundColor = '#2563eb'; // blue-600
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';
        btn.style.zIndex = '1000';

        btn.onclick = () => {
            const content = descriptionDiv.querySelector('.markdown');
            if (content) {
                const markdown = convertToMarkdown(content);
                navigator.clipboard.writeText(markdown).then(() => {
                    alert('문제 설명이 복사되었습니다!');
                }).catch(err => {
                    console.error('Failed to copy: ', err);
                });
            } else {
                alert('설명 내용을 찾을 수 없습니다.');
            }
        };

        title.appendChild(btn);
    }

    function convertToMarkdown(element) {
        // Simple HTML to Markdown converter
        let text = element.innerHTML;

        // Clean up
        text = text.replace(/<div[^>]*>/g, '').replace(/<\/div>/g, '\n');

        // Headers
        text = text.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/g, (match, p1) => `\n### ${p1}\n`);

        // Lists
        text = text.replace(/<ul>/g, '\n').replace(/<\/ul>/g, '\n');
        text = text.replace(/<ol>/g, '\n').replace(/<\/ol>/g, '\n');
        text = text.replace(/<li>(.*?)<\/li>/g, '- $1\n');

        // Styles
        text = text.replace(/<strong>(.*?)<\/strong>/g, '**$1**');
        text = text.replace(/<b>(.*?)<\/b>/g, '**$1**');
        text = text.replace(/<em>(.*?)<\/em>/g, '*$1*');
        text = text.replace(/<i>(.*?)<\/i>/g, '*$1*');

        // Code
        text = text.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/g, '\n```\n$1\n```\n');
        text = text.replace(/<code>(.*?)<\/code>/g, '`$1`');

        // Tables (Basic support)
        text = text.replace(/<table[^>]*>([\s\S]*?)<\/table>/g, (match, tableContent) => {
            let tableMd = '\n\n'; // Ensure separation before table
            const rows = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g);
            if (rows) {
                rows.forEach((row, index) => {
                    const cols = row.match(/<t[hd][^>]*>(.*?)<\/t[hd]>/g);
                    if (cols) {
                        const rowText = '| ' + cols.map(c => c.replace(/<[^>]+>/g, '').trim()).join(' | ') + ' |';
                        tableMd += rowText + '\n';
                        if (index === 0) {
                            tableMd += '| ' + cols.map(() => '---').join(' | ') + ' |\n';
                        }
                    }
                });
            }
            return tableMd + '\n'; // Ensure separation after table
        });

        // Links
        text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)');

        // Images
        text = text.replace(/<img[^>]*src="([^"]*)"[^>]*>/g, '![]($1)');

        // Paragraphs and breaks
        text = text.replace(/<hr\s*\/?>/g, '\n\n---\n\n'); // Handle hr as horizontal rule with breaks
        text = text.replace(/<p[^>]*>/g, '\n').replace(/<\/p>/g, '\n');
        text = text.replace(/<br\s*\/?>/g, '\n');
        text = text.replace(/&nbsp;/g, ' ');
        text = text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

        // Cleanup multiple newlines
        return text.replace(/\n\s*\n/g, '\n\n').trim();
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
