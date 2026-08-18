import { useState, useRef, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { crearTicket, enviarMensaje, calificar, buscarTicket, solicitarAgente } from '../api/soporte.api'
import { useSocket } from '../hooks/useSocket'

export default function SoportePage() {
  const toast = useToast()
  const { user } = useAuth()
  const isAdminOrSupport = user?.id_rol === 1 || user?.id_rol === 4 || user?.username === 'admin'

  // Redirigir de inmediato al Admin / Asesor a su panel de gestión
  if (isAdminOrSupport) {
    return <Navigate to="/admin/soporte" replace />
  }

  const [activeTab, setActiveTab] = useState('nuevo') // 'nuevo' | 'buscar'
  const [activeTicket, setActiveTicket] = useState(null)
  const [messages, setMessages] = useState([])
  const [nombre, setNombre] = useState(user?.nombre || user?.username || '')
  const [correo, setCorreo] = useState(user?.correo || '')
  const [telefono, setTelefono] = useState(user?.telefono || '')
  const [categoriaConsulta, setCategoriaConsulta] = useState('pedidos')
  const [asunto, setAsunto] = useState('')
  const [mensajeInicial, setMensajeInicial] = useState('')
  const [inputMsg, setInputMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [requestingHuman, setRequestingHuman] = useState(false)
  const [rating, setRating] = useState(0)
  const [rated, setRated] = useState(false)
  const [ticketSearchCode, setTicketSearchCode] = useState('')
  const [searchError, setSearchError] = useState('')

  const chatFeedRef = useRef(null)

  // Restaurar ticket activo desde localStorage si existe
  useEffect(() => {
    try {
      const saved = localStorage.getItem('agro_active_ticket')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && parsed.session_id && parsed.estado !== 'cerrado') {
          setActiveTicket(parsed)
          if (parsed.mensajes && parsed.mensajes.length > 0) {
            setMessages(parsed.mensajes)
          }
        }
      }
    } catch (e) {
      console.error('Error restaurando agro_active_ticket:', e)
    }
  }, [])

  // Sincronizar activeTicket con localStorage
  useEffect(() => {
    if (activeTicket && activeTicket.estado !== 'cerrado') {
      localStorage.setItem('agro_active_ticket', JSON.stringify(activeTicket))
    } else if (activeTicket?.estado === 'cerrado') {
      localStorage.removeItem('agro_active_ticket')
    }
  }, [activeTicket])

  // Sincronizar datos si el usuario inicia sesión
  useEffect(() => {
    if (user) {
      if (!nombre) setNombre(user.nombre || user.username || '')
      if (!correo) setCorreo(user.correo || '')
      if (!telefono) setTelefono(user.telefono || '')
    }
  }, [user])

  // Hook de Socket.IO con deduplicación perfecta
  const { emitEscribiendo } = useSocket(
    activeTicket?.session_id,
    'cliente',
    {
      onNuevoMensaje: (msg) => {
        setMessages((prev) => {
          // Si ya existe por id idéntico
          if (msg.id && prev.some((m) => m.id === msg.id)) return prev

          // Si es el mensaje local optimista del usuario, reemplazarlo con el mensaje confirmado del servidor
          const tempIdx = prev.findIndex(
            (m) =>
              (String(m.id).startsWith('temp_') || !m.id) &&
              m.remitente === msg.remitente &&
              m.mensaje?.trim() === msg.mensaje?.trim()
          )
          if (tempIdx !== -1) {
            const next = [...prev]
            next[tempIdx] = msg
            return next
          }

          // Si ya existe un mensaje idéntico reciente
          if (prev.some((m) => m.remitente === msg.remitente && m.mensaje?.trim() === msg.mensaje?.trim())) {
            return prev
          }

          return [...prev, msg]
        })
      },
      onTicketCerrado: () => {
        setActiveTicket((prev) => (prev ? { ...prev, estado: 'cerrado' } : null))
      },
    }
  )

  useEffect(() => {
    if (chatFeedRef.current) {
      chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight
    }
  }, [messages])

  const handleCreateTicket = async (e) => {
    e.preventDefault()
    if (!asunto.trim() || !mensajeInicial.trim()) return

    setLoading(true)
    try {
      const fullSubject = `[${categoriaConsulta.toUpperCase()}] ${asunto.trim()}`
      const res = await crearTicket({
        nombre: nombre || user?.nombre || 'Cliente',
        correo: correo || user?.correo || 'cliente@montesdemaria.com',
        telefono: telefono || user?.telefono || 'Sin registrar',
        asunto: fullSubject,
        mensaje: mensajeInicial.trim(),
      })

      const ticketData = res.data?.ticket || {
        id: res.data?.ticketId,
        ticket_code: res.data?.ticketCode,
        session_id: res.data?.sessionId,
        asunto: fullSubject,
        estado: 'bot',
      }
      setActiveTicket(ticketData)

      if (res.data?.mensajes && res.data.mensajes.length > 0) {
        setMessages(res.data.mensajes)
      } else {
        setMessages([
          {
            id: `temp_${Date.now()}`,
            remitente: 'user',
            nombre_remitente: nombre || 'Tú',
            mensaje: mensajeInicial.trim(),
            fecha: new Date().toISOString(),
          },
          {
            id: `bot_${Date.now()}`,
            remitente: 'bot',
            nombre_remitente: 'Asistente Virtual',
            mensaje:
              res.data?.bienvenida ||
              `¡Hola ${nombre}! He recibido tu consulta sobre "${asunto}". Un momento mientras proceso tu solicitud...`,
            fecha: new Date().toISOString(),
          },
        ])
      }
      setAsunto('')
      setMensajeInicial('')
    } catch (err) {
      console.error('Error al crear ticket:', err)
      toast.error(err.response?.data?.error || 'Error al iniciar la consulta de soporte.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!inputMsg.trim() || !activeTicket) return

    const txt = inputMsg.trim()
    setInputMsg('')

    const tempId = `temp_${Date.now()}_${Math.random()}`
    const localMsg = {
      id: tempId,
      session_id: activeTicket.session_id,
      ticket_id: activeTicket.id,
      remitente: 'user',
      nombre_remitente: nombre || user?.nombre || 'Tú',
      mensaje: txt,
      fecha: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, localMsg])

    try {
      const res = await enviarMensaje({
        session_id: activeTicket.session_id,
        ticket_id: activeTicket.id,
        mensaje: txt,
        remitente: 'user',
      })

      if (res.data?.transferido || res.data?.escalated) {
        setActiveTicket((prev) => (prev ? { ...prev, estado: 'agente' } : null))
      }
    } catch (err) {
      console.error('Error enviando mensaje:', err)
    }
  }

  const handleRequestHuman = async () => {
    if (!activeTicket) return
    setRequestingHuman(true)
    try {
      await solicitarAgente({
        ticket_id: activeTicket.id,
        session_id: activeTicket.session_id,
      })
      setActiveTicket((prev) => (prev ? { ...prev, estado: 'agente' } : null))
    } catch (err) {
      toast.error('Error al transferir a un asesor humano.')
    } finally {
      setRequestingHuman(false)
    }
  }

  const handleSearchExistingTicket = async (e) => {
    e.preventDefault()
    setSearchError('')
    if (!ticketSearchCode.trim()) return

    try {
      const res = await buscarTicket({ q: ticketSearchCode.trim() })
      const list = res.data?.tickets || res.data || []
      const found = list[0]
      if (found && (found.session_id || found.id || found.ticket_code)) {
        setActiveTicket(found)
        setMessages(
          found.mensajes || [
            {
              remitente: 'sistema',
              mensaje: `Ticket ${found.ticket_code || ''} (${found.asunto || ''}) cargado exitosamente.`,
              fecha: new Date().toISOString(),
            },
          ]
        )
      } else {
        setSearchError('No encontramos ningún ticket con ese código o correo.')
      }
    } catch {
      setSearchError('Error al buscar el ticket.')
    }
  }

  const handleRate = async (stars) => {
    setRating(stars)
    if (!activeTicket) return
    try {
      await calificar({
        ticket_id: activeTicket.id,
        session_id: activeTicket.session_id,
        estrellas: stars,
        comentario: `Calificación de ${stars} estrellas recibida por el usuario.`,
      })
      setRated(true)
    } catch {
      setRated(true)
    }
  }

  const getStatusBadge = (estado) => {
    switch (estado) {
      case 'cerrado':
        return <span className="badge badge-danger"><i className="fa fa-check-circle" /> Resuelto</span>
      case 'agente':
        return <span className="badge badge-warning"><i className="fa fa-user-tie" /> En espera de Asesor</span>
      default:
        return <span className="badge badge-success"><i className="fa fa-robot" /> Asistente en Vivo</span>
    }
  }

  return (
    <>
      <Navbar />

      <main className="main-content" style={{ padding: '2rem 1rem 4rem' }}>
        <div className="app-container" style={{ maxWidth: '820px', margin: '0 auto' }}>
          {/* Clean Minimal Page Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.25rem 0' }}>
                Centro de Ayuda & Soporte
              </h1>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.92rem' }}>
                Atención directa en vivo para compradores y campesinos.
              </p>
            </div>

            {!activeTicket && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setActiveTab(activeTab === 'nuevo' ? 'buscar' : 'nuevo')}
                style={{ borderRadius: '999px', padding: '0.45rem 1.15rem', fontSize: '0.85rem', fontWeight: 600 }}
              >
                <i className={`fa ${activeTab === 'nuevo' ? 'fa-search' : 'fa-edit'}`} />{' '}
                {activeTab === 'nuevo' ? 'Consultar Ticket Anterior' : 'Crear Nueva Consulta'}
              </button>
            )}
          </div>

          {/* Main Content Area: Centered and Focused */}
          <div>
            {activeTicket ? (
              /* Active Live Chat Window */
              <div className="support-chat-container fade-in">
                <div className="support-chat-header">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                        {activeTicket.asunto || 'Consulta de Soporte'}
                      </h3>
                      {getStatusBadge(activeTicket.estado)}
                    </div>
                    <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                      Código de Ticket: <strong>{activeTicket.ticket_code || activeTicket.session_id}</strong>
                    </span>
                  </div>

                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                      {activeTicket.estado !== 'cerrado' && activeTicket.estado !== 'agente' && (
                        <button
                          type="button"
                          onClick={handleRequestHuman}
                          disabled={requestingHuman}
                          className="btn btn-sm btn-outline-primary"
                          style={{ borderRadius: '999px', fontWeight: 700 }}
                        >
                          <i className={`fa ${requestingHuman ? 'fa-spinner fa-spin' : 'fa-user-tie'}`} /> Hablar con un asesor
                        </button>
                      )}
                    <button
                      type="button"
                      onClick={() => { setActiveTicket(null); setMessages([]); }}
                      className="btn btn-sm btn-secondary"
                      style={{ borderRadius: '999px' }}
                    >
                      <i className="fa fa-plus" /> Nueva Consulta
                    </button>
                  </div>
                </div>

                {/* Messages Feed */}
                <div className="support-feed-wrap" ref={chatFeedRef}>
                  {messages.map((m, idx) => {
                    const role = m.remitente || m.rol || 'user'
                    const isMe = role === 'user' || role === 'cliente'
                    const isSys = role === 'sistema'
                    const isBot = role === 'bot'
                    const author = isMe
                      ? (m.nombre_remitente || nombre || user?.nombre || 'Tú')
                      : isSys
                      ? 'Sistema'
                      : isBot
                      ? '🤖 Asistente Virtual'
                      : (m.nombre_remitente || '👨‍💼 Asesor de Soporte')

                    if (isSys) {
                      return (
                        <div key={idx} className="bubble-system">
                          <i className="fa fa-info-circle" /> {m.mensaje}
                        </div>
                      )
                    }

                    return (
                      <div
                        key={idx}
                        className={isMe ? 'bubble-user' : 'bubble-agent-bot'}
                      >
                        <div style={{ fontSize: '0.74rem', fontWeight: 700, marginBottom: '0.3rem', opacity: isMe ? 0.9 : 0.85, color: isMe ? '#ffffff' : '#15803d', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <i className={`fa ${isMe ? 'fa-user' : isBot ? 'fa-robot' : 'fa-headset'}`} />
                          {author} • {m.fecha ? new Date(m.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ahora'}
                        </div>
                        <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.55, fontSize: '0.95rem' }}>
                          {m.mensaje}
                        </p>
                      </div>
                    )
                  })}
                </div>

                {/* Message Input or Rating Screen */}
                {activeTicket.estado !== 'cerrado' ? (
                  <form onSubmit={handleSendMessage} style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem' }}>
                    <input
                      type="text"
                      placeholder="Escribe tu mensaje o respuesta aquí..."
                      value={inputMsg}
                      onChange={(e) => {
                        setInputMsg(e.target.value)
                        emitEscribiendo()
                      }}
                      className="form-input"
                      style={{ flex: 1, borderRadius: '999px', paddingLeft: '1.25rem' }}
                    />
                    <button type="submit" className="btn btn-primary" style={{ borderRadius: '999px', padding: '0 1.5rem', fontWeight: 700 }}>
                      <i className="fa fa-paper-plane" /> Enviar
                    </button>
                  </form>
                ) : (
                  <div style={{ padding: '1.75rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 1rem 0', fontWeight: 700, color: '#0f172a' }}>
                      Este ticket ha sido resuelto y finalizado.
                    </p>
                    {!rated ? (
                      <div>
                        <span style={{ fontSize: '0.9rem', color: '#64748b', display: 'block', marginBottom: '0.6rem' }}>
                          ¿Cómo calificarías la atención recibida?
                        </span>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => handleRate(s)}
                              style={{ background: 'none', border: 'none', fontSize: '1.8rem', cursor: 'pointer', color: s <= rating ? '#f59e0b' : '#cbd5e1', transition: 'transform 0.15s ease' }}
                              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
                              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span className="text-success font-bold" style={{ fontSize: '1rem' }}>
                        <i className="fa fa-check-circle" /> ¡Muchas gracias por tu calificación! ⭐
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : activeTab === 'nuevo' ? (
              /* New Ticket Creation Form */
              <div className="card fade-in" style={{ padding: '2.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', background: '#ffffff', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
                <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                  <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <i className="fa fa-edit" style={{ color: '#2e7d32' }} /> Iniciar Consulta
                  </h2>
                  <p className="text-muted" style={{ margin: '0.35rem 0 0 0', fontSize: '0.9rem' }}>
                    Completa los datos para conectarte de inmediato con nuestro soporte.
                  </p>
                </div>

                <form onSubmit={handleCreateTicket}>
                  {/* User Info Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.88rem' }}>Tu Nombre *</label>
                      <input
                        type="text"
                        required
                        placeholder="Nombre y Apellido"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.88rem' }}>Correo Electrónico *</label>
                      <input
                        type="email"
                        required
                        placeholder="correo@ejemplo.com"
                        value={correo}
                        onChange={(e) => setCorreo(e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.88rem' }}>Categoría de Consulta</label>
                      <select
                        value={categoriaConsulta}
                        onChange={(e) => setCategoriaConsulta(e.target.value)}
                        className="form-select"
                      >
                        <option value="pedidos">📦 Estado de Pedidos & Envíos</option>
                        <option value="cosechas">🌱 Productos & Cosechas</option>
                        <option value="pagos">💳 Pagos & Facturación</option>
                        <option value="vender">🌾 Registro como Vendedor / Campesino</option>
                        <option value="otro">❓ Otra Consulta</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.88rem' }}>Asunto Breve *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Duda sobre entrega en San Jacinto"
                        value={asunto}
                        onChange={(e) => setAsunto(e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.75rem' }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.88rem' }}>Describe tu Solicitud *</label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Escribe aquí los detalles de tu pregunta o solicitud..."
                      value={mensajeInicial}
                      onChange={(e) => setMensajeInicial(e.target.value)}
                      className="form-textarea"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary btn-lg"
                    style={{ width: '100%', padding: '0.95rem', borderRadius: '12px', fontWeight: 800, fontSize: '1rem' }}
                  >
                    {loading ? (
                      <><i className="fa fa-spinner fa-spin" /> Conectando al soporte...</>
                    ) : (
                      <><i className="fa fa-paper-plane" /> Iniciar Chat de Soporte</>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              /* Ticket Lookup View */
              <div className="card fade-in" style={{ padding: '2.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', background: '#ffffff', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
                <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                  <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <i className="fa fa-search" style={{ color: '#2e7d32' }} /> Consultar Ticket Anterior
                  </h2>
                  <p className="text-muted" style={{ margin: '0.35rem 0 0 0', fontSize: '0.9rem' }}>
                    Ingresa el código de tu ticket (ej: <strong>TK-XXXXXX</strong>) o tu correo para continuar una conversación anterior.
                  </p>
                </div>

                {searchError && <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>{searchError}</div>}

                <form onSubmit={handleSearchExistingTicket} style={{ display: 'flex', gap: '0.75rem' }}>
                  <input
                    type="text"
                    placeholder="Código TK-... o correo electrónico"
                    value={ticketSearchCode}
                    onChange={(e) => setTicketSearchCode(e.target.value)}
                    className="form-input"
                    style={{ flex: 1, padding: '0.85rem 1.25rem' }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '0 1.75rem', fontWeight: 700 }}>
                    Buscar Ticket
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}
