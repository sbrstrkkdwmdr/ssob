function markdown(markdownText) {
    markdownText = markdownText.replaceAll('\n', '<br>');
    markdownText = markdownText.replace(/(```|~~~)(\w+)?\n([\s\S]*?)(\1)/g, (_, fence, lang, code) => {
        const escapedCode = code.trim()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        return `<code>${escapedCode}</code>`;
    });

    markdownText = markdownText.replace(/(?<!`)\`([^`\n]+?)\`(?!`)/g, (_, code) => {
        const escapedInline = code
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        return `<code>${escapedInline}</code>`;
    });

    // // https:
    // markdownText = markdownText.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, text, url) => {
    //     return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="highlightLink">${text}</a>`;
    // });
    // // mailto:
    // markdownText = markdownText.replace(/\[([^\]]+)\]\((mailto:[^\s)]+)\)/g, (_, text, url) => {
    //     return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="highlightLink">${text}</a>`;
    // });

    // // "/"
    // markdownText = markdownText.replace(/\[([^\]]+)\]\((\/[^\s)]+)\)/g, (_, text, url) => {
    //     return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="highlightLink">${text}</a>`;
    // });

    // [a](b)
    markdownText = markdownText.replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, (_, text, url) => {
        return `<a href="${url}" rel="noopener noreferrer" class="highlightLink">${text}</a>`;
    });

    return markdownText;
}