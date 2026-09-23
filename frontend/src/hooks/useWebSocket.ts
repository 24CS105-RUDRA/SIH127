import { useEffect, useRef, useState, useCallback } from 'react'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

interface WebSocketMessage {
  type: string
  data: any
}

export function useWebSocket(channel: 'alerts' | 'heatmap' | 'density', onMessage?: (message: WebSocketMessage) => void) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(`${WS_URL}/ws/${channel}`)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      reconnectAttempts.current = 0
      console.log(`WebSocket connected to ${channel}`)
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        setLastMessage(message)
        onMessage?.(message)
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e)
      }
    }

    ws.onclose = () => {
      setIsConnected(false)
      console.log(`WebSocket disconnected from ${channel}`)
      
      // Attempt reconnect
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++
        const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000)
        reconnectTimeoutRef.current = setTimeout(connect, delay)
      }
    }

    ws.onerror = (error) => {
      console.error(`WebSocket error on ${channel}:`, error)
    }
  }, [channel, onMessage])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
  }, [])

  const send = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return { isConnected, lastMessage, send, connect, disconnect }
}

// Hook for multiple channels
export function useMultiWebSocket(
  channels: ('alerts' | 'heatmap' | 'density')[],
  onMessage?: (channel: string, message: WebSocketMessage) => void
) {
  const connections = channels.map(channel => useWebSocket(channel, (msg) => onMessage?.(channel, msg)))
  
  return {
    connections: Object.fromEntries(channels.map((c, i) => [c, connections[i]])),
    isAnyConnected: connections.some(c => c.isConnected),
  }
}