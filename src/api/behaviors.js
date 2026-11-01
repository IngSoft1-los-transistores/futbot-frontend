import { request } from './client'

export const get_behaviors = (options = {}) => request('/api/behaviors', options)

export const create_behavior = (data, options = {}) => request('/api/behaviors', { ...options, method: 'POST', body: JSON.stringify(data) })