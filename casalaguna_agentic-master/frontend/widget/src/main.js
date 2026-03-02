// ============ CONFIGURACIÓN DEL API ============
const API_BASE_URL = window.WIDGET_API_URL || "http://localhost:8000";

const chatContainer = document.getElementById("chat-container");
const chat = document.getElementById("chat");
const input = document.getElementById("input");
const toggleBtn = document.getElementById("chat-toggle");
const closeBtn = document.querySelector(".close-btn");
const langBtn = document.getElementById("lang-btn");
const actionsToggleBtn = document.getElementById("actions-toggle");
let langDropdown = document.getElementById("lang-dropdown");

// ============ ERROR HANDLER GLOBAL ============
window.addEventListener('error', (event) => {
  console.error("❌ Error global capturado:", event.error);
  event.preventDefault();
});

window.addEventListener('unhandledrejection', (event) => {
  console.error("❌ Promise rechazada no manejada:", event.reason);
  event.preventDefault();
});

// Language greetings
const greetings = {
  es: "Hola, soy Abigail 👩‍🍳<br>¿En qué puedo ayudarte hoy?",
  en: "Hi, I'm Abigail 👩‍🍳<br>How can I help you today?",
  fr: "Bonjour, je m'appelle Abigail 👩‍🍳<br>Comment puis-je vous aider?",
  pt: "Olá, meu nome é Abigail 👩‍🍳<br>Como posso ajudá-lo hoje?"
};

const placeholders = {
  es: "Escribe tu mensaje…",
  en: "Type your message…",
  fr: "Écrivez votre message…",
  pt: "Digite sua mensagem…"
};

// Mensajes del menú después de desplegarlo
const menuMessages = {
  es: "¿Qué te ha parecido nuestro menú? 🍽️✨<br>Si deseas información sobre algún platillo en particular, con gusto puedo ayudarte.",
  en: "What did you think of our menu? 🍽️✨<br>If you'd like information about any particular dish, I'd be happy to help you.",
  fr: "Qu'avez-vous pensé de notre menu ? 🍽️✨<br>Si vous souhaitez des informations sur un plat en particulier, je serais ravie de vous aider.",
  pt: "O que achou do nosso menu? 🍽️✨<br>Se desejar informações sobre algum prato em particular, ficarei feliz em ajudá-lo."
};

// Mensajes de horario de apertura
const openingHoursMessages = {
  es: "Casa Laguna abre todos los días de 6:00 a 23:00 hrs. ⏰<br>Nuestra cocina ofrece servicio hasta las 23:30 hrs, y la última hora para realizar reservaciones es a las 23:00 hrs. 🍽️📅<br><br>En días festivos, los horarios pueden variar. Si deseas confirmar disponibilidad, con gusto te ayudo. 🕒",
  en: "Casa Laguna is open every day from 6:00 to 23:00 hrs. ⏰<br>Our kitchen offers service until 23:30 hrs, and the last time to make reservations is at 23:00 hrs. 🍽️📅<br><br>On holidays, hours may vary. If you want to confirm availability, I'm happy to help. 🕒",
  fr: "Casa Laguna est ouvert tous les jours de 6h00 à 23h00. ⏰<br>Notre cuisine offre un service jusqu'à 23h30, et la dernière heure pour les réservations est 23h00. 🍽️📅<br><br>Les jours fériés, les horaires peuvent varier. Si vous souhaitez confirmer la disponibilité, je serais ravi de vous aider. 🕒",
  pt: "Casa Laguna abre todos os dias das 6:00 às 23:00 hrs. ⏰<br>Nossa cozinha oferece serviço até 23:30 hrs, e o último horário para reservas é 23:00 hrs. 🍽️📅<br><br>Nos dias festivos, os horários podem variar. Se deseja confirmar disponibilidade, fico feliz em ajudar. 🕒"
};

// Mensajes de eventos
const eventsMessages = {
  es: "En Casa Laguna celebramos fechas especiales durante todo el año 🎉<br>Contamos con eventos temáticos en ocasiones como Día del Padre, Día de la Madre, San Valentín, 15 de septiembre, Navidad y Año Nuevo.<br><br>Además, puedes agendar tu propio evento privado con nosotros, ya sea una celebración, reunión o fiesta especial. 🎈",
  en: "At Casa Laguna we celebrate special dates throughout the year 🎉<br>We have themed events on occasions like Father's Day, Mother's Day, Valentine's Day, September 15th, Christmas and New Year.<br><br>Additionally, you can schedule your own private event with us, whether it's a celebration, meeting or special party. 🎈",
  fr: "À Casa Laguna, nous célébrons les dates spéciales tout au long de l'année 🎉<br>Nous avons des événements à thème à des occasions comme la Fête des Pères, la Fête des Mères, la Saint-Valentin, le 15 septembre, Noël et le Jour de l'An.<br><br>De plus, vous pouvez programmer votre propre événement privé avec nous, qu'il s'agisse d'une célébration, d'une réunion ou d'une fête spéciale. 🎈",
  pt: "Na Casa Laguna celebramos datas especiais ao longo do ano 🎉<br>Temos eventos temáticos em ocasiões como Dia dos Pais, Dia das Mães, Dia de São Valentim, 15 de setembro, Natal e Ano Novo.<br><br>Além disso, você pode agendar seu próprio evento privado conosco, seja uma celebração, reunião ou festa especial. 🎈"
};

// Mensajes de feedback
const feedbackMessages = {
  es: "¿He respondido tu pregunta?",
  en: "Have I answered your question?",
  fr: "Ai-je répondu à votre question ?",
  pt: "Respondi à sua pergunta?"
};

const positiveFeedbackMessages = {
  es: "Excelente ✨ ¿Hay algo más en lo que pueda ayudarte hoy?",
  en: "Excellent ✨ Is there anything else I can help you with today?",
  fr: "Excellent ✨ Y a-t-il autre chose pour laquelle je peux vous aider aujourd'hui ?",
  pt: "Excelente ✨ Há algo mais em que posso ajudá-lo hoje?"
};

// Mensajes para segunda pregunta (contacto con personal)
const supportContactMessages = {
  es: "¿Deseas que te enlace con personal del restaurante para brindarte apoyo personalizado?",
  en: "Would you like me to connect you with restaurant staff for personalized support?",
  fr: "Souhaitez-vous que je vous mette en contact avec le personnel du restaurant pour un soutien personnalisé ?",
  pt: "Gostaria que o conectasse com a equipe do restaurante para suporte personalizado?"
};

const transferringMessages = {
  es: "Entendido 🤝 Un agente del restaurante se pondrá en contacto contigo pronto. ¡Gracias por tu paciencia!",
  en: "Understood 🤝 A restaurant agent will contact you shortly. Thank you for your patience!",
  fr: "Entendu 🤝 Un agent du restaurant vous contactera bientôt. Merci de votre patience !",
  pt: "Entendido 🤝 Um agente do restaurante entrará em contato em breve. Obrigado pela sua paciência!"
};

let currentLanguage = localStorage.getItem("chatLanguage") || "es";

// El session_id se generará cuando se abra el chat, no al cargar la página
// Limpiar cualquier ID previo del sessionStorage
try {
  sessionStorage.removeItem('casalaguna_session_user_id');
} catch (e) {
  // En caso de que sessionStorage no esté disponible
}

console.log('🔵 Widget cargado - No hay session_id aún');

/* =========================
   USUARIO ID ÚNICO POR SESIÓN (NO PERSISTENTE)
========================= */
let isOpeningChat = false; // Bandera para control

function getOrCreateSessionUserId() {
  // IMPORTANTE: Esta función SOLO se llama desde openChat()
  if (!isOpeningChat) {
    console.error('❌ ERROR: getOrCreateSessionUserId() se llamó sin autorización');
    console.trace();
    return null;
  }
  
  // Generar siempre un nuevo UUID, sin consultar sessionStorage
  let userId;
  if (crypto && crypto.randomUUID) {
    userId = crypto.randomUUID();
  } else {
    userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }
  // Guardar en sessionStorage solo después de generar
  sessionStorage.setItem('casalaguna_session_user_id', userId);
  console.log('🆔 Nuevo usuario ID de sesión generado:', userId);
  return userId;
}

// El userId se genera cuando se abre el chat, no al cargar la página
let currentUserId = null;

/* =========================
   POLLING MENSAJES DE ADMIN + ESTADO HANDOFF
   (permite intervención aunque el usuario esté idle)
========================= */
let adminPollingTimer = null;
let currentHandoffState = 'bot_active';
let adminTypingEl = null; // Typing persistente mientras se espera respuesta del admin

function showHandoffBanner(state, adminName) {
  let banner = document.getElementById('handoff-banner');
  if (state === 'human_active') {
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'handoff-banner';
      // Insertar justo después del header
      const header = document.querySelector('.chat-header');
      if (header && header.nextSibling) {
        header.parentNode.insertBefore(banner, header.nextSibling);
      } else {
        chatContainer.prepend(banner);
      }
    }
    const adminLabel = adminName || 'Un administrador';
    banner.innerHTML = `<span class=\"handoff-dot\"></span> ${adminLabel} se ha unido a la conversación`;
    banner.className = 'handoff-banner human-active';
  } else if (state === 'closed') {
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'handoff-banner';
      const header = document.querySelector('.chat-header');
      if (header && header.nextSibling) {
        header.parentNode.insertBefore(banner, header.nextSibling);
      } else {
        chatContainer.prepend(banner);
      }
    }
    banner.innerHTML = '🔒 Conversación cerrada';
    banner.className = 'handoff-banner closed';
    // Deshabilitar input
    if (input) { input.disabled = true; input.placeholder = 'Conversación cerrada'; }
  } else {
    // bot_active — quitar banner si existe
    if (banner) { banner.remove(); }
    if (input) { input.disabled = false; input.placeholder = placeholders[currentLanguage]; }
  }
}

async function pollConversationStatus() {
  try {
    // Solo hacer polling si currentUserId está disponible
    if (!currentUserId) return;
    
    // 1. Obtener estado + mensajes de sistema
    const statusRes = await fetch(`${API_BASE_URL}/crm/conversations/${currentUserId}/status`);
    if (statusRes.ok) {
      const statusData = await statusRes.json();
      const newState = statusData.handoff_state || 'bot_active';

      if (newState !== currentHandoffState) {
        currentHandoffState = newState;
        showHandoffBanner(newState, statusData.assigned_admin);
      }
      // Mostrar mensajes de sistema pendientes
      if (statusData.system_messages && statusData.system_messages.length > 0) {
        for (const msg of statusData.system_messages) {
          addMessage(msg.content, 'system', false, false);
        }
      }
    }

    // 2. Obtener mensajes de admin pendientes
    const pendingRes = await fetch(`${API_BASE_URL}/crm/conversations/${currentUserId}/pending_messages`);
    if (pendingRes.ok) {
      const pendingData = await pendingRes.json();
      const pending = pendingData?.pending_messages || [];
      if (Array.isArray(pending) && pending.length > 0) {
        // Remover typing persistente al recibir mensaje del admin
        if (adminTypingEl) {
          adminTypingEl.remove();
          adminTypingEl = null;
        }
        for (const msg of pending) {
          if (msg?.content) {
            addMessage(msg.content, msg.role || 'admin', true, true);
          }
        }
      }
    }
  } catch (e) {
    // Silencioso
  }
}

