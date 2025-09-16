import { authApi } from './api'
import type { AuthData, AuthResponse, LoginRequest, RegisterRequest, User } from '../types'

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthData> {
    const { data: responseData } = await authApi.post<AuthResponse>('/api/auth/login', credentials)
    return responseData.data
  },

  async register(userData: RegisterRequest): Promise<AuthData> {
    const { data: responseData } = await authApi.post<AuthResponse>('/api/auth/register', userData)
    return responseData.data
  },

  async getProfile(): Promise<User> {
    const response = await authApi.get<User>('/api/auth/profile')
    return response.data
  },

  async verifyToken(token: string): Promise<{ valid: boolean; user?: User }> {
    const response = await authApi.post('/api/auth/verify-token', { token })
    return response.data
  },

  // Local storage helpers
  saveToken(token: string): void {
    localStorage.setItem('fitness_token', token)
  },

  saveUser(user: User): void {
    localStorage.setItem('fitness_user', JSON.stringify(user))
  },

  getToken(): string | null {
    return localStorage.getItem('fitness_token')
  },

  getUser(): User | null {
    const userStr = localStorage.getItem('fitness_user')
    return userStr ? JSON.parse(userStr) : null
  },

  logout(): void {
    localStorage.removeItem('fitness_token')
    localStorage.removeItem('fitness_user')
  },

  isAuthenticated(): boolean {
    return !!this.getToken()
  }
}