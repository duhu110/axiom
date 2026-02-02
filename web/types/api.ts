/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
}

export class ApiError extends Error {
  code: number;
  data: any;

  constructor(code: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.data = data;
  }
}

export class AuthError extends ApiError {
  constructor(message = 'Unauthorized', data?: any) {
    super(401, message, data);
    this.name = 'AuthError';
  }
}

export class NetworkError extends Error {
  constructor(message = 'Network Error') {
    super(message);
    this.name = 'NetworkError';
  }
}