function startAdminMessagePolling() {
  if (adminPollingTimer) return;
  pollConversationStatus();
  adminPollingTimer = setInterval(pollConversationStatus, 4000);
}

// Mostrar el user_id de sesión en la consola y en la interfaz para depuración
window.addEventListener('DOMContentLoaded', () => {
  let debugDiv = document.getElementById('debug-session-id');
  if (!debugDiv) {
    debugDiv = document.createElement('div');
    debugDiv.id = 'debug-session-id';
    debugDiv.style.position = 'fixed';
    debugDiv.style.bottom = '0';
    debugDiv.style.right = '0';
    debugDiv.style.background = 'rgba(0,0,0,0.7)';
    debugDiv.style.color = 'white';
    debugDiv.style.fontSize = '12px';
    debugDiv.style.padding = '4px 8px';
    debugDiv.style.zIndex = '9999';
    debugDiv.style.borderRadius = '6px 0 0 0';
    document.body.appendChild(debugDiv);
  }
  debugDiv.textContent = '[DEBUG] session_id: ' + (currentUserId || 'Sin generar aún');
});

// Mover dropdown fuera del chat-container para que sea siempre visible
function moveDropdownOutside() {
  const originalDropdown = document.getElementById("lang-dropdown");
  if (originalDropdown && originalDropdown.parentElement.id === "chat-container") {
    langDropdown = originalDropdown.cloneNode(true);
    document.body.appendChild(langDropdown);
    originalDropdown.remove();
  }
}

moveDropdownOutside();

/* =========================
   ABRIR / CERRAR CHAT
========================= */
toggleBtn.addEventListener("click", openChat);
closeBtn?.addEventListener("click", closeChat);
actionsToggleBtn.addEventListener("click", () => {
  showQuickActions();
});

/* =========================
   LANGUAGE SELECTOR
========================= */
langBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  langDropdown.classList.toggle("hidden");
  
  // Posicionar debajo del botón de idioma
  if (!langDropdown.classList.contains("hidden")) {
    const btnRect = langBtn.getBoundingClientRect();
    
    langDropdown.style.top = (btnRect.bottom + 8) + "px";
    langDropdown.style.left = (btnRect.left - 70) + "px"; // Centrar dropdown bajo botón
  }
});

langDropdown.addEventListener("click", (e) => {
  e.stopPropagation();
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".lang-btn") && !e.target.closest(".lang-dropdown")) {
    langDropdown.classList.add("hidden");
  }
});

document.querySelectorAll(".lang-option").forEach(btn => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const lang = btn.dataset.lang;
    changeLanguage(lang);
  });
});

function openChat() {
  // Generar el session_id solo cuando se abre el chat
  if (!currentUserId) {
    isOpeningChat = true;
    currentUserId = getOrCreateSessionUserId();
    isOpeningChat = false;
    
    console.log('[DEBUG] ID de sesión generado:', currentUserId);
    // Actualizar el debug div
    const debugDiv = document.getElementById('debug-session-id');
    if (debugDiv) {
      debugDiv.textContent = '[DEBUG] session_id: ' + currentUserId;
    }
    // Iniciar polling de mensajes de admin
    startAdminMessagePolling();
  }
  chatContainer.classList.remove("hidden");
  chatContainer.classList.remove("closing");
  input.focus();
}

function closeChat() {
  // Detener el polling de mensajes de admin
  if (adminPollingTimer) {
    clearInterval(adminPollingTimer);
    adminPollingTimer = null;
    console.log('⏹️ Polling de mensajes detenido');
  }
  
  // Limpiar el ID de sesión
  currentUserId = null;
  isOpeningChat = false;
  
  // Limpiar del sessionStorage
  try {
    sessionStorage.removeItem('casalaguna_session_user_id');
  } catch (e) {
    // Ignorar errores
  }
  
  // Actualizar debug div
  const debugDiv = document.getElementById('debug-session-id');
  if (debugDiv) {
    debugDiv.textContent = '[DEBUG] session_id: Sin generar aún';
  }
  
  console.log('🔴 Chat cerrado - ID de sesión limpiado');
  
  // Animar el cierre
  chatContainer.classList.add("closing");
  setTimeout(() => {
    chatContainer.classList.add("hidden");
    chatContainer.classList.remove("closing");
  }, 300);
}

/* =========================
   CHANGE LANGUAGE
========================= */
function changeLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem("chatLanguage", lang);
  
  // Update menu items for the new language
  menuItems = menuItemsData[lang];
  
  // Update active button
  document.querySelectorAll(".lang-option").forEach(btn => {
    btn.classList.remove("active");
    if (btn.dataset.lang === lang) {
      btn.classList.add("active");
    }
  });
  
  // Close dropdown
  langDropdown.classList.add("hidden");
  
  // Reset chat and show greeting
  resetChat();
}

function resetChat() {
  chat.innerHTML = "";
  input.placeholder = placeholders[currentLanguage];
  addMessage(greetings[currentLanguage], "bot");
  
  // Recrear el menu-container después de limpiar
  const menuContainer = document.createElement("div");
  menuContainer.id = "menu-container";
  menuContainer.className = "menu-container hidden";
  menuContainer.innerHTML = `
    <button class="menu-close-btn" onclick="closeMenuCarousel()" title="Cerrar menú" aria-label="Cerrar menú">
      <i class="fa-solid fa-xmark"></i>
    </button>
    <div class="menu-nav">
      <button id="menu-prev" class="menu-arrow menu-arrow-left" onclick="previousMenuItem()">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      <div class="menu-display-wrapper">
        <div class="menu-display" id="menu-display"></div>
        <div class="menu-counter">
          <span id="menu-current">1</span> / <span id="menu-total">19</span>
        </div>
      </div>
      <button id="menu-next" class="menu-arrow menu-arrow-right" onclick="nextMenuItem()">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
    </div>
  `;
  chat.appendChild(menuContainer);
  
  // Mostrar botones de acciones rápidas después del saludo
  setTimeout(() => {
    showQuickActions();
  }, 100);
}

// Acciones rápidas
const quickActions = {
  es: [
    { emoji: "📅", label: "Reservas" },
    { emoji: "⚓", label: "Sobre nosotros" },
    { emoji: "📍", label: "Ubicación" },
    { emoji: "🦞", label: "Menú" }
  ],
  en: [
    { emoji: "📅", label: "Reservations" },
    { emoji: "📍", label: "Location" },
    { emoji: "⚓", label: "About us" },
    { emoji: "🦞", label: "Menu" }
  ],
  fr: [
    { emoji: "📅", label: "Réservations" },
    { emoji: "📍", label: "Localisation" },
    { emoji: "⚓", label: "À propos" },
    { emoji: "🦞", label: "Menu" }
  ],
  pt: [
    { emoji: "📅", label: "Reservas" },
    { emoji: "📍", label: "Localização" },
    { emoji: "⚓", label: "Sobre nós" },
    { emoji: "🦞", label: "Cardápio" }
  ]
};

