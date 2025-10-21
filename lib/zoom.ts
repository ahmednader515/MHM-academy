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
