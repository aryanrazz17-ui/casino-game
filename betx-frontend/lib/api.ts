import axios from 'axios'

const getBaseUrl = () => {
    let url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7000'
    // Dynamic URL detection for local network access (e.g. mobile testing)
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname
        if (hostname !== 'localhost' && hostname !== '127.0.0.1' && (url.includes('localhost') || url.includes('127.0.0.1'))) {
            url = url.replace('localhost', hostname).replace('127.0.0.1', hostname)
        }
    }
    return url.replace(/\/$/, '')
}

const API_URL = getBaseUrl()

const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }

        // Don't set Content-Type for FormData - let browser handle it
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type']
        }

        return config
    },
    (error) => Promise.reject(error)
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true

            try {
                const refreshToken = localStorage.getItem('refreshToken')
                const response = await axios.post(`${API_URL}/api/auth/refresh`, {
                    refreshToken,
                })

                const { accessToken } = response.data.data
                localStorage.setItem('accessToken', accessToken)

                originalRequest.headers.Authorization = `Bearer ${accessToken}`
                return api(originalRequest)
            } catch (refreshError) {
                localStorage.removeItem('accessToken')
                localStorage.removeItem('refreshToken')
                window.location.href = '/auth/login'
                return Promise.reject(refreshError)
            }
        }

        return Promise.reject(error)
    }
)

export default api
