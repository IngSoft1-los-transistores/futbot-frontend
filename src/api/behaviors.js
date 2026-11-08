import { request } from './client'

export const get_behaviors = (options = {}) => request('/api/behaviors', options)

export const delete_behavior = (behavior_id, options = {}) =>
    request(`/api/behaviors/${behavior_id}`, { method: 'DELETE', ...options })
export const create_behavior = (data, options = {}) => 
  request('/api/behaviors', 
    { ...options, 
      method: 'POST', 
      body: JSON.stringify(data) 
    }
  )
export const get_behavior = (behavior_id, options = {}) =>
  request(`/api/behaviors/${encodeURIComponent(behavior_id)}`, options)

export const update_behavior = (behavior_id, data, options = {}) =>
  request(`/api/behaviors/${encodeURIComponent(behavior_id)}`,
    { ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    }
  )
