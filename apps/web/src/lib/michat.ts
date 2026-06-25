// ============================================================
// DOMANI — Michat: contenido y lógica de conversaciones (compartido).
// Lo usan tanto la pantalla completa (MichatScreen) como la burbuja
// flotante (FloatingMichat). No es un backend de chat: las conversaciones
// se arman con el estado real del ciudadano y "el mundo te conoce".
// ============================================================
import type { Loan } from './api';

const fmt = (n: number) => n.toLocaleString('es-CO');

export type Bubble = {
  from: 'them' | 'me';
  text: string;
  time: string;
  action?: { label: string; to: string };
};

export type QuickReply = {
  label: string;   // lo que el jugador ve en el chip
  reply: string;   // burbuja del jugador al tocarlo
  follow: string;  // respuesta del personaje
  action?: { label: string; to: string };
};

export type Conversation = {
  id: string;
  name: string;
  avatar: string;
  accent: string;
  preview: string;
  time: string;
  unread?: number;
  messages: Bubble[];
  quickReplies?: QuickReply[];
};

export type MichatCtx = {
  alias: string;
  balance: number;
  influence: number;
  houseName: string;
  loan: Loan | null;
};

export function buildConversations(c: MichatCtx): Conversation[] {
  const haciendaMsgs: Bubble[] = [
    { from: 'them', text: `Le saluda la Hacienda de Domani, ${c.alias}.`, time: '18:40' },
  ];
  if (c.loan) {
    haciendaMsgs.push({
      from: 'them',
      text: `Registra un crédito activo por ⟡ ${fmt(c.loan.outstanding)}, con vencimiento el ${c.loan.due_date}. Le conviene abonar a tiempo.`,
      time: '18:41',
      action: { label: 'Ir a pagar', to: '/banco' },
    });
  } else {
    haciendaMsgs.push({
      from: 'them',
      text: `Su cuenta está al día: saldo de ⟡ ${fmt(c.balance)} y sin deudas. Si necesita liquidez, tiene línea de crédito en Domanibank.`,
      time: '18:41',
      action: { label: 'Ver Domanibank', to: '/banco' },
    });
  }

  return [
    {
      id: 'bienvenida',
      name: 'Domani · Bienvenida',
      avatar: 'D',
      accent: 'linear-gradient(135deg,#c9a35b,#a8843f)',
      preview: `Bienvenido, ${c.alias}. Aquí empieza todo…`,
      time: '09:12',
      unread: 1,
      messages: [
        { from: 'them', text: `Bienvenido a Domani, ${c.alias}. Has cruzado la entrada del Círculo.`, time: '09:10' },
        { from: 'them', text: 'Desde tu Escritorio entras a la Sala de Juegos, a Domanibank, al concurso Millonaurelios y a tu Casa. Todo a un toque.', time: '09:11' },
        { from: 'them', text: 'Reclama tu Renta a diario y construye tu Influencia. La ciudad recompensa a los constantes.', time: '09:12' },
      ],
      quickReplies: [
        {
          label: '¿Por dónde empiezo?',
          reply: '¿Por dónde empiezo?',
          follow: 'Juega una mano en la Sala de Juegos o intenta el concurso del día. Ambos te dejan Aurelios.',
          action: { label: 'Concursar', to: '/millonaurelios' },
        },
        {
          label: '¿Qué son los Aurelios?',
          reply: '¿Qué son los Aurelios?',
          follow: 'Son la moneda de fantasía de Domani. No tienen valor real ni se canjean por dinero: son para vivir el mundo.',
        },
      ],
    },
    {
      id: 'hacienda',
      name: 'Hacienda',
      avatar: 'H',
      accent: 'linear-gradient(135deg,#5b7fc9,#3f5aa8)',
      preview: c.loan ? `Tienes un crédito de ⟡ ${fmt(c.loan.outstanding)} por pagar…` : 'Su cuenta está al día. Buen juego.',
      time: 'Ayer',
      unread: c.loan ? 1 : undefined,
      messages: haciendaMsgs,
      quickReplies: [
        {
          label: '¿Cómo subo mi cupo?',
          reply: '¿Cómo subo mi cupo de crédito?',
          follow: 'Su cupo crece con su saldo y su Influencia. Gane manos, acierte en el concurso y suba de rango.',
        },
      ],
    },
    {
      id: 'lucia',
      name: 'Lucía',
      avatar: 'L',
      accent: 'linear-gradient(135deg,#c95b8e,#a83f6a)',
      preview: '¿Te animas a una mano de Texas esta noche?',
      time: '21:05',
      unread: 2,
      messages: [
        { from: 'them', text: `¡Hola, ${c.alias}! Soy Lucía, de la mesa de Texas.`, time: '21:03' },
        { from: 'them', text: 'Hay sillas libres y la noche está movida. ¿Te animas a una mano de Texas Hold’em?', time: '21:04', action: { label: 'Ir a la mesa', to: '/casino' } },
      ],
      quickReplies: [
        {
          label: 'Voy en camino',
          reply: 'Voy en camino, guárdame la silla.',
          follow: 'Hecho. Te espero en la mesa, no tardes que se llena.',
          action: { label: 'Entrar a la Sala', to: '/casino' },
        },
        {
          label: 'Hoy no, gracias',
          reply: 'Hoy no, gracias.',
          follow: 'Tranquilo. Cuando quieras revancha, ya sabes dónde encontrarme.',
        },
      ],
    },
    {
      id: 'concurso',
      name: 'Millonaurelios',
      avatar: 'M',
      accent: 'linear-gradient(135deg,#d8a93f,#a8843f)',
      preview: 'El atril está listo. ¿Juegas el concurso de hoy?',
      time: 'Hoy',
      unread: 1,
      messages: [
        { from: 'them', text: `${c.alias}, el concurso del día está abierto.`, time: '12:00' },
        { from: 'them', text: 'Doce escalones, dificultad creciente y pisos garantizados. Una partida por día.', time: '12:00', action: { label: 'Jugar ahora', to: '/millonaurelios' } },
      ],
      quickReplies: [
        {
          label: '¿Cuánto puedo ganar?',
          reply: '¿Cuánto puedo ganar?',
          follow: 'Hasta ⟡ 1.000.000 si llegas a la cima. Y aseguras ⟡ 5.000 en el escalón 4 y ⟡ 80.000 en el 8.',
          action: { label: 'Ir al concurso', to: '/millonaurelios' },
        },
      ],
    },
    {
      id: 'times',
      name: 'Domani Times',
      avatar: 'T',
      accent: 'linear-gradient(135deg,#4f9d6b,#2f6b48)',
      preview: `${c.houseName} en boca de todos esta semana`,
      time: 'Hoy',
      messages: [
        { from: 'them', text: 'DOMANI TIMES — Edición de la noche', time: '20:00' },
        { from: 'them', text: `Titular: ${c.houseName} suena fuerte entre las Casas activas de la semana. Los analistas siguen de cerca su Influencia.`, time: '20:00' },
        { from: 'them', text: 'En breve: rumores sobre la apertura de El Mercado. El Círculo guarda silencio.', time: '20:01' },
      ],
    },
  ];
}

export function totalUnread(convs: Conversation[]): number {
  return convs.reduce((s, c) => s + (c.unread ?? 0), 0);
}
