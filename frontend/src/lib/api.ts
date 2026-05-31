const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  private async refreshAccessToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) return null;

      const data = await res.json();
      const newToken = data.token || data.accessToken;
      if (newToken) {
        localStorage.setItem('token', newToken);
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
        return newToken;
      }
      return null;
    } catch {
      return null;
    }
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async handleResponse<T>(res: Response): Promise<ApiResponse<T>> {
    if (res.status === 401) {
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        // Retry with new token - but we need original request info
        throw new Error('RETRY');
      }
      // Clear tokens and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      window.location.href = '/';
      throw new Error('انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى');
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const message = this.mapErrorMessage(errorData.message || errorData.error || '');
      throw new Error(message);
    }

    const data = await res.json();
    return { data };
  }

  private mapErrorMessage(msg: string): string {
    const errorMap: Record<string, string> = {
      'Unauthorized': 'غير مصرح بهذا الإجراء',
      'Forbidden': 'ليس لديك صلاحية للقيام بهذا الإجراء',
      'Not Found': 'لم يتم العثور على المورد المطلوب',
      'Bad Request': 'طلب غير صالح',
      'Internal Server Error': 'حدث خطأ في الخادم',
    };
    return errorMap[msg] || msg || 'حدث خطأ غير متوقع';
  }

  async get<T = unknown>(path: string): Promise<ApiResponse<T>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<T>(res);
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(res);
  }

  async put<T = unknown>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(res);
  }

  async patch<T = unknown>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(res);
  }

  async delete<T = unknown>(path: string): Promise<ApiResponse<T>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<T>(res);
  }
}

export const api = new ApiClient(API_URL);
