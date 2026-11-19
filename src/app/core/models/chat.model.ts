// Chat en tiempo real: REST /chat/* (historial, conversaciones, contactos) y WebSocket /ws/chat.

/** GENERAL = sala de todos los conectados; DIRECT = chat privado entre dos usuarios. */
export type ChatConversationType = 'GENERAL' | 'DIRECT';

/** Estado de la conexión WebSocket que se muestra en pantalla. */
export type ChatConnectionStatus =
  | 'idle'          // aún no se ha conectado (o se cerró la sesión)
  | 'connecting'    // abriendo el socket y autenticando
  | 'open'          // conectado y autenticado
  | 'reconnecting'  // se cayó: reintentando con espera creciente
  | 'unauthorized'  // token inválido o vencido (código 4401)
  | 'forbidden';    // el rol no tiene el módulo Chat (código 4403)

/** Usuario visible en el chat. */
export interface ChatUser {
  id: number;
  fullName: string;
  role: string;
  online: boolean;
}

/** Mensaje guardado en la base de datos. */
export interface ChatMessage {
  id: number;
  conversationId: number;
  sender: ChatUser;
  content: string;
  createdAt: string;
}

/** Conversación de la lista de la izquierda. */
export interface ChatConversation {
  id: number;
  type: ChatConversationType;
  name: string;
  otherUser: ChatUser | null;
  lastMessage: ChatMessage | null;
  unread: number;
  lastReadId: number;
  otherLastReadId: number;
  onlineCount: number;
}

/** Mensaje que se muestra en la conversación: el guardado o uno propio que aún no confirma el servidor. */
export interface ChatBubble {
  key: string;            // id del mensaje o clientId mientras está pendiente
  message: ChatMessage;
  mine: boolean;
  pending: boolean;
  failed: boolean;
  error?: string;
}

/** Bloque de mensajes del mismo día (separador "Hoy", "Ayer", fecha). */
export interface ChatDayGroup {
  label: string;
  bubbles: ChatBubble[];
}

/** POST /chat/direct */
export interface ChatDirectRequest {
  userId: number;
}

/** POST /chat/conversations/{id}/read */
export interface ChatReadRequest {
  messageId: number;
}

// ---------------------------------------------------------------------------------------------
// Eventos del WebSocket (uniones discriminadas por "type": TypeScript sabe qué campos trae cada uno)
// ---------------------------------------------------------------------------------------------

export interface ChatAuthEvent { type: 'auth'; token: string; }
export interface ChatSendEvent { type: 'message'; conversationId: number; content: string; clientId: string; }
export interface ChatTypingSendEvent { type: 'typing'; conversationId: number; }
export interface ChatReadSendEvent { type: 'read'; conversationId: number; messageId: number; }
export interface ChatPingEvent { type: 'ping'; }

/** Lo que el navegador envía al servidor. */
export type ChatClientEvent = ChatAuthEvent | ChatSendEvent | ChatTypingSendEvent | ChatReadSendEvent | ChatPingEvent;

export interface ChatReadyEvent { type: 'ready'; user: ChatUser; onlineUserIds: number[]; }
export interface ChatMessageEvent { type: 'message'; message: ChatMessage; clientId: string | null; }
export interface ChatPresenceEvent { type: 'presence'; user: ChatUser; online: boolean; onlineUserIds: number[]; }
export interface ChatTypingEvent { type: 'typing'; conversationId: number; user: ChatUser; }
export interface ChatReadEvent { type: 'read'; conversationId: number; userId: number; messageId: number; }
export interface ChatPongEvent { type: 'pong'; }
export interface ChatErrorEvent { type: 'error'; code: string; message: string; clientId?: string; }

/** Lo que el servidor envía al navegador. */
export type ChatServerEvent =
  | ChatReadyEvent | ChatMessageEvent | ChatPresenceEvent | ChatTypingEvent | ChatReadEvent | ChatPongEvent
  | ChatErrorEvent;
