import { request } from './client'

export const get_behaviors = () => request('/api/behaviors')
