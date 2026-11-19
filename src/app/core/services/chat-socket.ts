import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { MAIN_API } from '../config';
import {
  ChatClientEvent, ChatConnectionStatus, ChatConversation, ChatServerEvent, ChatUser
} from '../models/chat.model';
import { ApiService } from './api';
import { AuthService } from './auth';
import { PermissionsService } from './permissions';

const HEARTBEAT_MS = 25000;       // ping cada 25 s: mantiene viva la conexión (Render corta las inactivas)
const PONG_TIMEOUT_MS = 10000;    // si el pong no llega en 10 s, la conexión está muerta: se reconecta
const MAX_BACKOFF_MS = 15000;

/**
 * Conexión WebSocket del chat, una sola para toda la aplicación.
 * - Se abre al iniciar sesión (si el rol tiene el módulo Chat) y se cierra al salir.
 * - Autentica enviando el token en el PRIMER mensaje (no en la URL, que queda en los registros).
 * - Se reconecta sola con espera creciente (1 s, 2 s, 4 s… hasta 15 s) y al volver el internet.
 * - Los componentes escuchan `events` y leen `status`, `onlineIds` y `me`.
 */
@Injectable({ providedIn: 'root' })
export class ChatSocketService {

  private auth = inject(AuthService);
  private api = inject(ApiService);
  private permissions = inject(PermissionsService);

  private ws: WebSocket | null = null;
  private wanted = false;
  private attempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private pingSentAt = 0;
  private pageActive = false;

  private readonly _status = signal<ChatConnectionStatus>('idle');
  private readonly _online = signal<ReadonlySet<number>>(new Set<number>());
  private readonly _me = signal<ChatUser | null>(null);
  private readonly _latency = signal<number | null>(null);
  private readonly _unread = signal(0);

  readonly status = this._status.asReadonly();
  readonly onlineIds = this._online.asReadonly();
  readonly me = this._me.asReadonly();
  readonly latencyMs = this._latency.asReadonly();
  readonly connected = computed(() => this._status() === 'open');
  /** Total de mensajes sin leer (lo actualiza la página de chat; se muestra en el menú). */
  readonly unreadTotal = this._unread.asReadonly();

  /** Todos los eventos que llegan del servidor. */
  readonly events = new Subject<ChatServerEvent>();

  private readonly onBrowserOnline = (): void => {
    if (this.wanted && this._status() !== 'open') {
      this.attempts = 0;
      this.open();
    }
  };

  constructor() {
    window.addEventListener('online', this.onBrowserOnline);

    // Conectar o desconectar según la sesión y el permiso del módulo Chat
    effect(() => {
      const logged = this.auth.logged();
      const allowed = this.permissions.can('/chat');
      if (logged && allowed) {
        this.start();
      } else {
        this.stop();
      }
    });
  }

  start(): void {
    if (this.wanted) {
      return;
    }
    this.wanted = true;
    this.attempts = 0;
    this.open();
  }

  stop(): void {
    this.wanted = false;
    this.clearTimers();
    if (this.ws) {
      this.ws.close(1000, 'logout');
      this.ws = null;
    }
    this._status.set('idle');
    this._online.set(new Set<number>());
    this._me.set(null);
    this._unread.set(0);
  }

  /** Reintento manual (botón "Reconectar"). */
  reconnect(): void {
    this.wanted = true;
    this.attempts = 0;
    this.ws?.close(4000, 'manual');
    this.ws = null;
    this.open();
  }

  /** Envía un evento; false si no hay conexión. */
  send(event: ChatClientEvent): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN || (event.type !== 'auth' && this._status() !== 'open')) {
      return false;
    }
    this.ws.send(JSON.stringify(event));
    return true;
  }

  /** La página de chat avisa cuando está abierta: mientras tanto ella calcula los no leídos. */
  setPageActive(active: boolean): void {
    this.pageActive = active;
  }

  setUnreadTotal(total: number): void {
    this._unread.set(Math.max(0, total));
  }

  isOnline(userId: number | null | undefined): boolean {
    return userId != null && this._online().has(userId);
  }

  /** Suma los no leídos de todas las conversaciones (para el contador del menú). */
  async refreshUnread(): Promise<void> {
    try {
      const list = (await this.api.get<ChatConversation[]>('/chat/conversations')).data;
      this._unread.set(list.reduce((sum, c) => sum + c.unread, 0));
    } catch {
      /* el contador es solo informativo */
    }
  }

  // ------------------------------------------------------------------------------------------

  private socketUrl(): string {
    const base = MAIN_API.baseUrl.replace(/\/+$/, '');
    const absolute = /^https?:\/\//i.test(base) ? base : `${location.origin}${base}`;
    return absolute.replace(/^http/i, 'ws') + '/ws/chat';
  }

  private open(): void {
    const token = this.auth.token();
    if (!this.wanted || !token) {
      return;
    }
    this.clearTimers();
    this._status.set(this.attempts === 0 ? 'connecting' : 'reconnecting');

    let socket: WebSocket;
    try {
      socket = new WebSocket(this.socketUrl());
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'auth', token } satisfies ChatClientEvent));
    };

    socket.onmessage = (raw: MessageEvent<string>) => {
      let event: ChatServerEvent;
      try {
        event = JSON.parse(raw.data) as ChatServerEvent;
      } catch {
        return;
      }
      this.handle(event);
      this.events.next(event);
    };

    socket.onclose = (closeEvent: CloseEvent) => {
      if (this.ws !== socket) {
        return;   // es un socket viejo (ya se abrió otro)
      }
      this.ws = null;
      this.clearTimers();
      this._online.set(new Set<number>());
      if (closeEvent.code === 4401) {
        this._status.set('unauthorized');
        this.wanted = false;
        return;
      }
      if (closeEvent.code === 4403) {
        this._status.set('forbidden');
        this.wanted = false;
        return;
      }
      this.scheduleReconnect();
    };
  }

  private handle(event: ChatServerEvent): void {
    switch (event.type) {
      case 'ready':
        this.attempts = 0;
        this._me.set(event.user);
        this._online.set(new Set(event.onlineUserIds));
        this._status.set('open');
        this.startHeartbeat();
        if (!this.pageActive) {
          void this.refreshUnread();
        }
        break;
      case 'message':
        if (!this.pageActive && event.message.sender.id !== this._me()?.id) {
          this._unread.update(n => n + 1);   // aviso en el menú aunque no esté en la página de chat
        }
        break;
      case 'presence':
        this._online.set(new Set(event.onlineUserIds));
        break;
      case 'pong':
        if (this.pongTimer) {
          clearTimeout(this.pongTimer);
          this.pongTimer = null;
        }
        this._latency.set(Math.round(performance.now() - this.pingSentAt));
        break;
      default:
        break;
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (!this.send({ type: 'ping' })) {
        return;
      }
      this.pingSentAt = performance.now();
      this.pongTimer = setTimeout(() => this.ws?.close(4000, 'pong timeout'), PONG_TIMEOUT_MS);
    }, HEARTBEAT_MS);
  }

  private scheduleReconnect(): void {
    if (!this.wanted) {
      this._status.set('idle');
      return;
    }
    this._status.set('reconnecting');
    const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** this.attempts);
    this.attempts++;
    this.reconnectTimer = setTimeout(() => this.open(), delay);
  }

  private clearTimers(): void {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
    if (this.pongTimer) { clearTimeout(this.pongTimer); this.pongTimer = null; }
  }
}
