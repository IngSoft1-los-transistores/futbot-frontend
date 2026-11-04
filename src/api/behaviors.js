import { request } from './client'

export const get_behaviors = (options = {}) => request('/api/behaviors', options)

export const delete_behavior = (behavior_id, options = {}) =>
    request(`/api/behaviors/${behavior_id}`, { method: 'DELETE', ...options })