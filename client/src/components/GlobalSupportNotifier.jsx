import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

/**
 * Componente Global: Notificaciones de Soporte y Chat en Tiempo Real
 * Muestra alertas (toasts) cuando llegan mensajes si el usuario, soporte o admin
 * se encuentran fuera de la sección de soporte / ayuda.
 */
export default function GlobalSupportNotifier() {
  const { user } = useAuth()
  const toast = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const socketRef = useRef(null)

  const isAdminOrSupport = user?.id_rol === 1 || user?.id_rol === 4 || user?.rol === 1 || user?.rol === 4 || user?.username === 'admin'
  const isCurrentlyInSupport = location.pathname === '/soporte' || location.pathname.startsWith('/admin/soporte')

  useEffect(() => {
    // Conectar al socket de soporte
    const socket = io('/soporte', {
      transports: ['polling', 'websocket'],
      withCredentials: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      // 1. Si es Administrador o Agente de Soporte -> Unirse a admin_room
      if (isAdminOrSupport) {
        socket.emit('unirse_sala', { rol: 'admin' })
      } else {
        // 2. Si es Cliente -> Verificar si tiene una sesión de ticket activa en localStorage
        try {
          const rawTicket = localStorage.getItem('agro_active_ticket')
          if (rawTicket) {
            const ticket = JSON.parse(rawTicket)
            if (ticket?.session_id && ticket.estado !== 'cerrado') {
              socket.emit('unirse_sala', { session_id: ticket.session_id, rol: 'cliente' })
            }
          }
        } catch (e) {
          console.error('Error leyendo agro_active_ticket en GlobalSupportNotifier:', e)
        }
      }
    })

    // Escuchar mensajes entrantes para Admin / Soporte
    socket.on('nuevo_mensaje_ticket', (msg) => {
      // Solo notificar si no estamos en /admin/soporte y el mensaje viene del cliente
      const inAdminSupport = window.location.pathname.startsWith('/admin/soporte')
      const isFromAgent = msg.remitente === 'admin' || msg.remitente === 'soporte' || msg.remitente === 'agente'

      if (isAdminOrSupport && !inAdminSupport && !isFromAgent) {
        const sender = msg.nombre_remitente || msg.remitente_nombre || 'Cliente'
        const content = msg.mensaje || msg.contenido || 'Nuevo mensaje recibido'
        toast.info(
          `💬 ${sender}: "${content.length > 70 ? content.slice(0, 70) + '...' : content}"`
        )
      }
    })

    // Escuchar nuevos tickets creados para Admin / Soporte
    socket.on('ticket_creado', (ticket) => {
      const inAdminSupport = window.location.pathname.startsWith('/admin/soporte')
      if (isAdminOrSupport && !inAdminSupport) {
        const clientName = ticket.nombre || ticket.nombre_cliente || 'Cliente'
        const subject = ticket.asunto || 'Nueva consulta'
        toast.info(
          `🎟️ Nuevo ticket de ${clientName}: ${subject.length > 55 ? subject.slice(0, 55) + '...' : subject}`
        )
      }
    })

    // Escuchar respuestas de agentes/bot para el Cliente
    socket.on('nuevo_mensaje_cliente', (msg) => {
      const inClientSupport = window.location.pathname === '/soporte'
      const isFromUser = msg.remitente === 'user' || msg.remitente === 'cliente'

      if (!isAdminOrSupport && !inClientSupport && !isFromUser) {
        const sender = msg.remitente === 'bot' ? 'Asistente de Soporte' : (msg.nombre_remitente || 'Asesor de Soporte')
        const content = msg.mensaje || msg.contenido || 'Has recibido una respuesta'
        toast.info(
          `💬 ${sender}: "${content.length > 70 ? content.slice(0, 70) + '...' : content}"`
        )
      }
    })

    // Escuchar cierre de ticket para el Cliente
    socket.on('ticket_cerrado_cliente', (data) => {
      const inClientSupport = window.location.pathname === '/soporte'
      if (!isAdminOrSupport && !inClientSupport) {
        toast.info('✅ Tu ticket de soporte ha sido resuelto y cerrado.')
      }
    })

    return () => {
      socket.removeAllListeners()
      socket.disconnect()
    }
  }, [isAdminOrSupport, user])

  return null
}
