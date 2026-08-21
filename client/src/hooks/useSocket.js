import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

/**
 * Hook para conectar con el namespace /soporte de Socket.IO
 * @param {string|null} sessionId - ID de sesión del ticket de soporte
 * @param {'cliente'|'admin'|'soporte'} rol
 * @param {Object} handlers - { onNuevoMensaje, onAgenteEscribiendo, onTicketCerrado }
 * @returns {{ socket: Socket, emitMensaje: fn, emitEscribiendo: fn }}
 */
export function useSocket(sessionId, rol, handlers = {}) {
  const socketRef = useRef(null)
  const handlersRef = useRef(handlers)

  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  useEffect(() => {
    if (!sessionId) return

    const socket = io('/soporte', {
      transports: ['polling', 'websocket'],
      withCredentials: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('unirse_sala', { session_id: sessionId, rol })
    })

    if (rol === 'cliente') {
      socket.on('nuevo_mensaje_cliente', (msg) => {
        handlersRef.current.onNuevoMensaje?.(msg)
      })
      socket.on('agente_escribiendo', () => {
        handlersRef.current.onAgenteEscribiendo?.()
      })
      socket.on('ticket_cerrado_cliente', (data) => {
        handlersRef.current.onTicketCerrado?.(data)
      })
    } else {
      socket.on('nuevo_mensaje_ticket', (msg) => {
        handlersRef.current.onNuevoMensaje?.(msg)
      })
      socket.on('cliente_escribiendo', (data) => {
        handlersRef.current.onAgenteEscribiendo?.(data)
      })
      socket.on('ticket_cerrado', (data) => {
        handlersRef.current.onTicketCerrado?.(data)
      })
      socket.on('ticket_creado', (data) => {
        handlersRef.current.onTicketCreado?.(data)
      })
    }

    return () => {
      socket.removeAllListeners()
      socket.disconnect()
    }
  }, [sessionId, rol])

  const emitMensaje = (evento, data) => {
    socketRef.current?.emit(evento, data)
  }

  const emitEscribiendo = () => {
    if (rol === 'admin' || rol === 'soporte') {
      socketRef.current?.emit('escribiendo_agente', { session_id: sessionId })
    } else {
      socketRef.current?.emit('escribiendo_cliente', { session_id: sessionId })
    }
  }

  return { socket: socketRef.current, emitMensaje, emitEscribiendo }
}
