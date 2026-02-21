
export enum APIErrorType {
    INVALID_KEY = 'INVALID_KEY',
    QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
    NETWORK_ERROR = 'NETWORK_ERROR',
    NOT_FOUND = 'NOT_FOUND',
    PERMISSION_DENIED = 'PERMISSION_DENIED',
    UNKNOWN = 'UNKNOWN'
}

export interface APIError {
    type: APIErrorType;
    message: string;
    resolution: string;
    originalError?: any;
}

export const handleYouTubeError = (error: any): APIError => {
    const message = error.message || '';
    const status = error.status || 0;

    if (message.includes('API key not valid') || message.includes('keyInvalid')) {
        return {
            type: APIErrorType.INVALID_KEY,
            message: 'YouTube API 키가 유효하지 않습니다.',
            resolution: '관리자 설정에서 올바른 YouTube Data API v3 키를 입력했는지 확인해주세요.',
            originalError: error
        };
    }

    if (message.includes('quotaExceeded') || message.includes('Quota exceeded')) {
        return {
            type: APIErrorType.QUOTA_EXCEEDED,
            message: 'YouTube API 할당량이 초과되었습니다.',
            resolution: 'YouTube API의 일일 사용량이 모두 소진되었습니다. 내일 다시 시도하거나 다른 API 키를 사용해주세요.',
            originalError: error
        };
    }

    if (status === 404 || message.includes('notFound')) {
        return {
            type: APIErrorType.NOT_FOUND,
            message: '요청하신 리소스를 찾을 수 없습니다.',
            resolution: '채널 ID나 영상 ID가 정확한지 다시 한번 확인해주세요.',
            originalError: error
        };
    }

    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        return {
            type: APIErrorType.NETWORK_ERROR,
            message: '네트워크 연결 오류가 발생했습니다.',
            resolution: '인터넷 연결 상태를 확인하고 다시 시도해주세요.',
            originalError: error
        };
    }

    return {
        type: APIErrorType.UNKNOWN,
        message: 'YouTube API 호출 중 알 수 없는 오류가 발생했습니다.',
        resolution: '잠시 후 다시 시도해주세요. 문제가 지속되면 관리자에게 문의하세요.',
        originalError: error
    };
};

export const handleGeminiError = (error: any): APIError => {
    const message = error.message || '';

    if (message.includes('API key not valid') || message.includes('API_KEY_INVALID')) {
        return {
            type: APIErrorType.INVALID_KEY,
            message: 'Gemini API 키가 유효하지 않습니다.',
            resolution: '관리자 설정에서 올바른 Gemini API 키를 입력했는지 확인해주세요.',
            originalError: error
        };
    }

    if (message.includes('quota') || message.includes('429')) {
        return {
            type: APIErrorType.QUOTA_EXCEEDED,
            message: 'Gemini API 호출 한도를 초과했습니다.',
            resolution: '잠시 기다린 후 다시 시도해주세요. 무료 티어의 경우 분당 호출 횟수 제한이 있을 수 있습니다.',
            originalError: error
        };
    }

    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        return {
            type: APIErrorType.NETWORK_ERROR,
            message: '네트워크 연결 오류가 발생했습니다.',
            resolution: '인터넷 연결 상태를 확인하고 다시 시도해주세요.',
            originalError: error
        };
    }

    return {
        type: APIErrorType.UNKNOWN,
        message: 'Gemini AI 분석 중 오류가 발생했습니다.',
        resolution: '잠시 후 다시 시도해주세요. 분석할 데이터가 너무 크거나 형식이 맞지 않을 수 있습니다.',
        originalError: error
    };
};