function showQuickActions() {
  // Remover acciones rápidas existentes si las hay
  const existingActions = chat.querySelector('.quick-actions');
  if (existingActions) {
    existingActions.remove();
  }
  
  const actions = quickActions[currentLanguage];
  const container = document.createElement("div");
  container.className = "quick-actions";
  
  actions.forEach((action, index) => {
    const btn = document.createElement("button");
    btn.className = "quick-action-btn";
    btn.innerHTML = `<span class="action-emoji">${action.emoji}</span><span class="action-label">${action.label}</span>`;
    btn.style.animationDelay = `${index * 0.1}s`;
    btn.addEventListener("click", () => {
      handleQuickAction(action.label);
    });
    container.appendChild(btn);
  });
  
  chat.appendChild(container);
  
  // Usar scrollIntoView para asegurar que las acciones sean visibles
  setTimeout(() => {
    container.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, 100);
}

function showLocationQuickActions() {
  const locationActions = {
    es: [{ emoji: "🕑", label: "Antes de llegar" }],
    en: [{ emoji: "🕑", label: "Before arriving" }],
    fr: [{ emoji: "🕑", label: "Avant d'arriver" }],
    pt: [{ emoji: "🕑", label: "Antes de chegar" }]
  };
  
  const actions = locationActions[currentLanguage];
  const container = document.createElement("div");
  container.className = "quick-actions location-actions";
  
  actions.forEach((action, index) => {
    const btn = document.createElement("button");
    btn.className = "quick-action-btn";
    btn.innerHTML = `<span class="action-emoji">${action.emoji}</span><span class="action-label">${action.label}</span>`;
    btn.style.animationDelay = `${index * 0.1}s`;
    btn.addEventListener("click", () => {
      handleLocationQuickAction(action.label);
    });
    container.appendChild(btn);
  });
  
  chat.appendChild(container);
  
  // Usar scrollIntoView para asegurar que las acciones sean visibles
  setTimeout(() => {
    container.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, 100);
}

function handleLocationQuickAction(label) {
  const reservationLabels = ["Antes de llegar", "Before arriving", "Avant d'arriver", "Antes de chegar"];
  
  if (reservationLabels.includes(label)) {
    showReservationReminder();
  }
}

function showReservationReminder() {
  const reservationMessages = {
    es: "Para que tu visita a Casa Laguna sea perfecta, te recomendamos hacer tu reservación con anticipación. 🕯️📅<br><br>Así podemos asegurarte un mejor lugar y una atención más personalizada. 🌊🤍",
    en: "To make your visit to Casa Laguna perfect, we recommend making your reservation in advance. 🕯️📅<br><br>This way we can guarantee you a better place and more personalized attention. 🌊🤍",
    fr: "Pour que votre visite à Casa Laguna soit parfaite, nous vous recommandons de faire votre réservation à l'avance. 🕯️📅<br><br>Ainsi, nous pouvons vous garantir une meilleure place et une attention plus personnalisée. 🌊🤍",
    pt: "Para que sua visita à Casa Laguna seja perfeita, recomendamos fazer sua reserva com antecedência. 🕯️📅<br><br>Assim podemos garantir um melhor lugar e uma atenção mais personalizada. 🌊🤍"
  };
  
  const message = reservationMessages[currentLanguage];
  addMessage(message, "bot");
  
  // Mostrar botón de reservación después del mensaje
  setTimeout(() => {
    showReservationQuickActions();
  }, 500);
  
  // Ocultar las acciones rápidas después de enviar el mensaje
  const quickActions = document.querySelector('.quick-actions');
  if (quickActions) {
    quickActions.remove();
  }
}

function showAboutQuickActions() {
  const aboutActions = {
    es: [
      { emoji: "📖", label: "Ver menú" },
      { emoji: "📅", label: "Reservar" },
      { emoji: "⏰", label: "Horario" },
      { emoji: "🥂", label: "Eventos" }
    ],
    en: [
      { emoji: "📖", label: "View menu" },
      { emoji: "📅", label: "Reserve" },
      { emoji: "⏰", label: "Hours" },
      { emoji: "🥂", label: "Events" }
    ],
    fr: [
      { emoji: "📖", label: "Voir le menu" },
      { emoji: "📅", label: "Réserver" },
      { emoji: "⏰", label: "Horaires" },
      { emoji: "🥂", label: "Événements" }
    ],
    pt: [
      { emoji: "📖", label: "Ver cardápio" },
      { emoji: "📅", label: "Reservar" },
      { emoji: "⏰", label: "Horário" },
      { emoji: "🥂", label: "Eventos" }
    ]
  };
  
  const actions = aboutActions[currentLanguage];
  const container = document.createElement("div");
  container.className = "quick-actions about-actions";
  
  actions.forEach((action, index) => {
    const btn = document.createElement("button");
    btn.className = "quick-action-btn";
    btn.innerHTML = `<span class="action-emoji">${action.emoji}</span><span class="action-label">${action.label}</span>`;
    btn.style.animationDelay = `${index * 0.1}s`;
    btn.addEventListener("click", () => {
      handleAboutQuickAction(action.label);
    });
    container.appendChild(btn);
  });
  
  chat.appendChild(container);
  
  // Usar scrollIntoView para asegurar que las acciones sean visibles
  setTimeout(() => {
    container.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, 100);
}

function handleAboutQuickAction(label) {
  const menuLabels = ["Ver menú", "View menu", "Voir le menu", "Ver cardápio"];
  const reservationLabels = ["Reservar", "Reserve", "Réserver", "Reservar"];
  const openingHoursLabels = ["Horario", "Hours", "Horaires", "Horário"];
  const eventsLabels = ["Eventos", "Events", "Événements", "Eventos"];
  
  if (menuLabels.includes(label)) {
    showMenuCarousel();
  } else if (reservationLabels.includes(label)) {
    initiateReservation();
  } else if (openingHoursLabels.includes(label)) {
    addMessage(openingHoursMessages[currentLanguage], "bot");
    setTimeout(() => {
      showHoursQuickActions();
    }, 500);
  } else if (eventsLabels.includes(label)) {
    addMessage(eventsMessages[currentLanguage], "bot");
    setTimeout(() => {
      showEventsQuickActions();
    }, 500);
  }
}

function showReservationQuickActions() {
  const reservationActions = {
    es: [{ emoji: "📅", label: "Reservar" }],
    en: [{ emoji: "📅", label: "Reserve" }],
    fr: [{ emoji: "📅", label: "Réserver" }],
    pt: [{ emoji: "📅", label: "Reservar" }]
  };
  
  const actions = reservationActions[currentLanguage];
  const container = document.createElement("div");
  container.className = "quick-actions reservation-actions";
  
  actions.forEach((action, index) => {
    const btn = document.createElement("button");
    btn.className = "quick-action-btn";
    btn.innerHTML = `<span class="action-emoji">${action.emoji}</span><span class="action-label">${action.label}</span>`;
    btn.style.animationDelay = `${index * 0.1}s`;
    btn.addEventListener("click", () => {
      handleReservationQuickAction(action.label);
    });
    container.appendChild(btn);
  });
  
  chat.appendChild(container);
  
  // Usar scrollIntoView para asegurar que las acciones sean visibles
  setTimeout(() => {
    container.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, 100);
}

function handleReservationQuickAction(label) {
  const reservationLabels = ["Reservar", "Reserve", "Réserver", "Reservar"];
  
  if (reservationLabels.includes(label)) {
    initiateReservation();
  }
}

function showEventsQuickActions() {
  const eventsActions = {
    es: [
      { emoji: "📅", label: "Reservar" },
      { emoji: "💰", label: "Cotizar evento" }
    ],
    en: [
      { emoji: "📅", label: "Reserve" },
      { emoji: "💰", label: "Quote event" }
    ],
    fr: [
      { emoji: "📅", label: "Réserver" },
      { emoji: "💰", label: "Devis événement" }
    ],
    pt: [
      { emoji: "📅", label: "Reservar" },
      { emoji: "💰", label: "Cotar evento" }
    ]
  };
  
  const actions = eventsActions[currentLanguage];
  const container = document.createElement("div");
  container.className = "quick-actions events-actions";
  
  actions.forEach((action, index) => {
    const btn = document.createElement("button");
    btn.className = "quick-action-btn";
    btn.innerHTML = `<span class="action-emoji">${action.emoji}</span><span class="action-label">${action.label}</span>`;
    btn.style.animationDelay = `${index * 0.1}s`;
    btn.addEventListener("click", () => {
      handleEventsQuickAction(action.label);
    });
    container.appendChild(btn);
  });
  
  chat.appendChild(container);
  
  // Usar scrollIntoView para asegurar que las acciones sean visibles
  setTimeout(() => {
    container.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, 100);
}

function handleEventsQuickAction(label) {
  const reservationLabels = ["Reservar", "Reserve", "Réserver", "Reservar"];
  const quoteLabels = ["Cotizar evento", "Quote event", "Devis événement", "Cotar evento"];
  
  if (reservationLabels.includes(label)) {
    initiateReservation();
  } else if (quoteLabels.includes(label)) {
    // Acción pendiente para cotización de evento
    console.log("Cotización de evento solicitada:", label);
  }
}

function showHoursQuickActions() {
  const hoursActions = {
    es: [
      { emoji: "📍", label: "Ubicación" },
      { emoji: "📅", label: "Reservar" }
    ],
    en: [
      { emoji: "📍", label: "Location" },
      { emoji: "📅", label: "Reserve" }
    ],
    fr: [
      { emoji: "📍", label: "Localisation" },
      { emoji: "📅", label: "Réserver" }
    ],
    pt: [
      { emoji: "📍", label: "Localização" },
      { emoji: "📅", label: "Reservar" }
    ]
  };
  
  const actions = hoursActions[currentLanguage];
  const container = document.createElement("div");
  container.className = "quick-actions hours-actions";
  
  actions.forEach((action, index) => {
    const btn = document.createElement("button");
    btn.className = "quick-action-btn";
    btn.innerHTML = `<span class="action-emoji">${action.emoji}</span><span class="action-label">${action.label}</span>`;
    btn.style.animationDelay = `${index * 0.1}s`;
    btn.addEventListener("click", () => {
      handleHoursQuickAction(action.label);
    });
    container.appendChild(btn);
  });
  
  chat.appendChild(container);
  
  // Usar scrollIntoView para asegurar que las acciones sean visibles
  setTimeout(() => {
    container.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, 100);
}

function handleHoursQuickAction(label) {
  const locationLabels = ["Ubicación", "Location", "Localisation", "Localização"];
  const reservationLabels = ["Reservar", "Reserve", "Réserver", "Reservar"];
  
  if (locationLabels.includes(label)) {
    // Usar la funcionalidad de ubicación existente
    showLocationResponse();
  } else if (reservationLabels.includes(label)) {
    initiateReservation();
  }
}

function showMenuFollowUpActions() {
  const menuFollowUpActions = {
    es: [
      { emoji: "🔍", label: "Ver un platillo" },
      { emoji: "📍", label: "Ubicación" },
      { emoji: "📅", label: "Reservar" }
    ],
    en: [
      { emoji: "🔍", label: "View a dish" },
      { emoji: "📍", label: "Location" },
      { emoji: "📅", label: "Reserve" }
    ],
    fr: [
      { emoji: "🔍", label: "Voir un plat" },
      { emoji: "📍", label: "Localisation" },
      { emoji: "📅", label: "Réserver" }
    ],
    pt: [
      { emoji: "🔍", label: "Ver um prato" },
      { emoji: "📍", label: "Localização" },
      { emoji: "📅", label: "Reservar" }
    ]
  };
  
  const actions = menuFollowUpActions[currentLanguage];
  const container = document.createElement("div");
  container.className = "quick-actions menu-followup-actions";
  
  actions.forEach((action, index) => {
    const btn = document.createElement("button");
    btn.className = "quick-action-btn";
    btn.innerHTML = `<span class="action-emoji">${action.emoji}</span><span class="action-label">${action.label}</span>`;
    btn.style.animationDelay = `${index * 0.1}s`;
    btn.addEventListener("click", () => {
      handleMenuFollowUpAction(action.label);
    });
    container.appendChild(btn);
  });
  
  chat.appendChild(container);
  
  // Usar scrollIntoView para asegurar que las acciones sean visibles
  setTimeout(() => {
    container.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, 100);
}

function handleMenuFollowUpAction(label) {
  const dishLabels = ["Ver un platillo", "View a dish", "Voir un plat", "Ver um prato"];
  const reservationLabels = ["Reservar", "Reserve", "Réserver", "Reservar"];
  const locationLabels = ["Ubicación", "Location", "Localisation", "Localização"];
  
  if (dishLabels.includes(label)) {
    const dishQuestion = {
      es: "¿Qué platillo te llamó la atención del menú? 🍤<br>Dime el nombre y con gusto te cuento más. ✨",
      en: "Which dish caught your attention from the menu? 🍤<br>Tell me the name and I'll gladly tell you more. ✨",
      fr: "Quel plat vous a attiré l'attention du menu ? 🍤<br>Dites-moi le nom et je vous en dirai plus avec plaisir. ✨",
      pt: "Qual prato chamou sua atenção do menu? 🍤<br>Diga-me o nome e com prazer conto mais. ✨"
    };
    addMessage(dishQuestion[currentLanguage], "bot");
    
    // Ocultar el botón después de enviar el mensaje
    const quickActions = document.querySelector('.quick-actions');
    if (quickActions) {
      quickActions.remove();
    }
  } else if (reservationLabels.includes(label)) {
    initiateReservation();
  } else if (locationLabels.includes(label)) {
    showLocationResponse();
  }
}

// Manejar acciones rápidas
function handleQuickAction(label) {
  // Determinar cuál es la acción basada en el idioma y etiqueta
  const locationLabels = ["Ubicación", "Location", "Localisation", "Localização"];
  const aboutLabels = ["Sobre nosotros", "About us", "À propos", "Sobre nós"];
  const menuLabels = ["Menú", "Menu", "Menu", "Cardápio"];
  const reservationLabels = ["Reservas", "Reservations", "Réservations", "Reservas"];
  
  if (locationLabels.includes(label)) {
    showLocationResponse();
  } else if (aboutLabels.includes(label)) {
    showAboutResponse();
  } else if (menuLabels.includes(label)) {
    showMenuCarousel();
  } else if (reservationLabels.includes(label)) {
    showReservationResponse();
  } else {
    console.log("Acción:", label);
  }
}

// Respuesta de ubicación predefinida
function showLocationResponse() {
  const locationMessages = {
    es: "📍 <strong>Ubicación - Casa Laguna</strong><br><br>Av. Miguel Hidalgo 6106, Col. Lagunas de la Herradura, CP 89219, Tampico, Tamaulipas, México.<br><br>Al interior del Hotel Posada de Tampico.<br><br>https://maps.app.goo.gl/Z7RYQWyPWY1YhpHZ6",
    en: "📍 <strong>Location - Casa Laguna</strong><br><br>Av. Miguel Hidalgo 6106, Lagunas de la Herradura, CP 89219, Tampico, Tamaulipas, Mexico.<br><br>Inside Hotel Posada de Tampico.<br><br>https://maps.app.goo.gl/Z7RYQWyPWY1YhpHZ6",
    fr: "📍 <strong>Localisation - Casa Laguna</strong><br><br>Av. Miguel Hidalgo 6106, Lagunas de la Herradura, CP 89219, Tampico, Tamaulipas, Mexique.<br><br>À l'intérieur de l'Hôtel Posada de Tampico.<br><br>https://maps.app.goo.gl/Z7RYQWyPWY1YhpHZ6",
    pt: "📍 <strong>Localização - Casa Laguna</strong><br><br>Av. Miguel Hidalgo 6106, Lagunas de la Herradura, CP 89219, Tampico, Tamaulipas, México.<br><br>Dentro do Hotel Posada de Tampico.<br><br>https://maps.app.goo.gl/Z7RYQWyPWY1YhpHZ6"
  };
  
  const message = locationMessages[currentLanguage];
  addMessage(message, "bot");
  
  // Mostrar botón de reservación después de la ubicación
  setTimeout(() => {
    showLocationQuickActions();
  }, 500);
}

// Respuesta de "Sobre nosotros" predefinida
function showAboutResponse() {
  const aboutMessages = {
    es: "Casa Laguna es una experiencia diseñada para disfrutarse frente a la Laguna del Chairel. 🌊✨ Ubicados dentro del Hotel Fiesta Inn Tampico, celebramos las delicias del mar con una cocina especializada en mariscos frescos, preparados para resaltar su sabor natural.<br><br>Nuestro espacio ofrece áreas amplias, mesas confortables e iluminación cálida, en una atmósfera elegante y relajada. Ideal para citas, celebraciones y reuniones especiales, Casa Laguna une sabor, servicio y vista para una experiencia memorable. 💙🐟🌅",
    en: "Casa Laguna is more than a restaurant; it's a destination overlooking Laguna del Chairel. 🌊✨<br><br>Located inside Hotel Fiesta Inn Tampico, we celebrate the delights of the sea through a cuisine specialized in fresh seafood, carefully selected and prepared to highlight their natural flavor.<br><br>Our space is designed to create memorable moments: spacious areas, comfortable tables, warm lighting and an elegant and relaxed atmosphere that invites you to enjoy without hurry. 🍽️🕯️<br><br>Ideal for dates, celebrations and special gatherings, Casa Laguna combines the taste of the sea, attentive service and a privileged view to offer a welcoming and memorable experience. 💙🐟🌅",
    fr: "Casa Laguna est plus qu'un restaurant ; c'est une destination donnant sur la Laguna del Chairel. 🌊✨<br><br>Situés à l'intérieur de l'Hôtel Fiesta Inn Tampico, nous célébrons les délices de la mer à travers une cuisine spécialisée dans les fruits de mer frais, soigneusement sélectionnés et préparés pour mettre en valeur leur saveur naturelle.<br><br>Notre espace est conçu pour créer des moments mémorables : zones spacieuses, tables confortables, éclairage chaleureux et une atmosphère élégante et détendue qui invite à profiter sans se presser. 🍽️🕯️<br><br>Idéal pour les rendez-vous, célébrations et rassemblements spéciaux, Casa Laguna combine le goût de la mer, un service attentif et une vue privilégiée pour offrir une expérience accueillante et mémorable. 💙🐟🌅",
    pt: "Casa Laguna é mais que um restaurante; é um destino com vista para a Laguna del Chairel. 🌊✨<br><br>Localizados dentro do Hotel Fiesta Inn Tampico, celebramos as delícias do mar através de uma culinária especializada em frutos do mar frescos, cuidadosamente selecionados e preparados para realçar seu sabor natural.<br><br>Nosso espaço é projetado para criar momentos memoráveis: áreas amplas, mesas confortáveis, iluminação quente e uma atmosfera elegante e relaxada que convida a desfrutar sem pressa. 🍽️🕯️<br><br>Ideal para encontros, celebrações e reuniões especiais, Casa Laguna combina o sabor do mar, um serviço atencioso e uma vista privilegiada para oferecer uma experiência acolhedora e memorável. 💙🐟🌅"
  };
  
  const message = aboutMessages[currentLanguage];
  addMessage(message, "bot");
  
  // Mostrar botón de menú después de "Sobre nosotros"
  setTimeout(() => {
    showAboutQuickActions();
  }, 500);
}

// Respuesta de "Reservas" predefinida
function showReservationResponse() {
  const reservationMessages = {
    es: "Puedes reservar directamente aquí en el chat o a través de WhatsApp, Instagram y Facebook. 📲<br><br>La capacidad por mesa es de hasta 20 personas; para grupos mayores te recomendamos cotizar un evento privado. 🎉<br><br>La última hora para reservaciones es a las 23:00 hrs. Indícanos cómo deseas continuar y con gusto te ayudamos. 🗓️✨",
    en: "You can reserve directly here in the chat or through WhatsApp, Instagram and Facebook. 📲<br><br>The capacity per table is up to 20 people; for larger groups we recommend quoting a private event. 🎉<br><br>The last time for reservations is at 23:00 hrs. Tell us how you want to continue and we gladly help you. 🗓️✨",
    fr: "Vous pouvez réserver directement ici dans le chat ou via WhatsApp, Instagram et Facebook. 📲<br><br>La capacité par table est de jusqu'à 20 personnes ; pour des groupes plus nombreux, nous vous recommandons de demander un devis pour un événement privé. 🎉<br><br>La dernière heure pour les réservations est à 23h00. Indiquez-nous comment vous souhaitez continuer et nous vous aidons avec plaisir. 🗓️✨",
    pt: "Você pode reservar diretamente aqui no chat ou através do WhatsApp, Instagram e Facebook. 📲<br><br>A capacidade por mesa é de até 20 pessoas; para grupos maiores recomendamos cotar um evento privado. 🎉<br><br>A última hora para reservas é às 23:00 hrs. Indique-nos como deseja continuar e ficaremos felizes em ajudá-lo. 🗓️✨"
  };
  
  const message = reservationMessages[currentLanguage];
  addMessage(message, "bot");
  
  // Mostrar botones de opciones de reserva después del mensaje
  setTimeout(() => {
    showReservationQuickActions();
  }, 500);
}

function showReservationQuickActions() {
  const reservationActions = {
    es: [
      { emoji: "🎉", label: "Evento Privado" },
      { emoji: "📅", label: "Reservar" },
      { emoji: "🔙", label: "Volver al menú" }
    ],
    en: [
      { emoji: "🎉", label: "Private Event" },
      { emoji: "📅", label: "Reserve" },
      { emoji: "🔙", label: "Back to menu" }
    ],
    fr: [
      { emoji: "🎉", label: "Événement privé" },
      { emoji: "📅", label: "Réserver" },
      { emoji: "🔙", label: "Retour au menu" }
    ],
    pt: [
      { emoji: "🎉", label: "Evento Privado" },
      { emoji: "📅", label: "Reservar" },
      { emoji: "🔙", label: "Voltar ao menu" }
    ]
  };
  
  const actions = reservationActions[currentLanguage];
  
  // Primer contenedor para los primeros dos botones
  const container1 = document.createElement("div");
  container1.className = "quick-actions reservation-actions";
  
  for (let i = 0; i < 2; i++) {
    const action = actions[i];
    const btn = document.createElement("button");
    btn.className = "quick-action-btn";
    btn.innerHTML = `<span class="action-emoji">${action.emoji}</span><span class="action-label">${action.label}</span>`;
    btn.style.animationDelay = `${i * 0.1}s`;
    btn.addEventListener("click", () => {
      handleQuickAction(action.label);
    });
    container1.appendChild(btn);
  }
  
  chat.appendChild(container1);
  
  // Segundo contenedor para el tercer botón
  const container2 = document.createElement("div");
  container2.className = "quick-actions reservation-actions";
  container2.style.marginTop = "-25px"; // Reducir espacio entre filas
  
  const action = actions[2];
  const btn = document.createElement("button");
  btn.className = "quick-action-btn";
  btn.innerHTML = `<span class="action-emoji">${action.emoji}</span><span class="action-label">${action.label}</span>`;
  btn.style.animationDelay = `0.2s`;
  btn.addEventListener("click", () => {
    handleQuickAction(action.label);
  });
  container2.appendChild(btn);
  
  chat.appendChild(container2);
  
  // Usar scrollIntoView para asegurar que las acciones sean visibles
  setTimeout(() => {
    container2.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, 100);
}

// Initialize language on page load
function initLanguage() {
  // Mark active language
  document.querySelectorAll(".lang-option").forEach(btn => {
    if (btn.dataset.lang === currentLanguage) {
      btn.classList.add("active");
    }
  });
  // Set initial placeholder
  input.placeholder = placeholders[currentLanguage];
  
  // Mostrar acciones rápidas en el chat inicial
  showQuickActions();
}

initLanguage();

/* =========================
   ENVÍO DE MENSAJES
========================= */

// Estado global para rastrear reservaciones
let reservationState = {
  isCollecting: false,
  step: 0,
  data: {},
  steps: ['nombre', 'telefono', 'fecha_nacimiento', 'personas', 'fecha_hora']
};

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  addMessage(text, "user");
  input.value = "";

  // Mostrar typing siempre
  const typingEl = showTyping();

  console.log("Enviando mensaje al backend:", text);
  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, session_id: currentUserId })
    });

    console.log("Respuesta del backend:", response.status);
    const data = await response.json();
    console.log("Datos recibidos:", data);
    
    // Actualizar estado de handoff si viene en la respuesta
    if (data.handoff_state && data.handoff_state !== currentHandoffState) {
      currentHandoffState = data.handoff_state;
      showHandoffBanner(currentHandoffState);
    }

    // Si el admin controla y no hay mensajes, dejar typing persistente
    const hasMessages = data.messages && Array.isArray(data.messages) && data.messages.length > 0;
    if (currentHandoffState === 'human_active' && !hasMessages) {
      // Remover typing anterior si existía
      if (adminTypingEl) adminTypingEl.remove();
      adminTypingEl = typingEl; // Mantener visible hasta que llegue respuesta del admin
    } else {
      typingEl.remove();
    }

    // Manejar respuesta como array de mensajes
    if (hasMessages) {
      for (const msg of data.messages) {
        if (msg.role === "admin") {
          addMessage(msg.content, "admin", true, true);
        } else if (msg.role === "system") {
          addMessage(msg.content, "system", false, false);
        } else {
          addMessage(msg.content, "bot", true, true);
        }
      }
    } else if (data.answer) {
      // Fallback para respuestas antiguas
      addMessage(data.answer, "bot", true, true);
    }
  } catch (error) {
    console.error("Error en fetch del chat:", error);
    typingEl.remove();
    addMessage(`Error al conectar con el asistente: ${error.message}`, "bot");
  }
}

// Función para manejar reservaciones completadas
async function handleReservationResponse(botResponse, userResponses) {
  try {
    console.log("🔄 Procesando respuesta de reservación...");
    
    // Limpiar el patrón de reservación
    const cleanResponse = botResponse.replace(/\[RESERVACION_COMPLETA_FINAL\]/g, "").trim();
    
    // Mostrar la respuesta limpia al usuario
    try {
      addMessage(cleanResponse, "bot", false);
    } catch (e) {
      console.error("Error al mostrar mensaje:", e);
    }
    
    // Extraer datos de la conversación
    const extractedData = {
      nombre: extractField(botResponse, 'nombre'),
      telefono: extractField(botResponse, 'teléfono|telefono'),
      fecha_nacimiento: extractField(botResponse, 'nacimiento|birthdate'),
      personas: parseInt(extractField(botResponse, 'personas|people|personnes')) || 0,
      fecha_hora: extractField(botResponse, 'fecha.*hora|date.*time')
    };
    
    console.log("📋 Datos extraídos:", extractedData);
    
    // Validar que al menos tenemos los datos principales
    if (!extractedData.nombre || !extractedData.telefono || !extractedData.fecha_hora) {
      console.warn("⚠️ Datos incompletos:", extractedData);
      try {
        addMessage("⚠️ No pude extraer todos los datos correctamente. Por favor intenta de nuevo.", "bot");
      } catch (e) {
        console.error("Error al mostrar mensaje de error:", e);
      }
      return;
    }
    
    // Mostrar indicador de guardado
    const savingEl = showTyping();
    
    // Pequeño delay para que se vea el indicador
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      // Enviar datos al backend para guardar
      const reservationResponse = await saveReservationToBackend(extractedData);
      
      // Remover el indicador de guardado de forma segura
      try {
        if (savingEl && savingEl.parentNode) {
          savingEl.remove();
        }
      } catch (e) {
        console.warn("Error al remover indicador:", e);
      }
      
      if (reservationResponse.success) {
        console.log("✅ Reservación guardada exitosamente");
        
        // Actualizar el nombre del usuario en el CRM
        try {
          await fetch(`${API_BASE_URL}/crm/conversations/${currentUserId}/update-name`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre: extractedData.nombre })
          });
          console.log("👤 Nombre del usuario actualizado en el CRM");
        } catch (e) {
          console.warn("⚠️ No se pudo actualizar el nombre en el CRM:", e);
        }
        
        // Mostrar confirmación
        const confirmationMessages = {
          es: `✅ ¡Excelente! Tu reservación ha sido confirmada.<br><br>🆔 ID: <strong>${reservationResponse.reservation_id}</strong><br><br>¿Hay algo más en lo que pueda ayudarte?`,
          en: `✅ Excellent! Your reservation has been confirmed.<br><br>🆔 ID: <strong>${reservationResponse.reservation_id}</strong><br><br>Is there anything else I can help you with?`,
          fr: `✅ Excellent ! Votre réservation a été confirmée.<br><br>🆔 ID: <strong>${reservationResponse.reservation_id}</strong><br><br>Y a-t-il autre chose pour vous?`,
          pt: `✅ Excelente! Sua reserva foi confirmada.<br><br>🆔 ID: <strong>${reservationResponse.reservation_id}</strong><br><br>Posso ajudá-lo em mais alguma coisa?`
        };
        
        try {
          addMessage(confirmationMessages[currentLanguage], "bot", true);
        } catch (e) {
          console.error("Error al mostrar confirmación:", e);
        }
        
        // Resetear estado de reservación
        try {
          resetReservationState();
        } catch (e) {
          console.warn("Error al resetear estado:", e);
        }
      } else {
        console.error("❌ Error en respuesta del backend:", reservationResponse);
        try {
          addMessage("⚠️ Hubo un problema al guardar. Por favor intenta de nuevo.", "bot");
        } catch (e) {
          console.error("Error al mostrar mensaje de error:", e);
        }
      }
    } catch (networkError) {
      console.error("❌ Error de red:", networkError);
      try {
        if (savingEl && savingEl.parentNode) {
          savingEl.remove();
        }
      } catch (e) {
        console.warn("Error al remover indicador:", e);
      }
      try {
        addMessage("❌ Error de conexión. Por favor intenta de nuevo.", "bot");
      } catch (e) {
        console.error("Error al mostrar mensaje:", e);
      }
    }
  } catch (error) {
    console.error("❌ Error inesperado en handleReservationResponse:", error);
    try {
      addMessage("❌ Error inesperado. Por favor recarga la página.", "bot");
    } catch (e) {
      console.error("Error crítico:", e);
    }
  }
}

