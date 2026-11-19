import {
  AfterViewChecked, Component, DestroyRef, ElementRef, OnDestroy, OnInit, computed, inject, signal, viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ChatBubble, ChatConversation, ChatDayGroup, ChatDirectRequest, ChatMessage, ChatReadRequest, ChatServerEvent,
  ChatUser
} from '../../../../core/models/chat.model';
import { ApiService } from '../../../../core/services/api';
import { ChatSocketService } from '../../../../core/services/chat-socket';
import { ToastService } from '../../../../core/services/toast';
import { translateMainApiMessage } from '../../../../core/utils/api-messages';
import { errorMessage } from '../../../../core/utils/format';

const PAGE_SIZE = 50;
const MAX_LENGTH = 2000;
const TYPING_SEND_EVERY_MS = 3000;
const TYPING_SHOW_MS = 4000;

/** Aviso en la sala general cuando alguien entra o sale (no se guarda en la base). */
interface PresenceNotice {
  key: string;
  text: string;
  at: number;
}

/** Quién está escribiendo en cada conversación. */
interface TypingState {
  name: string;
  until: number;
}

// Chat en tiempo real (WebSocket): sala general para todos los conectados y chats privados.
// A la izquierda las conversaciones; a la derecha la conversación abierta y el formulario de envío.
@Component({
  selector: 'app-chat-page',
  templateUrl: './chat-page.html',
  styleUrl: './chat-page.css'
})
export class ChatPage implements OnInit, OnDestroy, AfterViewChecked {

