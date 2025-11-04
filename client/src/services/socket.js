import { io } from 'socket.io-client'
import { getToken } from './auth'

let socket = null

export function getSocket() {
  return socket
}

export function connectSocket() {
  if (socket && socket.connected) return socket
  socket = io('/', {
    transports: ['websocket'],
    forceNew: true,
    autoConnect: true,
    auth: { token: getToken() },
  })
  return socket
}

export function disconnectSocket() {
  try { socket && socket.disconnect() } catch {}
  socket = null
}
