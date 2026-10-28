"use client";

import { FileText } from "lucide-react";
import { isPdfFile } from "@/lib/document-utils";
import { useLanguage } from "@/lib/contexts/language-context";

export function HomeworkFilePreview({ src, alt, className, onClick }: {
    src: string;
    alt: string;
    className?: string;
    onClick?: () => void;
}) {
    const { isRTL } = useLanguage();
    if (!isPdfFile(src)) return <img src={src} alt={alt} className={className} onClick={onClick} />;
    return <button type="button" onClick={onClick} aria-label={alt}
        className="flex w-full items-center gap-3 rounded-md border bg-background p-4 text-start transition-colors hover:bg-muted">
        <FileText className="h-9 w-9 shrink-0 text-primary" />
        <span className="min-w-0">
            <span className="block text-sm font-medium">{isRTL ? "ملف الواجب PDF" : "Homework PDF"}</span>
            <span className="block text-xs text-muted-foreground">{isRTL ? "عرض المستند مع التعديلات" : "View document with edits"}</span>
        </span>
    </button>;
}
