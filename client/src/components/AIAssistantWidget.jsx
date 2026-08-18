import { useState, useRef, useEffect, useMemo } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { chatPublico } from '../api/chat.api'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'

const QUICK_PROMPTS = [
  { label: '🌾 Cosechas y tubérculos', query: '¿Qué cosechas frescas y tubérculos tienen disponibles hoy?' },
  { label: '🌱 Semillas y siembra', query: '¿Qué semillas y variedades tienen para siembra?' },
  { label: '🚜 Abonos y fertilizantes', query: '¿Qué abonos orgánicos y fertilizantes me recomiendas?' },
  { label: '🚚 Envíos y cobertura', query: '¿Cómo funcionan los envíos a los municipios de Colombia?' },
  { label: '💳 Medios de pago', query: '¿Qué medios de pago aceptan en la tienda?' },
  { label: '👨‍💼 Soporte con asesor', query: 'Quiero hablar con un asesor humano de soporte' },
]

export default function AIAssistantWidget() {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: '¡Hola! 👋 Soy **AgroAsistente**, tu guía virtual agropecuario 🌾.\n\nPuedo recomendarte cosechas frescas (ñame, yuca, plátano), semillas, fertilizantes, calcular costos de envío o asesorarte en tus compras. ¿En qué te colaboro hoy?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const chatInputRef = useRef(null)

  const { addToCart } = useCart()
  const toast = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      setTimeout(() => chatInputRef.current?.focus(), 150)
    }
  }, [messages, open])

  const handleSendQuery = async (queryText) => {
    if (!queryText.trim() || loading) return

    const userText = queryText.trim()
    setInput('')
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const newMessages = [...messages, { sender: 'user', text: userText, time: timeNow }]
    setMessages(newMessages)
    setLoading(true)

    // Si el usuario pide hablar con un asesor o soporte humano
    const lower = userText.toLowerCase()
    if (lower.includes('asesor') || lower.includes('humano') || lower.includes('soporte') || lower.includes('agente')) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: '¡Por supuesto! Tenemos un canal de **Soporte en Vivo** donde un asesor humano te atenderá de inmediato.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            showSupportLink: true
          }
        ])
        setLoading(false)
      }, 500)
      return
    }

    try {
      const historyPayload = newMessages.map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        text: m.text
      }))

      const res = await chatPublico({
        mensaje: userText,
        history: historyPayload
      })

      const botResponse = res.data?.reply || res.data?.respuesta || res.data?.message || 'Lo siento, no pude procesar la respuesta en este momento.'
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: botResponse,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: '🌾 Lo siento, hubo una pequeña intermitencia al conectar con la IA. Si necesitas ayuda urgente, puedes ingresar directamente a nuestro canal de soporte.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          showSupportLink: true
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    handleSendQuery(input)
  }

  const handleResetChat = () => {
    setMessages([
      {
        sender: 'bot',
        text: '¡Conversación reiniciada! 🌾 ¿En qué puedo colaborarte sobre nuestros productos campesinos o pedidos?',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ])
  }

  const handleAddProduct = (prodData) => {
    try {
      addToCart({
        id_producto: Number(prodData.id) || Number(prodData.id_producto),
        id: Number(prodData.id) || Number(prodData.id_producto),
        nombre: prodData.nombre,
        nombre_producto: prodData.nombre,
        precio: Number(prodData.precio) || 0,
        imagen: prodData.imagen || '/img/verduras.avif',
        presentacion: prodData.presentacion || 'Unidad',
        cantidad: 1,
        stock: Number(prodData.disponibilidad) || 10
      })
      toast.success(`🛒 ¡"${prodData.nombre}" añadido al carrito!`)
    } catch (e) {
      toast.error('No se pudo añadir al carrito.')
    }
  }

  // Parsear texto del bot con Markdown y Tags de Producto [AGRO_ADD_CART: ...]
  const renderFormattedBotMessage = (text, showSupportLink) => {
    if (!text) return null

    // Regex para detectar [AGRO_ADD_CART: id|nombre|precio|presentacion|disponibilidad|imagen]
    const agroCartRegex = /\[AGRO_ADD_CART:\s*([^\]]+)\]/g
    const parts = []
    let lastIndex = 0
    let match

    while ((match = agroCartRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.substring(lastIndex, match.index) })
      }
      const rawData = match[1].split('|').map((s) => s.trim())
      parts.push({
        type: 'product',
        id: rawData[0],
        nombre: rawData[1] || 'Insumo Agropecuario',
        precio: parseFloat(rawData[2]) || 0,
        presentacion: rawData[3] || 'Porción',
        disponibilidad: rawData[4] || '10',
        imagen: rawData[5] || '/img/verduras.avif'
      })
      lastIndex = agroCartRegex.lastIndex
    }

    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.substring(lastIndex) })
    }

    return (
      <div className="ai-message-content">
        {parts.map((p, pIdx) => {
          if (p.type === 'product') {
            return (
              <div key={pIdx} className="ai-product-card fade-in">
                <div className="ai-prod-img-wrap">
                  <img
                    src={p.imagen || '/img/verduras.avif'}
                    alt={p.nombre}
                    onError={(e) => { e.currentTarget.src = '/img/verduras.avif' }}
                  />
                  <span className="ai-prod-badge">🌱 Disponible</span>
                </div>
                <div className="ai-prod-info">
                  <h4 className="ai-prod-title">{p.nombre}</h4>
                  <div className="ai-prod-details">
                    <span className="ai-prod-price">${Number(p.precio).toLocaleString('es-CO')} COP</span>
                    <span className="ai-prod-pres">{p.presentacion}</span>
                  </div>
                  <button
                    type="button"
                    className="ai-prod-btn"
                    onClick={() => handleAddProduct(p)}
                  >
                    <i className="fa fa-cart-plus" /> Agregar al Carrito
                  </button>
                </div>
              </div>
            )
          }

          // Formateo de texto en párrafos y negritas
          const lines = p.content.split('\n')
          return (
            <div key={pIdx} className="ai-text-block">
              {lines.map((line, lIdx) => {
                if (!line.trim()) return <div key={lIdx} style={{ height: '0.4rem' }} />
                
                // Formatear negritas **texto**
                const formattedLine = line.split(/(\*\*[^*]+\*\*)/g).map((chunk, cIdx) => {
                  if (chunk.startsWith('**') && chunk.endsWith('**')) {
                    return <strong key={cIdx}>{chunk.slice(2, -2)}</strong>
                  }
                  return chunk
                })

                if (line.trim().startsWith('- ') || line.trim().startsWith('• ') || line.trim().startsWith('* ')) {
                  return (
                    <div key={lIdx} className="ai-list-item">
                      <span className="ai-list-bullet">🌾</span>
                      <span>{formattedLine}</span>
                    </div>
                  )
                }

                return <p key={lIdx} className="ai-text-paragraph">{formattedLine}</p>
              })}
            </div>
          )
        })}

        {showSupportLink && (
          <div className="ai-support-cta fade-in">
            <div className="ai-support-cta-content">
              <i className="fa fa-headset" />
              <div>
                <strong>¿Prefieres un asesor humano?</strong>
                <p>Ingresa a nuestro centro de atención en tiempo real.</p>
              </div>
            </div>
            <button
              type="button"
              className="ai-support-cta-btn"
              onClick={() => {
                setOpen(false)
                navigate('/soporte')
              }}
            >
              Ir a Soporte en Vivo <i className="fa fa-arrow-right" />
            </button>
          </div>
        )}
      </div>
    )
  }

  // Mostrar el Asistente IA ÚNICAMENTE en Inicio y Catálogo / Categorías
  const isAllowedPath =
    location.pathname === '/' ||
    location.pathname === '/catalogo' ||
    location.pathname === '/categorias' ||
    location.pathname === '/explorar' ||
    location.pathname === '/buscar' ||
    location.pathname.startsWith('/categoria/')

  if (!isAllowedPath) {
    return null
  }

  return (
    <div className="ai-agro-assistant-root">
      {/* Botón flotante estilo Agro-Campo */}
      {!open && (
        <button
          className="ai-agro-launcher-btn"
          onClick={() => setOpen(true)}
          title="Abrir AgroAsistente Virtual"
          aria-label="Abrir Asistente de IA"
        >
          <div className="ai-launcher-icon-wrap">
            <i className="fa fa-robot ai-icon-robot" />
          </div>
          <div className="ai-launcher-text-col">
            <span className="ai-launcher-title">Asistente IA</span>
            <span className="ai-launcher-sub"><span className="ai-status-dot" /> En línea</span>
          </div>
        </button>
      )}

      {/* Ventana de Chat Flotante */}
      {open && (
        <div className="ai-agro-chat-dialog fade-in" role="dialog" aria-labelledby="ai-dialog-title">
          {/* Header con gradiente campesino y branding */}
          <div className="ai-dialog-header">
            <div className="ai-header-brand">
              <div className="ai-header-avatar">
                <i className="fa fa-robot" />
                <span className="ai-avatar-leaf">🌾</span>
              </div>
              <div>
                <h3 id="ai-dialog-title" className="ai-header-name">
                  AgroAsistente
                </h3>
                <span className="ai-header-status">
                  <span className="ai-live-dot" />
                  Asesor de cultivos & compras en vivo
                </span>
              </div>
            </div>

            <div className="ai-header-actions">
              <a
                href="https://t.me/montesdemariabot"
                target="_blank"
                rel="noreferrer"
                className="ai-action-btn"
                title="Abrir en Telegram (@montesdemariabot)"
                aria-label="Abrir en Telegram"
                style={{ color: '#38bdf8', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <i className="fab fa-telegram" />
              </a>
              <button
                type="button"
                className="ai-action-btn"
                onClick={handleResetChat}
                title="Reiniciar conversación"
                aria-label="Reiniciar"
              >
                <i className="fa fa-rotate-right" />
              </button>
              <button
                type="button"
                className="ai-action-btn close"
                onClick={() => setOpen(false)}
                title="Cerrar ventana"
                aria-label="Cerrar"
              >
                <i className="fa fa-times" />
              </button>
            </div>
          </div>

          {/* Feed de mensajes */}
          <div className="ai-dialog-feed">
            {messages.map((m, idx) => {
              const isUser = m.sender === 'user'
              return (
                <div
                  key={idx}
                  className={`ai-feed-row ${isUser ? 'user-row' : 'bot-row'}`}
                >
                  {!isUser && (
                    <div className="ai-msg-avatar">
                      <i className="fa fa-seedling" />
                    </div>
                  )}

                  <div className={`ai-bubble ${isUser ? 'user-bubble' : 'bot-bubble'}`}>
                    <div className="ai-bubble-header">
                      <span className="ai-bubble-author">
                        {isUser ? 'Tú' : '🤖 AgroAsistente'}
                      </span>
                      <span className="ai-bubble-time">{m.time}</span>
                    </div>

                    {isUser ? (
                      <p className="ai-user-text">{m.text}</p>
                    ) : (
                      renderFormattedBotMessage(m.text, m.showSupportLink)
                    )}
                  </div>
                </div>
              )
            })}

            {loading && (
              <div className="ai-feed-row bot-row fade-in">
                <div className="ai-msg-avatar">
                  <i className="fa fa-seedling" />
                </div>
                <div className="ai-bubble bot-bubble">
                  <div className="ai-typing-indicator">
                    <span className="ai-typing-dot" />
                    <span className="ai-typing-dot" />
                    <span className="ai-typing-dot" />
                    <span className="ai-typing-text">Consultando el campo...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chips de Preguntas Rápidas */}
          <div className="ai-quick-chips-bar">
            <div className="ai-quick-chips-scroll">
              {QUICK_PROMPTS.map((q, qIdx) => (
                <button
                  key={qIdx}
                  type="button"
                  className="ai-chip-pill"
                  disabled={loading}
                  onClick={() => handleSendQuery(q.query)}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Formulario de Input */}
          <form onSubmit={handleFormSubmit} className="ai-dialog-footer">
            <div className="ai-input-wrapper">
              <input
                ref={chatInputRef}
                type="text"
                placeholder="Pregunta por cosechas, semillas, precios o envíos..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                className="ai-chat-input"
              />
              {input.trim() && (
                <button
                  type="button"
                  className="ai-input-clear"
                  onClick={() => setInput('')}
                >
                  <i className="fa fa-times-circle" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="ai-submit-btn"
              title="Enviar mensaje"
              aria-label="Enviar"
            >
              <i className="fa fa-paper-plane" />
            </button>
          </form>

          {/* Micro-footer con sello */}
          <div className="ai-dialog-microbar">
            <span>🌾 Asistente Virtual • Inteligencia Agropecuaria en Vivo</span>
          </div>
        </div>
      )}
    </div>
  )
}
