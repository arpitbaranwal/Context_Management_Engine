import { adapter } from './index'

export const login = (email: string, password: string) => adapter.auth.login(email, password)
export const register = (name: string, email: string, password: string) => adapter.auth.register(name, email, password)
export const logout = () => adapter.auth.logout()
export const getCurrentUser = () => adapter.auth.getCurrentUser()
