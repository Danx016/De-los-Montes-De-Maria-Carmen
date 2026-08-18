import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { listarAgentes, buscarTicket, enviarMensaje, cerrarTicket } from '../api/soporte.api'
import { useSocket } from '../hooks/useSocket'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'

export default function AdminSoportePage() {
  const toast = useToast()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tickets, setTickets] = useState([])
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [messages, setMessages] = useState([])
  const [replyText, setReplyText] = useState('')
  const [agentes, setAgentes] = useState([])
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState(false)
  const [filterStatus, setFilterStatus] = useState('todos')
  const [searchFilter, setSearchFilter] = useState('')

  const chatEndRef = useRef(null)

  // Hook de socket en admin_room
  const { emitEscribiendo } = useSocket(
    selectedTicket?.session_id || 'admin_room',
    'admin',
    {
      onTicketCreado: (newTicket) => {
        setTickets((prev) => [newTicket, ...prev.filter((t) => t.id !== newTicket.id)])
      },
      onNuevoMensaje: (msg) => {
        if (msg.session_id === selectedTicket?.session_id) {
          setMessages((prev) => {
            const exists = prev.some((m) => m.id && msg.id && m.id === msg.id)
            if (exists) return prev
            return [...prev, msg]
          })
        }
      },
      onTicketCerrado: (data) => {
        const closedId = typeof data === 'object' ? data.ticketId : data
        setTickets((prev) =>
          prev.map((t) => (t.id === closedId || t.session_id === data?.sessionId ? { ...t, estado: 'cerrado' } : t))
        )
        if (selectedTicket?.id === closedId || selectedTicket?.session_id === data?.sessionId) {
          setSelectedTicket((prev) => (prev ? { ...prev, estado: 'cerrado' } : null))
        }
      },
    }
  )

  const fetchTickets = async () => {
    try {
      const [tickRes, agRes] = await Promise.allSettled([
        buscarTicket({ q: '' }),
        listarAgentes(),
      ])

      if (tickRes.status === 'fulfilled') {
        const list = tickRes.value.data?.tickets || tickRes.value.data || []
        setTickets(list)
        if (list.length > 0 && !selectedTicket) {
          setSelectedTicket(list[0])
          setMessages(list[0].mensajes || [])
        } else if (selectedTicket) {
          const updated = list.find((t) => t.id === selectedTicket.id || t.session_id === selectedTicket.session_id)
          if (updated) {
            setSelectedTicket(updated)
            setMessages(updated.mensajes || [])
          }
        }
      }

      if (agRes.status === 'fulfilled') {
        setAgentes(agRes.value.data?.agentes || agRes.value.data || [])
      }
    } catch (err) {
      console.error('Error fetching tickets:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSelectTicket = (t) => {
    setSelectedTicket(t)
    setMessages(t.mensajes || [])
  }

  const handleSendReply = async (e) => {
    e.preventDefault()
    if (!replyText.trim() || !selectedTicket) return

    const txt = replyText.trim()
    setReplyText('')

    const agentName = user?.nombre || user?.username || 'Asesor de Soporte'

    const localMsg = {
      session_id: selectedTicket.session_id,
      ticket_id: selectedTicket.id,
      remitente: 'agente',
      nombre_remitente: agentName,
      mensaje: txt,
      fecha: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, localMsg])

    try {
      await enviarMensaje({
        session_id: selectedTicket.session_id,
        ticket_id: selectedTicket.id,
        mensaje: txt,
        remitente: 'agente',
      })
    } catch (err) {
      console.error('Error sending agent reply:', err)
    }
  }

  const handleCloseTicket = async () => {
    if (!selectedTicket) return
    const ok = await confirm({
      title: '¿Cerrar ticket?',
      message: 'El ticket será marcado como Resuelto y Cerrado. Esta acción no se puede deshacer.',
      danger: false,
    })
    if (!ok) return

    setClosing(true)
    try {
      await cerrarTicket({
        ticket_id: selectedTicket.id,
        session_id: selectedTicket.session_id,
      })
      setSelectedTicket((prev) => (prev ? { ...prev, estado: 'cerrado' } : null))
      setTickets((prev) =>
        prev.map((t) => (t.id === selectedTicket.id ? { ...t, estado: 'cerrado' } : t))
      )
      setMessages((prev) => [
        ...prev,
        {
          remitente: 'sistema',
          nombre_remitente: 'Sistema',
          mensaje: '✅ Ticket marcado como resuelto y cerrado por el agente.',
          fecha: new Date().toISOString(),
        },
      ])
    } catch (err) {
      toast.error('Error al cerrar el ticket.')
    } finally {
      setClosing(false)
    }
  }

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchStatus =
        filterStatus === 'todos' ||
        (filterStatus === 'agente' && t.estado === 'agente') ||
        (filterStatus === 'bot' && t.estado === 'bot') ||
        (filterStatus === 'cerrado' && t.estado === 'cerrado')

      const q = searchFilter.toLowerCase().trim()
      const matchSearch =
        q === '' ||
        (t.ticket_code && t.ticket_code.toLowerCase().includes(q)) ||
        (t.nombre_cliente && t.nombre_cliente.toLowerCase().includes(q)) ||
        (t.correo_cliente && t.correo_cliente.toLowerCase().includes(q)) ||
        (t.asunto && t.asunto.toLowerCase().includes(q))

      return matchStatus && matchSearch
    })
  }, [tickets, filterStatus, searchFilter])

  const pendingHumanCount = tickets.filter((t) => t.estado === 'agente').length

  return (
    <div className="admin-support-fullscreen" style={{ minHeight: '100vh', backgroundColor: '#f4f6f8', padding: '1.5rem 2rem' }}>
      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', background: '#ffffff', padding: '1.25rem 1.75rem', borderRadius: '14px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '1.4rem' }}>
            <i className="fa fa-headset" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ margin: 0, fontSize: '1.4rem', color: '#1b5e20', fontWeight: 800 }}>
                Mesa de Ayuda & Atención en Vivo
              </h1>
              {pendingHumanCount > 0 && (
                <span className="badge badge-danger" style={{ animation: 'pulse 2s infinite' }}>
                  {pendingHumanCount} Requiere Asesor Humano
                </span>
              )}
            </div>
            <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Gestiona consultas de compradores y productores en tiempo real con asistencia híbrida (IA + Asesores).
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={fetchTickets} className="btn btn-outline-primary" title="Refrescar lista de tickets">
            <i className="fa fa-sync-alt" /> Actualizar
          </button>
          <Link to="/admin" className="btn btn-secondary">
            <i className="fa fa-arrow-left" /> Volver al Panel Admin
          </Link>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(0, 2fr)', gap: '1.5rem', height: 'calc(100vh - 160px)' }}>
        {/* Left Column: Tickets List with Filters */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', borderRadius: '14px' }}>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa fa-inbox text-primary" /> Tickets ({filteredTickets.length})
              </h3>
              <span className="text-muted" style={{ fontSize: '0.8rem' }}>Total: {tickets.length}</span>
            </div>

            {/* Status Filter Tabs */}
            <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setFilterStatus('todos')}
                className={`btn btn-sm ${filterStatus === 'todos' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('agente')}
                className={`btn btn-sm ${filterStatus === 'agente' ? 'btn-warning' : 'btn-secondary'}`}
                style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}
              >
                ⚠️ Asesor ({tickets.filter((t) => t.estado === 'agente').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('bot')}
                className={`btn btn-sm ${filterStatus === 'bot' ? 'btn-success' : 'btn-secondary'}`}
                style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}
              >
                🤖 Bot
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('cerrado')}
                className={`btn btn-sm ${filterStatus === 'cerrado' ? 'btn-danger' : 'btn-secondary'}`}
                style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}
              >
                Resueltos
              </button>
            </div>

            {/* Search Filter Input */}
            <div style={{ marginTop: '0.5rem' }}>
              <input
                type="text"
                placeholder="Buscar por código, cliente o asunto..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="form-input"
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
              />
            </div>
          </div>

          {/* Tickets Scrollable List */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <div className="spinner" />
                <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cargando tickets...</p>
              </div>
            ) : filteredTickets.length > 0 ? (
              filteredTickets.map((t) => {
                const isSelected = selectedTicket?.id === t.id || selectedTicket?.session_id === t.session_id
                const isAgente = t.estado === 'agente'
                const isCerrado = t.estado === 'cerrado'

                return (
                  <div
                    key={t.id || t.session_id}
                    onClick={() => handleSelectTicket(t)}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      border: isSelected ? '2px solid var(--primary-color, #2e7d32)' : '1px solid var(--border-color, #e0e0e0)',
                      backgroundColor: isSelected ? '#f1f8e9' : isAgente ? '#fffde7' : '#ffffff',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 3px 8px rgba(46, 125, 50, 0.12)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.asunto || 'Consulta General'}
                      </strong>
                      <span
                        className={`badge ${isCerrado ? 'badge-danger' : isAgente ? 'badge-warning' : 'badge-success'}`}
                        style={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }}
                      >
                        {isCerrado ? 'Cerrado' : isAgente ? '⚠️ Requiere Asesor' : '🤖 En Bot'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <span>
                        <i className="fa fa-user" /> {t.nombre_cliente || 'Cliente'}
                      </span>
                      <span>
                        <i className="fa fa-ticket-alt" /> {t.ticket_code || t.session_id?.substring(0, 10)}
                      </span>
                    </div>

                    {t.ultimo_mensaje && (
                      <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.78rem', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.ultimo_mensaje}
                      </p>
                    )}
                  </div>
                )
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <i className="fa fa-inbox" style={{ fontSize: '2.5rem', opacity: 0.4, marginBottom: '0.75rem' }} />
                <p style={{ margin: 0, fontSize: '0.9rem' }}>No hay tickets con este filtro</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Conversation & Controls */}
        <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', borderRadius: '14px' }}>
          {selectedTicket ? (
            <>
              {/* Ticket Top Info Bar */}
              <div style={{ padding: '1.25rem 1.75rem', background: '#f8f9fa', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>
                      {selectedTicket.asunto || 'Consulta de Soporte'}
                    </h2>
                    <span className={`badge ${selectedTicket.estado === 'cerrado' ? 'badge-danger' : selectedTicket.estado === 'agente' ? 'badge-warning' : 'badge-success'}`}>
                      {selectedTicket.estado === 'cerrado' ? 'Resuelto' : selectedTicket.estado === 'agente' ? 'En cola de Asesor' : 'Asistente IA'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span><strong>Cliente:</strong> {selectedTicket.nombre_cliente || 'Anónimo'}</span>
                    <span><strong>Correo:</strong> {selectedTicket.correo_cliente || 'N/A'}</span>
                    {selectedTicket.telefono_cliente && <span><strong>Tel:</strong> {selectedTicket.telefono_cliente}</span>}
                    <span><strong>Código:</strong> {selectedTicket.ticket_code || selectedTicket.session_id}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {selectedTicket.estado !== 'cerrado' && (
                    <button
                      type="button"
                      onClick={handleCloseTicket}
                      disabled={closing}
                      className="btn btn-sm btn-outline-danger"
                    >
                      <i className={`fa ${closing ? 'fa-spinner fa-spin' : 'fa-check'}`} /> Marcar Resuelto
                    </button>
                  )}
                </div>
              </div>

              {/* Messages Area */}
              <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem', background: '#ffffff' }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)' }}>
                    <i className="fa fa-comments" style={{ fontSize: '3rem', opacity: 0.3, marginBottom: '1rem' }} />
                    <p>No hay mensajes en esta conversación todavía.</p>
                  </div>
                ) : (
                  messages.map((m, idx) => {
                    const isAgent = m.remitente === 'agente' || m.remitente === 'admin'
                    const isBot = m.remitente === 'bot'
                    const isSys = m.remitente === 'sistema'
                    const isClient = !isAgent && !isBot && !isSys

                    return (
                      <div
                        key={idx}
                        style={{
                          alignSelf: isAgent ? 'flex-end' : isSys ? 'center' : 'flex-start',
                          maxWidth: isSys ? '90%' : '75%',
                          backgroundColor: isAgent ? 'var(--primary-color, #2e7d32)' : isSys ? '#eceff1' : isBot ? '#f1f8e9' : '#f5f5f5',
                          color: isAgent ? '#ffffff' : '#202124',
                          padding: '0.75rem 1rem',
                          borderRadius: isAgent ? '16px 16px 4px 16px' : isSys ? '8px' : '16px 16px 16px 4px',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
                          fontSize: '0.92rem',
                          border: isBot ? '1px solid #c8e6c9' : isSys ? '1px dashed #b0bec5' : 'none',
                        }}
                      >
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem', opacity: isAgent ? 0.9 : 0.75, color: isAgent ? '#ffffff' : isBot ? '#2e7d32' : isSys ? '#546e7a' : '#1565c0' }}>
                          {isAgent
                            ? `🛡️ ${m.nombre_remitente || 'Tú (Agente)'}`
                            : isBot
                            ? '🤖 Asistente Bot (IA)'
                            : isSys
                            ? '🔔 Sistema'
                            : `👤 ${m.nombre_remitente || selectedTicket.nombre_cliente || 'Cliente'}`}{' '}
                          • {m.fecha ? new Date(m.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ahora'}
                        </div>
                        <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{m.mensaje}</p>
                      </div>
                    )
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Agent Reply Input Bar */}
              {selectedTicket.estado !== 'cerrado' ? (
                <form onSubmit={handleSendReply} style={{ padding: '1rem 1.5rem', background: '#f8f9fa', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem' }}>
                  <input
                    type="text"
                    placeholder="Escribe una respuesta en vivo para el cliente..."
                    value={replyText}
                    onChange={(e) => {
                      setReplyText(e.target.value)
                      emitEscribiendo()
                    }}
                    className="form-input"
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="btn btn-primary" disabled={!replyText.trim()} style={{ padding: '0 1.5rem' }}>
                    <i className="fa fa-paper-plane" /> Responder
                  </button>
                </form>
              ) : (
                <div style={{ padding: '1rem', background: '#f8f9fa', borderTop: '1px solid var(--border-color)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  <i className="fa fa-check-circle text-success" /> Este ticket está marcado como resuelto.
                </div>
              )}
            </>
          ) : (
            <div style={{ margin: 'auto', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <i className="fa fa-headset" style={{ fontSize: '4rem', opacity: 0.3, marginBottom: '1rem' }} />
              <h3>Selecciona un ticket de la lista para atender</h3>
              <p>Podrás chatear en vivo con el cliente y consultar el historial completo.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
