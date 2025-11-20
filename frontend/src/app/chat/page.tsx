'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { socketClient } from '@/lib/socket'
import { 
  Send, 
  Paperclip, 
  Smile, 
  ArrowLeft,
  Users,
  Hash,
  MoreVertical
} from 'lucide-react'
import Link from 'next/link'
import { SocketMessage, ChatRoom } from '@/types'
import toast from 'react-hot-toast'

export default function ChatPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<SocketMessage[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch chat rooms
  const { data: roomsData } = useQuery({
    queryKey: ['chat-rooms'],
    queryFn: () => apiClient.getChatRooms(),
    enabled: !!user
  })

  // Fetch messages for selected room
  const { data: messagesData } = useQuery({
    queryKey: ['chat-messages', selectedRoom],
    queryFn: () => selectedRoom ? apiClient.getChatMessages(selectedRoom, 1, 50) : null,
    enabled: !!selectedRoom && !!user
  })

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data: { salaId: string, contenido: string }) => 
      apiClient.sendMessage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', selectedRoom] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al enviar mensaje')
    }
  })

  // Socket connection and event handlers
  useEffect(() => {
    if (user) {
      socketClient.connect()
      
      // Join general room by default
      socketClient.joinGeneral()
      
      // Listen for new messages
      const handleNewMessage = (newMessage: SocketMessage) => {
        if (newMessage.salaId === selectedRoom) {
          setMessages(prev => [...prev, newMessage])
        }
      }

      socketClient.on('new-message', handleNewMessage)

      return () => {
        socketClient.off('new-message', handleNewMessage)
        socketClient.disconnect()
      }
    }
  }, [user, selectedRoom])

  // Update messages when data changes
  useEffect(() => {
    if (messagesData?.data) {
      setMessages(messagesData.data.reverse()) // Reverse to show newest at bottom
    }
  }, [messagesData])

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Select first room by default
  useEffect(() => {
    if (roomsData?.data && roomsData.data.length > 0 && !selectedRoom) {
      setSelectedRoom(roomsData.data[0].id)
    }
  }, [roomsData, selectedRoom])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !selectedRoom) return

    sendMessageMutation.mutate({
      salaId: selectedRoom,
      contenido: message.trim()
    })
    setMessage('')
  }

  const selectedRoomData = roomsData?.data?.find(room => room.id === selectedRoom)

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-400 hover:text-gray-500">
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">
                Chat Interno
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg overflow-hidden h-[600px] flex">
          {/* Sidebar - Chat Rooms */}
          <div className="w-1/3 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Salas de Chat</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {roomsData?.data?.map((room: ChatRoom) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room.id)}
                  className={`w-full text-left p-4 hover:bg-gray-50 border-b border-gray-100 ${
                    selectedRoom === room.id ? 'bg-primary/10 border-primary/20' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {room.tipo === 'GENERAL' ? (
                        <Hash className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Users className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {room.nombre}
                      </p>
                      <p className="text-xs text-gray-500">
                        {room.tipo === 'GENERAL' ? 'Chat general' : 'Sucursal'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col">
            {selectedRoom ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center">
                    {selectedRoomData?.tipo === 'GENERAL' ? (
                      <Hash className="h-5 w-5 text-gray-400 mr-2" />
                    ) : (
                      <Users className="h-5 w-5 text-gray-400 mr-2" />
                    )}
                    <h3 className="text-lg font-medium text-gray-900">
                      {selectedRoomData?.nombre}
                    </h3>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-gray-500">
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.usuarioId === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          msg.usuarioId === user.id
                            ? 'bg-primary text-white'
                            : 'bg-gray-200 text-gray-900'
                        }`}
                      >
                        {msg.usuarioId !== user.id && (
                          <p className="text-xs font-medium mb-1 opacity-75">
                            {msg.usuario?.nombre} {msg.usuario?.apellido}
                          </p>
                        )}
                        <p className="text-sm">{msg.contenido}</p>
                        <p className="text-xs mt-1 opacity-75">
                          {new Date(msg.createdAt).toLocaleTimeString('es-MX', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200">
                  <form onSubmit={handleSendMessage} className="flex space-x-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Escribe un mensaje..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary focus:border-primary"
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-500"
                      >
                        <Smile className="h-5 w-5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="p-2 text-gray-400 hover:text-gray-500"
                    >
                      <Paperclip className="h-5 w-5" />
                    </button>
                    <button
                      type="submit"
                      disabled={!message.trim() || sendMessageMutation.isPending}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Hash className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Selecciona una sala de chat</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
