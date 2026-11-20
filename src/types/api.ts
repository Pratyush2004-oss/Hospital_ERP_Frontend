export type ApiResponse<T> = {
  data: T;
  meta?: {
    requestId?: string;
    [key: string]: unknown;
  };
};

export type ApiErrorResponse = {
  error: {
    message: string;
    code?: string;
    requestId?: string;
    details?: unknown;
  };
};