// Función auxiliar para extraer campos de la respuesta del bot
function extractField(response, patterns) {
  const patternList = patterns.split('|');
  for (const pattern of patternList) {
    // Formato 2: "👤 [VALOR]" (con emoji)
    let regex = new RegExp(`👤\\s+([^\\n]+)`, 'i');
    if (pattern.includes('nombre')) {
      let match = response.match(regex);
      if (match && match[1]) return match[1].trim();
    }
    
    // Formato 3: "📱 [VALOR]"
    regex = new RegExp(`📱\\s+([^\\n]+)`, 'i');
    if (pattern.includes('teléfono')) {
      let match = response.match(regex);
      if (match && match[1]) return match[1].trim();
    }
    
    // Formato 4: "🎂 [VALOR]"
    regex = new RegExp(`🎂\\s+([^\\n]+)`, 'i');
    if (pattern.includes('nacimiento')) {
      let match = response.match(regex);
      if (match && match[1]) return match[1].trim();
    }
    
    // Formato 5: "👥 [VALOR]"
    regex = new RegExp(`👥\\s+([^\\n]+)`, 'i');
    if (pattern.includes('personas')) {
      let match = response.match(regex);
      if (match && match[1]) return match[1].trim();
    }
    
    // Formato 6: "📅 [VALOR]"
    regex = new RegExp(`📅\\s+([^\\n]+)`, 'i');
    if (pattern.includes('fecha')) {
      let match = response.match(regex);
      if (match && match[1]) return match[1].trim();
    }
    
    // Intentar diferentes formatos de regex
    // Formato 1: "Nombre: [VALOR]" o "Nombre:[VALOR]"
    regex = new RegExp(`${pattern}[:\\s]*([^\\n📱👤🎂👥📅✨]+)`, 'i');
    let match = response.match(regex);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return '';
}

// Función para guardar reservación en el backend
async function saveReservationToBackend(data) {
  try {
    console.log("📤 Enviando datos al backend:", data);
    
    const response = await fetch(`${API_BASE_URL}/reservations/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, session_id: currentUserId })
    });
    
    if (!response.ok) {
      console.error(`Error HTTP ${response.status}:`, response.statusText);
      return { success: false, error: `Error ${response.status}` };
    }
    
    const result = await response.json();
    console.log("✅ Respuesta del backend:", result);
    return result;
  } catch (error) {
    console.error("❌ Error communicating with backend:", error);
    return { success: false, error: error.message };
  }
}

// Función para resetear el estado de reservación
function resetReservationState() {
  reservationState = {
    isCollecting: false,
    step: 0,
    data: {},
    steps: ['nombre', 'telefono', 'fecha_nacimiento', 'personas', 'fecha_hora']
  };
}

// Detectar clic en botón "Reservar" y enviar mensaje automáticamente
function handleQuickAction(label) {
  const reservationLabels = ["Reservar", "Reserve", "Réserver", "Reservar", "Reservas", "Reservations", "Réservations", "Reservas"];
  const menuLabels = ["Menú", "Menu", "Menu", "Cardápio"];
  const aboutLabels = ["Sobre nosotros", "About us", "À propos", "Sobre nós"];
  const locationLabels = ["Ubicación", "Location", "Localisation", "Localização"];
  const backToMenuLabels = ["Volver al menú", "Back to menu", "Retour au menu", "Voltar ao menu"];
  const privateEventLabels = ["Evento Privado", "Private Event", "Événement privé", "Evento Privado"];
  
  if (reservationLabels.includes(label)) {
    if (["Reservar", "Reserve", "Réserver", "Reservar"].includes(label)) {
      // Iniciar reservación automática
      initiateReservation();
    } else {
      // Mostrar mensaje informativo de reservas
      showReservationResponse();
    }
  } else if (menuLabels.includes(label)) {
    showMenuCarousel();
  } else if (aboutLabels.includes(label)) {
    showAboutResponse();
  } else if (locationLabels.includes(label)) {
    showLocationResponse();
  } else if (backToMenuLabels.includes(label)) {
    showQuickActions();
  } else if (privateEventLabels.includes(label)) {
    // Enviar mensaje para cotizar evento privado
    const privateEventMessages = {
      es: "Quiero cotizar un evento privado 🎉",
      en: "I want to quote a private event 🎉",
      fr: "Je veux demander un devis pour un événement privé 🎉",
      pt: "Quero cotar um evento privado 🎉"
    };
    sendUserMessageAndGetResponse(privateEventMessages[currentLanguage]);
  }
}

// Función para iniciar una reservación
function initiateReservation() {
  const messages = {
    es: "Quiero hacer una reservación 📅",
    en: "I want to make a reservation 📅",
    fr: "Je veux faire une réservation 📅",
    pt: "Quero fazer uma reserva 📅"
  };
  
  sendUserMessageAndGetResponse(messages[currentLanguage]);
}

// Función auxiliar para enviar mensajes del usuario automáticamente
async function sendUserMessageAndGetResponse(message) {
  addMessage(message, "user");
  
  const typingEl = showTyping();
  
  console.log("Enviando mensaje al backend:", message);
  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, session_id: currentUserId })
    });
    
    console.log("Respuesta del backend:", response.status);
    const data = await response.json();
    console.log("Datos recibidos:", data);
    
    // Actualizar estado de handoff
    if (data.handoff_state && data.handoff_state !== currentHandoffState) {
      currentHandoffState = data.handoff_state;
      showHandoffBanner(currentHandoffState);
    }

    // Si admin controla y no hay mensajes, dejar typing persistente
    const hasMessages = data.messages && Array.isArray(data.messages) && data.messages.length > 0;
    if (currentHandoffState === 'human_active' && !hasMessages) {
      if (adminTypingEl) adminTypingEl.remove();
      adminTypingEl = typingEl;
    } else {
      typingEl.remove();
    }

    // Manejar respuesta como array de mensajes
    if (data.messages && Array.isArray(data.messages)) {
      for (const msg of data.messages) {
        if (msg.role === "admin") {
          addMessage(msg.content, "admin", true, true);
        } else if (msg.role === "system") {
          addMessage(msg.content, "system", false, false);
        } else {
          addMessage(msg.content, "bot", true, true);
        }
      }
    } else {
      // Fallback para respuestas antiguas
      if (data.answer.includes("[RESERVACION_COMPLETA_FINAL]")) {
        await handleReservationResponse(data.answer, message);
      } else {
        addMessage(data.answer, "bot", true, true);
      }
    }
  } catch (error) {
    console.error("Error en fetch automático:", error);
    typingEl.remove();
    addMessage(`Error al conectar con el asistente: ${error.message}`, "bot");
  }
}

/* =========================
   MENSAJES
========================= */
function processMarkdown(text) {
  // Convertir listas markdown a HTML
  // Primero, dividir el texto en líneas
  const lines = text.split('\n');
  let inList = false;
  let result = [];
  
  for (let line of lines) {
    if (line.trim().startsWith('- ')) {
      if (!inList) {
        result.push('<ul>');
        inList = true;
      }
      result.push(`<li>${line.trim().substring(2)}</li>`);
    } else {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      result.push(line);
    }
  }
  
  if (inList) {
    result.push('</ul>');
  }
  
  return result.join('\n');
}

function addMessage(text, sender, showFeedback = true, isAgentMessage = false) {
  console.log(`Agregando mensaje - Tipo: ${sender}, Texto: ${text.substring(0, 50)}...`);
  const div = document.createElement("div");
  div.className = `message ${sender}`;
  const cleanedText = text.replace(/\[([^\]]+)\]\(/g, "");
  const processedText = processMarkdown(cleanedText);

  // Formatear hora actual
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // No mostrar hora en mensajes del sistema (alertas del CRM)
  const showTime = sender !== 'system';

  div.innerHTML = `<div class="msg-text">${linkify(processedText)}</div>${showTime ? `<span class="msg-time">${timeStr}</span>` : ''}`;
  chat.appendChild(div);

  // Auto-scroll to bottom
  setTimeout(() => {
    chat.scrollTop = chat.scrollHeight;
  }, 100);

  // Si es un mensaje del bot, del agente humano Y showFeedback es true, y NO es parte del proceso de reservación, añadir mensaje de seguimiento
  if (sender === "bot" && isAgentMessage && showFeedback && !text.includes("👤") && !text.includes("📱") && !text.includes("🎂") && !text.includes("👥") && !text.includes("📅") && !text.includes("¿Correcto?") && !text.includes("¿Estás seguro") && currentHandoffState !== "human_active") {
    setTimeout(() => {
      addFeedbackMessage();
    }, 800); // Pequeño delay para que se vea natural
  }
}

/* =========================
   TYPING INDICATOR
========================= */
function showTyping() {
  const wrapper = document.createElement("div");
  wrapper.className = "typing-wrapper"; // ⬅️ NUEVA CLASE

  wrapper.innerHTML = `
    <div class="typing">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;

  chat.appendChild(wrapper);

  // Auto-scroll to bottom
  setTimeout(() => {
    chat.scrollTop = chat.scrollHeight;
  }, 100);

  return wrapper;
}


/* =========================
   FEEDBACK SYSTEM
========================= */
function addFeedbackMessage() {
  const feedbackDiv = document.createElement("div");
  feedbackDiv.className = "message bot feedback-message";
  feedbackDiv.innerHTML = `
    <div class="feedback-text">${feedbackMessages[currentLanguage]}</div>
    <div class="feedback-buttons">
      <button class="feedback-btn yes-btn" data-response="yes">Sí</button>
      <button class="feedback-btn no-btn" data-response="no">No</button>
    </div>
  `;
  
  chat.appendChild(feedbackDiv);
  
  // Agregar event listeners a los botones
  const yesBtn = feedbackDiv.querySelector('.yes-btn');
  const noBtn = feedbackDiv.querySelector('.no-btn');
  
  yesBtn.addEventListener('click', () => handleFeedbackResponse('yes'));
  noBtn.addEventListener('click', () => handleFeedbackResponse('no'));
  
  // Auto-scroll to bottom
  setTimeout(() => {
    chat.scrollTop = chat.scrollHeight;
  }, 100);
}

function handleFeedbackResponse(response) {
  // Remover todos los mensajes de feedback existentes
  const feedbackMessages = document.querySelectorAll('.feedback-message');
  feedbackMessages.forEach(msg => msg.remove());
  
  if (response === 'yes') {
    // Mostrar mensaje positivo SIN activar feedback adicional
    setTimeout(() => {
      addMessage(positiveFeedbackMessages[currentLanguage], "bot", false);
    }, 300);
  } else if (response === 'no') {
    // Mostrar segunda pregunta: ¿Deseas contacto con personal?
    setTimeout(() => {
      addSupportContactMessage();
    }, 300);
  }
}

/* =========================
   SOPORTE CONTACTO PERSONAL
========================= */
function addSupportContactMessage() {
  const supportDiv = document.createElement("div");
  supportDiv.className = "message bot feedback-message support-contact-message";
  supportDiv.innerHTML = `
    <div class="feedback-text">${supportContactMessages[currentLanguage]}</div>
    <div class="feedback-buttons">
      <button class="feedback-btn yes-btn" data-response="contact-yes">Sí</button>
      <button class="feedback-btn no-btn" data-response="contact-no">No</button>
    </div>
  `;
  
  chat.appendChild(supportDiv);
  
  // Agregar event listeners a los botones
  const yesBtn = supportDiv.querySelector('.yes-btn');
  const noBtn = supportDiv.querySelector('.no-btn');
  
  yesBtn.addEventListener('click', () => handleSupportContactResponse('yes'));
  noBtn.addEventListener('click', () => handleSupportContactResponse('no'));
  
  // Auto-scroll to bottom
  setTimeout(() => {
    chat.scrollTop = chat.scrollHeight;
  }, 100);
}

function handleSupportContactResponse(response) {
  // Remover el mensaje de soporte
  const supportMessages = document.querySelectorAll('.support-contact-message');
  supportMessages.forEach(msg => msg.remove());
  
  if (response === 'yes') {
    // Responder que se conectará con un agente
    setTimeout(() => {
      addMessage(transferringMessages[currentLanguage], "bot", false);
      // Notificar al backend que se necesita apoyo urgente
      notifyUrgentSupport();
    }, 300);
  } else if (response === 'no') {
    // Continuar la conversación normalmente
    setTimeout(() => {
      addMessage(positiveFeedbackMessages[currentLanguage], "bot", false);
    }, 300);
  }
}

/* =========================
   NOTIFICACIÓN SOPORTE URGENTE AL CRM
========================= */
function notifyUrgentSupport() {
  const userData = {
    usuario_id: currentUserId,
    timestamp: new Date().toISOString(),
    motivo: "usuario solicita contacto con personal del restaurante"
  };
  
  fetch(`${API_BASE_URL}/crm/urgent-support`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  })
  .then(response => {
    if (response.ok) {
      console.log('✅ Notificación de soporte urgente enviada al CRM');
    }
  })
  .catch(error => {
    console.error('⚠️ Error notificando soporte urgente:', error);
  });
}

/* =========================
   LINKIFY (GOOGLE MAPS OK)
========================= */
function linkify(text) {
  const buttonTexts = {
    maps: {
      es: "Abrir en Google Maps",
      en: "Open in Google Maps",
      fr: "Ouvrir dans Google Maps",
      pt: "Abrir no Google Maps"
    },
    facebook: {
      es: "Visitar Facebook",
      en: "Visit Facebook",
      fr: "Visiter Facebook",
      pt: "Visitar Facebook"
    },
    instagram: {
      es: "Visitar Instagram",
      en: "Visit Instagram",
      fr: "Visiter Instagram",
      pt: "Visitar Instagram"
    },
    website: {
      es: "Visitar sitio web",
      en: "Visit website",
      fr: "Visiter le site web",
      pt: "Visitar site"
    }
  };
  
  const urlRegex = /(https?:\/\/[^\s]+|maps\.app\.goo\.gl\/[^\s]+)/g;
  return text.replace(urlRegex, rawUrl => {
    let cleanUrl = rawUrl.replace(/[),.]+$/, "");
    if (!cleanUrl.startsWith("http")) {
      cleanUrl = "https://" + cleanUrl;
    }
    
    let buttonText = buttonTexts.website[currentLanguage]; // Default
    
    if (cleanUrl.includes('maps.app.goo.gl') || cleanUrl.includes('google.com/maps')) {
      buttonText = buttonTexts.maps[currentLanguage];
    } else if (cleanUrl.includes('facebook.com')) {
      buttonText = buttonTexts.facebook[currentLanguage];
    } else if (cleanUrl.includes('instagram.com')) {
      buttonText = buttonTexts.instagram[currentLanguage];
    }
    
    return `
      <a href="${cleanUrl}"
         target="_blank"
         rel="noopener noreferrer"
         class="chat-link">
         ${buttonText}
      </a>
    `;
  });
}

// Datos del menú
// Elementos del menú por idioma
const menuItemsData = {
  es: [
    { title: "Tostadas", description: "Crujientes y frescas, preparadas con mariscos al momento como camarón, pescado o pulpo. Se acompañan con salsas de la casa, vegetales frescos y guarniciones que resaltan la textura y el auténtico sabor del mar." },
    { title: "Empanadas y Quesadillas", description: "Doradas y reconfortantes, rellenas de mariscos y quesos cuidadosamente seleccionados. Preparadas para disfrutarse calientes, combinan tradición, sabor y una textura irresistible." },
    { title: "Tacos", description: "Servidos en tortillas suaves o doradas, elaborados con mariscos frescos o carnes, acompañados de ingredientes bien balanceados que celebran el sabor del mar en cada bocado." },
    { title: "Caldos y Sopas", description: "Preparaciones calientes y llenas de sabor, que van desde caldos tradicionales como Xóchitl y Tlalpeño hasta sopa de tortilla. Ideales para reconfortar y disfrutar la esencia del mar con calma." },
    { title: "Cócteles", description: "Clásicos y refrescantes, preparados con mariscos seleccionados, salsas equilibradas y toques cítricos. Perfectos para abrir el apetito y disfrutar sabores frescos y bien definidos." },
    { title: "Camarones", description: "Una amplia variedad de preparaciones que van desde empanizados, al ajo o a la diabla, hasta recetas especiales como momia, tempura, al coco o zarandeados a la parrilla, siempre destacando su frescura y sabor." },
    { title: "Ostiones y Jaibas", description: "Delicias del mar servidas frescas o preparadas, incluyendo jaibas rellenas y opciones con sabores intensos, ideales para quienes disfrutan mariscos con carácter y textura." },
    { title: "Ensaladas", description: "Frescas y ligeras, elaboradas con vegetales seleccionados y opciones con proteína, pensadas para quienes buscan equilibrio sin sacrificar sabor." },
    { title: "Aguachiles", description: "Preparados al momento con mariscos frescos, salsas intensas, chiles y toques cítricos que ofrecen una experiencia vibrante, refrescante y llena de carácter." },
    { title: "Molcajetes", description: "Preparaciones abundantes servidas calientes, con mariscos, salsas tradicionales y guarniciones, ideales para compartir y disfrutar sin prisa." },
    { title: "De las Redes", description: "Pescados frescos del día, seleccionados según disponibilidad y preparados de forma sencilla, permitiendo que su sabor natural sea el protagonista." },
    { title: "Pastas", description: "Pastas preparadas al dente, cremosas o ligeras, como Alfredo o Bolognesa, combinadas con salsas bien equilibradas y opciones con mariscos." },
    { title: "Frutos del Mar al Sartén y a la Parrilla", description: "Mariscos preparados al punto, como camarones, pulpo y pescados, cocinados al sartén o a la parrilla para resaltar su frescura y textura natural." },
    { title: "Entradas", description: "El inicio ideal de la experiencia, con opciones como guacamole, queso fundido y tacos dorados, pensadas para abrir el apetito o compartir al centro." },
    { title: "Sopas y Pastas", description: "Platillos reconfortantes que combinan recetas tradicionales mexicanas con pastas clásicas, ideales para una comida completa y balanceada." },
    { title: "Especialidades", description: "Creaciones representativas de la casa, que incluyen cortes, fajitas estilo Tampico, enchiladas y platillos cuidadosamente preparados con el sello de Casa Laguna." },
    { title: "Favoritos", description: "Los platillos más pedidos del menú, como hamburguesas Angus, pepito, club sándwich, boneless y alitas, reconocidos por su sabor y consistencia." },
    { title: "Menú de Niños", description: "Opciones pensadas especialmente para los más pequeños, como mini hamburguesa, boneless y pasta al gusto, en porciones adecuadas y fáciles de disfrutar." },
    { title: "Postres", description: "El cierre perfecto de la experiencia, con flan de queso de cabra, crepas, helados, pasteles y postres tradicionales para terminar con un toque dulce." }
  ],
  en: [
    { title: "Tostadas", description: "Crispy and fresh, prepared with fresh seafood such as shrimp, fish or octopus. Accompanied by house sauces, fresh vegetables and garnishes that highlight the texture and authentic flavor of the sea." },
    { title: "Empanadas and Quesadillas", description: "Golden and comforting, filled with carefully selected seafood and cheeses. Prepared to be enjoyed hot, combining tradition, flavor and an irresistible texture." },
    { title: "Tacos", description: "Served in soft or golden tortillas, made with fresh seafood or meats, accompanied by well-balanced ingredients that celebrate the flavor of the sea in every bite." },
    { title: "Broths and Soups", description: "Hot and flavorful preparations, ranging from traditional broths like Xóchitl and Tlalpeño to tortilla soup. Ideal for comforting and enjoying the essence of the sea calmly." },
    { title: "Cocktails", description: "Classic and refreshing, prepared with selected seafood, balanced sauces and citrus touches. Perfect for opening the appetite and enjoying fresh and well-defined flavors." },
    { title: "Shrimp", description: "A wide variety of preparations ranging from breaded, garlic or diabla, to special recipes like mummy, tempura, coconut or grilled zarandeados, always highlighting their freshness and flavor." },
    { title: "Oysters and Crabs", description: "Sea delicacies served fresh or prepared, including stuffed crabs and options with intense flavors, ideal for those who enjoy seafood with character and texture." },
    { title: "Salads", description: "Fresh and light, made with selected vegetables and protein options, designed for those seeking balance without sacrificing flavor." },
    { title: "Aguachiles", description: "Prepared at the moment with fresh seafood, intense sauces, chiles and citrus touches that offer a vibrant, refreshing and full of character experience." },
    { title: "Molcajetes", description: "Abundant preparations served hot, with seafood, traditional sauces and garnishes, ideal for sharing and enjoying without hurry." },
    { title: "From the Nets", description: "Fresh daily fish, selected according to availability and prepared simply, allowing their natural flavor to be the protagonist." },
    { title: "Pastas", description: "Pastas prepared al dente, creamy or light, like Alfredo or Bolognese, combined with well-balanced sauces and seafood options." },
    { title: "Seafood in Skillet and Grilled", description: "Seafood prepared to perfection, such as shrimp, octopus and fish, cooked in skillet or grilled to highlight their freshness and natural texture." },
    { title: "Appetizers", description: "The ideal start to the experience, with options like guacamole, melted cheese and golden tacos, designed to open the appetite or share in the center." },
    { title: "Soups and Pastas", description: "Comforting dishes that combine traditional Mexican recipes with classic pastas, ideal for a complete and balanced meal." },
    { title: "Specialties", description: "Representative creations of the house, including cuts, Tampico-style fajitas, enchiladas and dishes carefully prepared with the Casa Laguna seal." },
    { title: "Favorites", description: "The most ordered dishes on the menu, such as Angus burgers, pepito, club sandwich, boneless and wings, recognized for their flavor and consistency." },
    { title: "Children's Menu", description: "Options specially designed for the little ones, such as mini burger, boneless and pasta to taste, in appropriate portions and easy to enjoy." },
    { title: "Desserts", description: "The perfect closing of the experience, with goat cheese flan, crepes, ice creams, cakes and traditional desserts to end with a sweet touch." }
  ],
  fr: [
    { title: "Tostadas", description: "Croustillantes et fraîches, préparées avec des fruits de mer frais comme la crevette, le poisson ou le poulpe. Accompagnées de sauces maison, légumes frais et garnitures qui mettent en valeur la texture et le véritable goût de la mer." },
    { title: "Empanadas et Quesadillas", description: "Dorées et réconfortantes, farcies de fruits de mer et fromages soigneusement sélectionnés. Préparées pour être dégustées chaudes, elles combinent tradition, saveur et une texture irrésistible." },
    { title: "Tacos", description: "Servis dans des tortillas souples ou dorées, élaborés avec des fruits de mer frais ou viandes, accompagnés d'ingrédients bien équilibrés qui célèbrent le goût de la mer à chaque bouchée." },
    { title: "Bouillons et Soupes", description: "Préparations chaudes et savoureuses, allant des bouillons traditionnels comme Xóchitl et Tlalpeño à la soupe de tortilla. Idéales pour réconforter et profiter de l'essence de la mer avec calme." },
    { title: "Cocktails", description: "Classiques et rafraîchissants, préparés avec des fruits de mer sélectionnés, sauces équilibrées et touches d'agrumes. Parfaits pour ouvrir l'appétit et profiter de saveurs fraîches et bien définies." },
    { title: "Crevettes", description: "Une large variété de préparations allant des panées, à l'ail ou diabla, aux recettes spéciales comme momie, tempura, coco ou zarandeados grillés, mettant toujours en valeur leur fraîcheur et saveur." },
    { title: "Huîtres et Crabes", description: "Délices de la mer servis frais ou préparés, incluant des crabes farcis et options aux saveurs intenses, idéales pour ceux qui aiment les fruits de mer avec du caractère et de la texture." },
    { title: "Salades", description: "Fraîches et légères, élaborées avec des légumes sélectionnés et options protéinées, conçues pour ceux qui recherchent l'équilibre sans sacrifier le goût." },
    { title: "Aguachiles", description: "Préparés sur le moment avec des fruits de mer frais, sauces intenses, piments et touches d'agrumes qui offrent une expérience vibrante, rafraîchissante et pleine de caractère." },
    { title: "Molcajetes", description: "Préparations abondantes servies chaudes, avec fruits de mer, sauces traditionnelles et garnitures, idéales pour partager et profiter sans hâte." },
    { title: "Des Filets", description: "Poissons frais du jour, sélectionnés selon la disponibilité et préparés simplement, permettant à leur saveur naturelle d'être le protagoniste." },
    { title: "Pâtes", description: "Pâtes préparées al dente, crémeuses ou légères, comme Alfredo ou Bolognaise, combinées avec des sauces bien équilibrées et options aux fruits de mer." },
    { title: "Fruits de Mer à la Poêle et Grillés", description: "Fruits de mer préparés à la perfection, comme crevettes, poulpe et poissons, cuits à la poêle ou grillés pour mettre en valeur leur fraîcheur et texture naturelle." },
    { title: "Entrées", description: "Le début idéal de l'expérience, avec des options comme guacamole, fromage fondu et tacos dorés, conçues pour ouvrir l'appétit ou partager au centre." },
    { title: "Soupes et Pâtes", description: "Plats réconfortants qui combinent recettes traditionnelles mexicaines et pâtes classiques, idéales pour un repas complet et équilibré." },
    { title: "Spécialités", description: "Créations représentatives de la maison, incluant coupes, fajitas style Tampico, enchiladas et plats soigneusement préparés avec le sceau Casa Laguna." },
    { title: "Favoris", description: "Les plats les plus commandés du menu, comme hamburgers Angus, pepito, club sandwich, boneless et ailes, reconnus pour leur saveur et consistance." },
    { title: "Menu Enfants", description: "Options spécialement conçues pour les plus petits, comme mini hamburger, boneless et pâtes au goût, en portions appropriées et faciles à déguster." },
    { title: "Desserts", description: "La clôture parfaite de l'expérience, avec flan au fromage de chèvre, crêpes, glaces, gâteaux et desserts traditionnels pour terminer avec une touche sucrée." }
  ],
  pt: [
    { title: "Tostadas", description: "Crocantes e frescas, preparadas com frutos do mar frescos como camarão, peixe ou polvo. Acompanhadas de molhos caseiros, vegetais frescos e coberturas que destacam a textura e o verdadeiro sabor do mar." },
    { title: "Empanadas e Quesadillas", description: "Douradas e reconfortantes, recheadas com frutos do mar e queijos cuidadosamente selecionados. Preparadas para serem saboreadas quentes, combinam tradição, sabor e uma textura irresistível." },
    { title: "Tacos", description: "Servidos em tortillas macias ou douradas, elaborados com frutos do mar frescos ou carnes, acompanhados de ingredientes bem equilibrados que celebram o sabor do mar em cada mordida." },
    { title: "Caldos e Sopas", description: "Preparações quentes e saborosas, desde caldos tradicionais como Xóchitl e Tlalpeño até sopa de tortilla. Ideais para reconfortar e desfrutar da essência do mar com calma." },
    { title: "Coquetéis", description: "Clássicos e refrescantes, preparados com frutos do mar selecionados, molhos equilibrados e toques cítricos. Perfeitos para abrir o apetite e desfrutar de sabores frescos e bem definidos." },
    { title: "Camarōes", description: "Uma ampla variedade de preparações, desde empanados, ao alho ou diabla, até receitas especiais como múmia, tempura, coco ou zarandeados grelhados, sempre destacando sua frescura e sabor." },
    { title: "Ostras e Caranguejos", description: "Delícias do mar servidas frescas ou preparadas, incluindo caranguejos recheados e opções com sabores intensos, ideais para aqueles que gostam de frutos do mar com caráter e textura." },
    { title: "Saladas", description: "Frescas e leves, elaboradas com vegetais selecionados e opções proteicas, concebidas para aqueles que buscam equilíbrio sem sacrificar o sabor." },
    { title: "Aguachiles", description: "Preparados no momento com frutos do mar frescos, molhos intensos, pimentas e toques cítricos que oferecem uma experiência vibrante, refrescante e cheia de caráter." },
    { title: "Molcajetes", description: "Preparações abundantes servidas quentes, com frutos do mar, molhos tradicionais e coberturas, ideais para compartilhar e desfrutar sem pressa." },
    { title: "Das Redes", description: "Peixes frescos do dia, selecionados conforme disponibilidade e preparados de forma simples, permitindo que seu sabor natural seja o protagonista." },
    { title: "Massas", description: "Massas preparadas al dente, cremosas ou leves, como Alfredo ou Bolognaise, combinadas com molhos bem equilibrados e opções com frutos do mar." },
    { title: "Frutos do Mar na Panela e na Grelha", description: "Frutos do mar preparados à perfeição, como camarões, polvo e peixes, cozidos na panela ou grelhados para destacar sua frescura e textura natural." },
    { title: "Entradas", description: "O início ideal da experiência, com opções como guacamole, queijo derretido e tacos dourados, concebidas para abrir o apetite ou compartilhar no centro." },
    { title: "Sopas e Massas", description: "Pratos reconfortantes que combinam receitas tradicionais mexicanas e massas clássicas, ideais para uma refeição completa e equilibrada." },
    { title: "Especialidades", description: "Criações representativas da casa, incluindo cortes, fajitas estilo Tampico, enchiladas e pratos cuidadosamente preparados com o selo Casa Laguna." },
    { title: "Favoritos", description: "Os pratos mais pedidos do menu, como hambúrgueres Angus, pepito, club sandwich, boneless e asas, reconhecidos por seu sabor e consistência." },
    { title: "Cardápio Infantil", description: "Opções especialmente concebidas para os mais pequenos, como mini hambúrguer, boneless e massas ao gosto, em porções adequadas e fáceis de degustar." },
    { title: "Sobremesas", description: "O encerramento perfeito da experiência, com flan de queijo de cabra, crepes, sorvetes, bolos e sobremesas tradicionais para terminar com um toque doce." }
  ]
};

let currentMenuIndex = 0;

// Variable dinámica que se actualiza según el idioma
// Se inicializa después de que menuItemsData está completamente definido
let menuItems = menuItemsData[currentLanguage];

// Mostrar carrusel de menú
function showMenuCarousel() {
  let menuContainer = document.getElementById("menu-container");
  
  // Recrear el menu-container si no existe
  if (!menuContainer) {
    menuContainer = document.createElement("div");
    menuContainer.id = "menu-container";
    menuContainer.className = "menu-container hidden";
    menuContainer.innerHTML = `
      <button class="menu-close-btn" onclick="closeMenuCarousel()" title="Cerrar menú" aria-label="Cerrar menú">
        <i class="fa-solid fa-xmark"></i>
      </button>
      <div class="menu-nav">
        <button id="menu-prev" class="menu-arrow menu-arrow-left" onclick="previousMenuItem()">
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        <div class="menu-display-wrapper">
          <div class="menu-display" id="menu-display"></div>
          <div class="menu-counter">
            <span id="menu-current">1</span> / <span id="menu-total">19</span>
          </div>
        </div>
        <button id="menu-next" class="menu-arrow menu-arrow-right" onclick="nextMenuItem()">
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    `;
    chat.appendChild(menuContainer);
  }
  
  // Ocultar acciones rápidas si están visibles
  const quickActions = document.querySelector('.quick-actions');
  if (quickActions) {
    quickActions.remove();
  }
  
  // Ocultar todos los mensajes del chat
  const messages = chat.querySelectorAll('.message');
  messages.forEach(msg => {
    msg.style.display = 'none';
  });
  
  currentMenuIndex = 0;
  menuContainer.classList.remove("hidden");
  displayMenuItem(0, 'next', true);
  
  // Desplazarse suavemente al menú
  setTimeout(() => {
    menuContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, 150);
}

// Mostrar un elemento específico del menú
function displayMenuItem(index, direction = 'next', isInitial = false) {
  const item = menuItems[index];
  const menuDisplay = document.getElementById("menu-display");
  
  if (menuDisplay && item) {
    // Remover clases de animación previas
    menuDisplay.classList.remove('slide-left', 'slide-left-enter', 'slide-right', 'slide-right-enter', 'menu-first-appear');
    
    // Forzar reflow para reiniciar la animación
    void menuDisplay.offsetWidth;
    
    if (isInitial) {
      // Animación de aparición inicial
      menuDisplay.innerHTML = `
        <div class="menu-item">
          <div class="menu-image"></div>
          <div class="menu-title">${item.title}</div>
          <div class="menu-description">${item.description}</div>
        </div>
      `;
      menuDisplay.classList.add('menu-first-appear');
    } else {
      // Aplicar animación de salida
      if (direction === 'next') {
        menuDisplay.classList.add('slide-left');
      } else if (direction === 'prev') {
        menuDisplay.classList.add('slide-right');
      }
      
      // Esperar a que termine la animación de salida y mostrar nuevo contenido
      setTimeout(() => {
        menuDisplay.innerHTML = `
          <div class="menu-item">
            <div class="menu-image"></div>
            <div class="menu-title">${item.title}</div>
            <div class="menu-description">${item.description}</div>
          </div>
        `;
        
        // Remover clase de salida y aplicar animación de entrada
        menuDisplay.classList.remove('slide-left', 'slide-right');
        void menuDisplay.offsetWidth;
        
        if (direction === 'next') {
          menuDisplay.classList.add('slide-left-enter');
        } else if (direction === 'prev') {
          menuDisplay.classList.add('slide-right-enter');
        }
      }, 200);
    }
    
    // Actualizar contador
    document.getElementById("menu-current").textContent = index + 1;
    document.getElementById("menu-total").textContent = menuItems.length;
    
    // Habilitar/deshabilitar botones
    document.getElementById("menu-prev").disabled = index === 0;
    document.getElementById("menu-next").disabled = index === menuItems.length - 1;
  }
}

// Siguiente elemento del menú
function nextMenuItem() {
  if (currentMenuIndex < menuItems.length - 1) {
    currentMenuIndex++;
    displayMenuItem(currentMenuIndex, 'next');
  }
}

// Elemento anterior del menú
function previousMenuItem() {
  if (currentMenuIndex > 0) {
    currentMenuIndex--;
    displayMenuItem(currentMenuIndex, 'prev');
  }
}

// Cerrar carrusel de menú
function closeMenuCarousel() {
  const menuContainer = document.getElementById("menu-container");
  if (menuContainer) {
    // Agregar clase de cierre con animación
    menuContainer.classList.add("closing");
    
    // Esperar a que termine la animación
    setTimeout(() => {
      menuContainer.classList.remove("closing");
      menuContainer.classList.add("hidden");
      
      // Mostrar todos los mensajes del chat nuevamente, EXCEPTO el primer mensaje de saludo
      const messages = chat.querySelectorAll('.message');
      messages.forEach((msg, index) => {
        // Saltar el primer mensaje (saludo inicial)
        if (index > 0) {
          msg.style.display = '';
        }
      });
      
      // Agregar mensaje del menú con animación después de cerrar, pero solo si no existe ya
      setTimeout(() => {
        // Verificar si el último mensaje es el del menú
        const lastMessage = messages[messages.length - 1];
        const menuMessageText = menuMessages[currentLanguage];
        
        // Solo agregar si el último mensaje NO es el mensaje del menú
        if (!lastMessage || !lastMessage.innerHTML.includes(menuMessageText)) {
          addMessage(menuMessages[currentLanguage], "bot");
        }
        
        // Mostrar botones de acciones rápidas después del mensaje
        setTimeout(() => {
          showMenuFollowUpActions();
        }, 200);
      }, 100);
    }, 400);
  }
}

/* =========================
   ENTER PARA ENVIAR
========================= */
input.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});