export function isPdfFile(url: string, name?: string) {
    const value = `${name || ""} ${url}`.toLowerCase();
    return value.includes("application/pdf") || /\.pdf(\?|$|#)/.test(value);
}

export function isImageFile(url: string, name?: string) {
    const value = `${name || ""} ${url}`.toLowerCase();
    return /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$|#)/.test(value) || value.includes("image/");
}

export function isEditableHomeworkFile(url: string, name?: string) {
    return isPdfFile(url, name) || isImageFile(url, name);
}
