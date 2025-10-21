// Zoom utilities
export const extractZoomMeetingId = (url: string): string | null => {
    const patterns = [
        /(?:zoom\.us\/j\/|zoom\.us\/my\/|zoom\.us\/s\/)([0-9]+)/,
        /(?:zoom\.us\/meeting\/join\/)([0-9]+)/,
        /(?:zoom\.us\/webinar\/join\/)([0-9]+)/,
        /(?:zoom\.us\/rec\/share\/)([0-9]+)/,
        /(?:zoom\.us\/rec\/play\/)([0-9]+)/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
};

export const isValidZoomUrl = (url: string): boolean => {
    const meetingId = extractZoomMeetingId(url);
    return meetingId !== null && meetingId.length >= 9 && meetingId.length <= 11;
};

export const getZoomEmbedUrl = (meetingId: string): string => {
    return `https://zoom.us/meeting/join/${meetingId}`;
};

export const getZoomIframeUrl = (meetingId: string): string => {
    return `https://zoom.us/meeting/join/${meetingId}`;
};

// Google Meet utilities
export const extractGoogleMeetId = (url: string): string | null => {
    const patterns = [
        /meet\.google\.com\/([a-z0-9-]+)/i, // Standard Google Meet URL
        /meet\.google\.com\/[a-z0-9-]+\?authuser=([a-z0-9-]+)/i, // With authuser parameter
        /meet\.google\.com\/[a-z0-9-]+&authuser=([a-z0-9-]+)/i, // With authuser parameter (ampersand)
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    return null;
};

export const isValidGoogleMeetUrl = (url: string): boolean => {
    const meetingId = extractGoogleMeetId(url);
    // Google Meet IDs are typically 10-11 characters with letters, numbers, and hyphens
    return meetingId !== null && /^[a-z0-9-]{10,11}$/i.test(meetingId);
};

export const getGoogleMeetEmbedUrl = (meetingId: string): string => {
    return `https://meet.google.com/${meetingId}`;
};

// Generic meeting utilities
export const detectMeetingType = (url: string): 'zoom' | 'google_meet' | null => {
    if (isValidZoomUrl(url)) {
        return 'zoom';
    }
    if (isValidGoogleMeetUrl(url)) {
        return 'google_meet';
    }
    return null;
};

export const extractMeetingId = (url: string, type: 'zoom' | 'google_meet'): string | null => {
    if (type === 'zoom') {
        return extractZoomMeetingId(url);
    }
    if (type === 'google_meet') {
        return extractGoogleMeetId(url);
    }
    return null;
};

export const isValidMeetingUrl = (url: string): boolean => {
    return isValidZoomUrl(url) || isValidGoogleMeetUrl(url);
};