  private api = inject(ApiService);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);
  readonly socket = inject(ChatSocketService);

  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private readonly composer = viewChild<ElementRef<HTMLTextAreaElement>>('composer');

  readonly maxLength = MAX_LENGTH;

  readonly loadingList = signal(true);
  readonly loadingMessages = signal(false);
  readonly listError = signal('');
  readonly conversations = signal<ChatConversation[]>([]);
  readonly activeId = signal<number | null>(null);
  readonly bubbles = signal<ChatBubble[]>([]);
  readonly hasMore = signal(false);
  readonly draft = signal('');
  readonly search = signal('');
  readonly contacts = signal<ChatUser[]>([]);
  readonly searchingContacts = signal(false);
  readonly showContacts = signal(false);
  readonly showOnline = signal(false);
  readonly mobileShowChat = signal(false);
  readonly notices = signal<PresenceNotice[]>([]);
  private readonly typing = signal<Record<number, Record<number, TypingState>>>({});
  private readonly now = signal(Date.now());

  private stickToBottom = true;
  private lastTypingSent = 0;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private clock: ReturnType<typeof setInterval> | null = null;
  private readonly onVisible = (): void => {
    if (document.visibilityState === 'visible') {
      this.markActiveRead();
    }
  };

  readonly me = this.socket.me;
  readonly status = this.socket.status;

  readonly active = computed(() => this.conversations().find(c => c.id === this.activeId()) ?? null);

  readonly filteredConversations = computed(() => {
    const term = normalize(this.search());
    return term ? this.conversations().filter(c => normalize(c.name).includes(term)) : this.conversations();
  });

  /** Mensajes agrupados por día, como en cualquier app de chat. */
  readonly groups = computed<ChatDayGroup[]>(() => {
    const groups: ChatDayGroup[] = [];
    for (const bubble of this.bubbles()) {
      const label = dayLabel(bubble.message.createdAt);
      const last = groups[groups.length - 1];
      if (last && last.label === label) {
        last.bubbles.push(bubble);
      } else {
        groups.push({ label, bubbles: [bubble] });
      }
    }
    return groups;
  });

  readonly onlineUsers = computed<ChatUser[]>(() => {
    const ids = this.socket.onlineIds();
    const known = new Map<number, ChatUser>();
    for (const c of this.conversations()) {
      if (c.otherUser) { known.set(c.otherUser.id, c.otherUser); }
    }
    for (const b of this.bubbles()) { known.set(b.message.sender.id, b.message.sender); }
    for (const u of this.contacts()) { known.set(u.id, u); }
    const me = this.me();
    if (me) { known.set(me.id, me); }
    return [...ids].map(id => known.get(id)).filter((u): u is ChatUser => !!u)
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  });

  readonly typingText = computed(() => {
    const id = this.activeId();
    const now = this.now();
    if (id == null) { return ''; }
    const names = Object.values(this.typing()[id] ?? {}).filter(t => t.until > now).map(t => firstName(t.name));
    if (!names.length) { return ''; }
    return names.length === 1 ? `${names[0]} está escribiendo…` : `${names.slice(0, 2).join(' y ')} están escribiendo…`;
  });

  readonly canSend = computed(() => this.socket.connected() && this.draft().trim().length > 0
    && this.draft().length <= MAX_LENGTH && this.active() !== null);

  ngOnInit(): void {
    this.socket.setPageActive(true);
    document.addEventListener('visibilitychange', this.onVisible);
    this.clock = setInterval(() => this.now.set(Date.now()), 1000);

    this.socket.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => this.onEvent(event));
    void this.loadConversations(true);
    void this.loadContacts('');
  }

  ngOnDestroy(): void {
    this.socket.setPageActive(false);
    void this.socket.refreshUnread();
    document.removeEventListener('visibilitychange', this.onVisible);
    if (this.clock) { clearInterval(this.clock); }
    if (this.searchTimer) { clearTimeout(this.searchTimer); }
  }

  ngAfterViewChecked(): void {
    const el = this.scroller()?.nativeElement;
    if (el && this.stickToBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }

  // ------------------------------------------------------------------ carga

  async loadConversations(selectFirst = false): Promise<void> {
    this.listError.set('');
    try {
      const list = (await this.api.get<ChatConversation[]>('/chat/conversations')).data;
      this.conversations.set(list);
      this.updateUnreadTotal();
      if (selectFirst && list.length && this.activeId() == null) {
        await this.select(list[0], false);
      }
    } catch (e) {
      this.listError.set(errorMessage(e));
    }
    this.loadingList.set(false);
  }

  async loadContacts(term: string): Promise<void> {
    this.searchingContacts.set(true);
    try {
      const q = encodeURIComponent(term.trim());
      this.contacts.set((await this.api.get<ChatUser[]>(`/chat/contacts?q=${q}`)).data);
    } catch {
      this.contacts.set([]);
    }
    this.searchingContacts.set(false);
  }

  async select(conversation: ChatConversation, showOnMobile = true): Promise<void> {
    this.activeId.set(conversation.id);
    this.showContacts.set(false);
    this.showOnline.set(false);
    this.notices.set([]);
    if (showOnMobile) { this.mobileShowChat.set(true); }
    this.bubbles.set([]);
    this.hasMore.set(false);
    this.stickToBottom = true;
    this.loadingMessages.set(true);
    try {
      const messages = (await this.api.get<ChatMessage[]>(
        `/chat/conversations/${conversation.id}/messages?limit=${PAGE_SIZE}`)).data;
      if (this.activeId() !== conversation.id) { return; }
      this.bubbles.set(messages.map(m => this.toBubble(m)));
      this.hasMore.set(messages.length === PAGE_SIZE);
      this.markActiveRead();
    } catch (e) {
      this.toast.show(errorMessage(e), 'error');
    }
    this.loadingMessages.set(false);
    setTimeout(() => this.composer()?.nativeElement.focus());
  }

  async loadOlder(): Promise<void> {
    const id = this.activeId();
    const first = this.bubbles().find(b => !b.pending);
    if (id == null || !first) { return; }
    const el = this.scroller()?.nativeElement;
    const previousHeight = el?.scrollHeight ?? 0;
    this.stickToBottom = false;
    this.loadingMessages.set(true);
    try {
      const older = (await this.api.get<ChatMessage[]>(
        `/chat/conversations/${id}/messages?limit=${PAGE_SIZE}&before=${first.message.id}`)).data;
      this.bubbles.update(list => [...older.map(m => this.toBubble(m)), ...list]);
      this.hasMore.set(older.length === PAGE_SIZE);
      setTimeout(() => { if (el) { el.scrollTop = el.scrollHeight - previousHeight; } });
    } catch (e) {
      this.toast.show(errorMessage(e), 'error');
    }
    this.loadingMessages.set(false);
  }

  async startDirect(user: ChatUser): Promise<void> {
    try {
      const body: ChatDirectRequest = { userId: user.id };
      const conv = (await this.api.post<ChatConversation>('/chat/direct', body)).data;
      this.conversations.update(list => list.some(c => c.id === conv.id) ? list : [list[0], conv, ...list.slice(1)]);
      this.search.set('');
      await this.select(conv);
    } catch (e) {
      this.toast.show(errorMessage(e), 'error');
    }
  }

  // ------------------------------------------------------------------ enviar

  send(): void {
    const conv = this.active();
    const me = this.me();
    const content = this.draft().trim();
    if (!conv || !me || !this.canSend()) { return; }
    const clientId = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    const ok = this.socket.send({ type: 'message', conversationId: conv.id, content, clientId });
    if (!ok) {
      this.toast.show('Sin conexión con el chat. Espera a que se reconecte.', 'error');
      return;
    }
    // Se muestra de inmediato como "enviando"; el servidor lo confirma con el mismo clientId
    const pending: ChatMessage = {
      id: 0, conversationId: conv.id, sender: me, content, createdAt: new Date().toISOString()
    };
    this.bubbles.update(list => [...list, { key: clientId, message: pending, mine: true, pending: true, failed: false }]);
    this.stickToBottom = true;
    this.draft.set('');
    const box = this.composer()?.nativeElement;
    if (box) { box.value = ''; }   // se limpia ya, sin esperar al siguiente ciclo de detección de cambios
    this.lastTypingSent = 0;
    this.resizeComposer();
  }

  retry(bubble: ChatBubble): void {
    this.bubbles.update(list => list.filter(b => b.key !== bubble.key));
    this.draft.set(bubble.message.content);
    this.send();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      this.send();
    }
  }

  onInput(value: string): void {
    this.draft.set(value);
    this.resizeComposer();
    const conv = this.active();
    const now = Date.now();
    if (conv && value.trim() && now - this.lastTypingSent > TYPING_SEND_EVERY_MS) {
      this.lastTypingSent = now;
      this.socket.send({ type: 'typing', conversationId: conv.id });
    }
  }

  onSearch(value: string): void {
    this.search.set(value);
    if (this.searchTimer) { clearTimeout(this.searchTimer); }
    this.searchTimer = setTimeout(() => void this.loadContacts(value), 300);
  }

  onScroll(): void {
    const el = this.scroller()?.nativeElement;
    if (el) {
      this.stickToBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    }
  }

  backToList(): void {
    this.mobileShowChat.set(false);
  }

  // ------------------------------------------------------------------ eventos del WebSocket

  private onEvent(event: ChatServerEvent): void {
    switch (event.type) {
      case 'ready':
        // (Re)conectado: se recarga por si llegaron mensajes mientras estaba caído
        void this.loadConversations().then(() => {
          const conv = this.active();
          if (conv) { void this.refreshActive(conv.id); }
        });
        break;

      case 'message':
        this.onMessage(event.message, event.clientId);
        break;

      case 'presence': {
        this.conversations.update(list => list.map(c => c.otherUser?.id === event.user.id
          ? { ...c, otherUser: { ...c.otherUser, online: event.online } } : c));
        if (event.user.id !== this.me()?.id) {
          this.notices.update(n => [...n.slice(-4), {
            key: `${event.user.id}-${Date.now()}`, at: Date.now(),
            text: `${event.user.fullName} ${event.online ? 'se conectó' : 'se desconectó'}`
          }]);
          setTimeout(() => this.notices.update(n => n.filter(x => Date.now() - x.at < 6000)), 6500);
        }
        break;
      }

      case 'typing':
        this.typing.update(all => ({
          ...all,
          [event.conversationId]: {
            ...(all[event.conversationId] ?? {}),
            [event.user.id]: { name: event.user.fullName, until: Date.now() + TYPING_SHOW_MS }
          }
        }));
        break;

      case 'read':
        if (event.userId !== this.me()?.id) {
          this.conversations.update(list => list.map(c => c.id === event.conversationId
            ? { ...c, otherLastReadId: Math.max(c.otherLastReadId, event.messageId) } : c));
        }
        break;

      case 'error': {
        const text = translateMainApiMessage(event.message);
        if (event.clientId) {
          this.bubbles.update(list => list.map(b => b.key === event.clientId
            ? { ...b, pending: false, failed: true, error: text } : b));
        } else {
          this.toast.show(text, 'error');
        }
        break;
      }

      default:
        break;
    }
  }

  private onMessage(message: ChatMessage, clientId: string | null): void {
    const mine = message.sender.id === this.me()?.id;
    const known = this.conversations().some(c => c.id === message.conversationId);
    if (!known) {
      void this.loadConversations();   // primer mensaje de un chat privado nuevo
      return;
    }
    const isActive = message.conversationId === this.activeId();
    const visible = isActive && document.visibilityState === 'visible';

    this.conversations.update(list => {
      const updated = list.map(c => c.id !== message.conversationId ? c : {
        ...c,
        lastMessage: message,
        unread: mine || visible ? 0 : c.unread + 1,
        lastReadId: mine || visible ? message.id : c.lastReadId
      });
      // Los privados con actividad suben (la sala general siempre va primero)
      const general = updated.filter(c => c.type === 'GENERAL');
      const directs = updated.filter(c => c.type === 'DIRECT')
        .sort((a, b) => (b.lastMessage?.id ?? 0) - (a.lastMessage?.id ?? 0));
      return [...general, ...directs];
    });
    this.updateUnreadTotal();

    // ya no está escribiendo
    this.typing.update(all => {
      const conv = { ...(all[message.conversationId] ?? {}) };
      delete conv[message.sender.id];
      return { ...all, [message.conversationId]: conv };
    });

    if (!isActive) {
      return;
    }
    const bubble = this.toBubble(message);
    this.bubbles.update(list => {
      if (clientId && list.some(b => b.key === clientId)) {
        return list.map(b => b.key === clientId ? bubble : b);   // confirma el mensaje "enviando"
      }
      return list.some(b => b.message.id === message.id) ? list : [...list, bubble];
    });
    if (visible && !mine) {
      this.sendRead(message.conversationId, message.id);
    }
  }

  private async refreshActive(conversationId: number): Promise<void> {
    try {
      const messages = (await this.api.get<ChatMessage[]>(
        `/chat/conversations/${conversationId}/messages?limit=${PAGE_SIZE}`)).data;
      if (this.activeId() === conversationId) {
        const pending = this.bubbles().filter(b => b.pending || b.failed);
        this.bubbles.set([...messages.map(m => this.toBubble(m)), ...pending]);
        this.markActiveRead();
      }
    } catch {
      /* se intentará en la próxima reconexión */
    }
  }

  // ------------------------------------------------------------------ leídos

  private markActiveRead(): void {
    const conv = this.active();
    const last = [...this.bubbles()].reverse().find(b => !b.pending && !b.failed);
    if (!conv || !last || document.visibilityState !== 'visible') { return; }
    if (conv.unread > 0 || last.message.id > conv.lastReadId) {
      this.sendRead(conv.id, last.message.id);
    }
  }

  private sendRead(conversationId: number, messageId: number): void {
    this.conversations.update(list => list.map(c => c.id === conversationId
      ? { ...c, unread: 0, lastReadId: Math.max(c.lastReadId, messageId) } : c));
    this.updateUnreadTotal();
    if (!this.socket.send({ type: 'read', conversationId, messageId })) {
      const body: ChatReadRequest = { messageId };
      void this.api.post<number>(`/chat/conversations/${conversationId}/read`, body).catch(() => undefined);
    }
  }

  private updateUnreadTotal(): void {
    this.socket.setUnreadTotal(this.conversations().reduce((sum, c) => sum + c.unread, 0));
  }

  // ------------------------------------------------------------------ ayudas para la plantilla

  private toBubble(message: ChatMessage): ChatBubble {
    return { key: `m${message.id}`, message, mine: message.sender.id === this.me()?.id, pending: false, failed: false };
  }

  private resizeComposer(): void {
    const el = this.composer()?.nativeElement;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
    }
  }

  isOnline(user: ChatUser | null): boolean {
    return !!user && this.socket.isOnline(user.id);
  }

  initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
  }

  avatarColor(id: number): string {
    const palette = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
    return palette[Math.abs(id) % palette.length];
  }

  time(value: string): string {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  }

  listTime(value: string | undefined): string {
    if (!value) { return ''; }
    const d = new Date(value);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) { return this.time(value); }
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) { return 'Ayer'; }
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  }

  preview(conv: ChatConversation): string {
    const last = conv.lastMessage;
    if (!last) { return conv.type === 'GENERAL' ? 'Todos los conectados' : 'Sin mensajes todavía'; }
    const who = last.sender.id === this.me()?.id ? 'Tú' : (conv.type === 'GENERAL' ? firstName(last.sender.fullName) : '');
    return who ? `${who}: ${last.content}` : last.content;
  }

  /** «Visto» bajo el último mensaje propio que la otra persona ya leyó (solo chats privados). */
  seen(bubble: ChatBubble): boolean {
    const conv = this.active();
    if (!conv || conv.type !== 'DIRECT' || !bubble.mine || bubble.pending) { return false; }
    const lastMine = [...this.bubbles()].reverse().find(b => b.mine && !b.pending && !b.failed);
    return lastMine?.key === bubble.key && conv.otherLastReadId >= bubble.message.id;
  }

  /** En la sala general se muestra el nombre cuando cambia el autor. */
  showSender(group: ChatDayGroup, index: number): boolean {
    const conv = this.active();
    const bubble = group.bubbles[index];
    if (!conv || conv.type !== 'GENERAL' || bubble.mine) { return false; }
    return index === 0 || group.bubbles[index - 1].message.sender.id !== bubble.message.sender.id;
  }

  statusText(): string {
    switch (this.status()) {
      case 'open': return 'Conectado';
      case 'connecting': return 'Conectando…';
      case 'reconnecting': return 'Reconectando…';
      case 'unauthorized': return 'Sesión vencida';
      case 'forbidden': return 'Sin acceso';
      default: return 'Desconectado';
    }
  }

  headerSubtitle(): string {
    const conv = this.active();
    if (!conv) { return ''; }
    if (this.typingText()) { return this.typingText(); }
    if (conv.type === 'GENERAL') {
      const n = this.socket.onlineIds().size;
      return `${n} ${n === 1 ? 'persona conectada' : 'personas conectadas'}`;
    }
    return this.isOnline(conv.otherUser) ? 'En línea' : `${conv.otherUser?.role ?? ''} · desconectado`;
  }
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function firstName(name: string): string {
  return name.split(/\s+/)[0] ?? name;
}

function dayLabel(value: string): string {
  const d = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) { return 'Hoy'; }
  if (d.toDateString() === yesterday.toDateString()) { return 'Ayer'; }
  return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
}
