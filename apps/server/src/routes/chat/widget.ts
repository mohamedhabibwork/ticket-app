import { Hono } from "hono";
import {
  getConnectionInfo,
  createChatSession,
  submitOfflineMessage,
} from "@ticket-app/api/services/chatWidget";

const widget = new Hono();

widget.get("/widget.js", async (c) => {
  const script = generateWidgetRuntime();

  c.header("Content-Type", "application/javascript");
  c.header("Cache-Control", "public, max-age=3600");

  return c.body(script);
});

widget.get("/config", async (c) => {
  const widgetUuid = c.req.query("widgetUuid");
  const organizationSlug = c.req.query("orgSlug");

  if (!widgetUuid || !organizationSlug) {
    return c.json({ error: "widgetUuid and orgSlug are required" }, 400);
  }

  try {
    const config = await getConnectionInfo(widgetUuid, organizationSlug);
    if (!config) {
      return c.json({ error: "Widget not found" }, 404);
    }
    return c.json(config);
  } catch (error) {
    console.error("Error fetching widget config:", error);
    return c.json({ error: "Failed to fetch widget configuration" }, 500);
  }
});

widget.post("/session", async (c) => {
  try {
    const body = await c.req.json();
    const { widgetUuid, organizationSlug, preChatData } = body;

    if (!widgetUuid || !organizationSlug) {
      return c.json({ error: "widgetUuid and organizationSlug are required" }, 400);
    }

    const contactEmail = preChatData?.email;
    const contactName = preChatData?.name;

    const session = await createChatSession(
      widgetUuid,
      organizationSlug,
      preChatData || {},
      contactEmail,
      contactName,
    );

    if (!session) {
      return c.json({ error: "Failed to create chat session" }, 400);
    }

    return c.json({
      sessionId: session.sessionId,
      contactId: session.contactId,
      token: session.token,
    });
  } catch (error) {
    console.error("Error creating chat session:", error);
    return c.json({ error: "Failed to create chat session" }, 500);
  }
});

widget.post("/offline", async (c) => {
  try {
    const body = await c.req.json();
    const { widgetUuid, organizationSlug, email, message, name } = body;

    if (!widgetUuid || !organizationSlug || !email || !message) {
      return c.json(
        { error: "widgetUuid, organizationSlug, email, and message are required" },
        400,
      );
    }

    const success = await submitOfflineMessage(widgetUuid, organizationSlug, email, message, name);

    if (!success) {
      return c.json({ error: "Failed to submit offline message" }, 400);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error submitting offline message:", error);
    return c.json({ error: "Failed to submit offline message" }, 500);
  }
});

function generateWidgetRuntime(): string {
  return `/**
 * Binaka Live Chat Widget Runtime
 * Pure vanilla JavaScript - no framework dependencies
 * Supports RTL (Arabic) text direction
 * Responsive for mobile devices
 * Async loading
 */
(function() {
  'use strict';

  var BinakaWidget = window.BinakaWidget || {};

  BinakaWidget.config = null;
  BinakaWidget.ws = null;
  BinakaWidget.sessionId = null;
  BinakaWidget.contactId = null;
  BinakaWidget.organizationId = null;
  BinakaWidget.isConnected = false;
  BinakaWidget.isAgentOnline = false;
  BinakaWidget.queuedMessages = [];
  BinakaWidget.typingTimeout = null;
  BinakaWidget.notificationPermission = 'default';
  BinakaWidget.unreadCount = 0;
  BinakaWidget.isWidgetOpen = false;
  BinakaWidget.preChatCompleted = false;
  BinakaWidget.sessionToken = null;

  BinakaWidget.init = function(config) {
    if (!config || !config.widgetUuid || !config.organizationSlug) {
      console.error('Binaka: Invalid configuration');
      return;
    }

    BinakaWidget.config = {
      widgetUuid: config.widgetUuid,
      organizationSlug: config.organizationSlug,
      apiBaseUrl: config.apiBaseUrl || window.location.origin,
      position: config.position || 'bottom-right',
      theme: config.theme || {},
      greetingMessage: config.greetingMessage,
      agentUnavailableMessage: config.agentUnavailableMessage
    };

    BinakaWidget.applyStyles();
    BinakaWidget.bindEvents();
    BinakaWidget.fetchWidgetConfig();
  };

  BinakaWidget.applyStyles = function() {
    var theme = BinakaWidget.config.theme;
    var primaryColor = theme.primaryColor || '#0070f3';
    var bgColor = theme.backgroundColor || '#ffffff';
    var fontFamily = theme.fontFamily || "system-ui, -apple-system, sans-serif";
    var borderRadius = theme.borderRadius || 8;
    var zIndex = theme.zIndex || 999999;

    var positionStyles = {
      'bottom-right': 'bottom: 20px; right: 20px;',
      'bottom-left': 'bottom: 20px; left: 20px;',
      'top-right': 'top: 20px; right: 20px;',
      'top-left': 'top: 20px; left: 20px;'
    };

    var posStyle = positionStyles[BinakaWidget.config.position] || positionStyles['bottom-right'];
    var isRTL = document.documentElement.dir === 'rtl' || document.documentElement.lang === 'ar';

    var styles = document.createElement('style');
    styles.id = 'binaka-widget-styles';
    styles.textContent = \`
      #binaka-launcher {
        position: fixed;
        \${posStyle}
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: \${primaryColor};
        color: white;
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        transition: transform 0.2s, box-shadow 0.2s;
        z-index: \${zIndex};
      }
      #binaka-launcher:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      }
      #binaka-launcher.opened {
        transform: rotate(45deg);
      }
      #binaka-launcher.has-unread::after {
        content: attr(data-count);
        position: absolute;
        top: -4px;
        right: -4px;
        background: #ff3b30;
        color: white;
        font-size: 12px;
        font-weight: bold;
        min-width: 20px;
        height: 20px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 4px;
      }
      #binaka-widget-container {
        position: fixed;
        \${posStyle}
        width: 380px;
        max-width: calc(100vw - 40px);
        max-height: calc(100vh - 100px);
        background: \${bgColor};
        border-radius: \${borderRadius}px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        display: none;
        flex-direction: column;
        overflow: hidden;
        z-index: \${zIndex - 1};
        font-family: \${fontFamily};
        direction: \${isRTL ? 'rtl' : 'ltr'};
      }
      #binaka-widget-container.opened {
        display: flex;
      }
      .binaka-header {
        background: \${primaryColor};
        color: white;
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
      }
      .binaka-header-title {
        font-weight: 600;
        font-size: 16px;
      }
      .binaka-header-status {
        font-size: 12px;
        opacity: 0.9;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .binaka-status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #4cd964;
      }
      .binaka-status-dot.offline {
        background: #ff3b30;
      }
      .binaka-status-dot.away {
        background: #ffcc00;
      }
      .binaka-close-btn {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 24px;
        padding: 0;
        line-height: 1;
      }
      .binaka-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-height: 200px;
      }
      .binaka-message {
        max-width: 80%;
        padding: 10px 14px;
        border-radius: 12px;
        font-size: 14px;
        line-height: 1.4;
        word-wrap: break-word;
      }
      .binaka-message.agent {
        background: #f0f0f0;
        color: #333;
        align-self: flex-start;
        border-bottom-\${isRTL ? 'right' : 'left'}-radius: 4px;
      }
      .binaka-message.contact {
        background: \${primaryColor};
        color: white;
        align-self: flex-end;
        border-bottom-\${isRTL ? 'left' : 'right'}-radius: 4px;
      }
      .binaka-message.system {
        background: #fff3cd;
        color: #856404;
        align-self: center;
        text-align: center;
        font-size: 12px;
        max-width: 90%;
      }
      .binaka-message time {
        display: block;
        font-size: 10px;
        opacity: 0.7;
        margin-top: 4px;
      }
      .binaka-typing-indicator {
        display: none;
        align-self: flex-start;
        background: #f0f0f0;
        padding: 10px 14px;
        border-radius: 12px;
        border-bottom-\${isRTL ? 'right' : 'left'}-radius: 4px;
      }
      .binaka-typing-indicator.visible {
        display: flex;
        gap: 4px;
        align-items: center;
      }
      .binaka-typing-dot {
        width: 8px;
        height: 8px;
        background: #999;
        border-radius: 50%;
        animation: binaka-typing 1.4s infinite;
      }
      .binaka-typing-dot:nth-child(2) { animation-delay: 0.2s; }
      .binaka-typing-dot:nth-child(3) { animation-delay: 0.4s; }
      @keyframes binaka-typing {
        0%, 100% { transform: translateY(0); opacity: 0.4; }
        50% { transform: translateY(-4px); opacity: 1; }
      }
      .binaka-prechat-form {
        padding: 16px;
        display: none;
        flex-direction: column;
        gap: 12px;
        overflow-y: auto;
      }
      .binaka-prechat-form.visible {
        display: flex;
      }
      .binaka-prechat-form h3 {
        margin: 0 0 8px 0;
        font-size: 16px;
        color: #333;
      }
      .binaka-prechat-form p {
        margin: 0 0 16px 0;
        font-size: 14px;
        color: #666;
      }
      .binaka-input {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        font-family: inherit;
        box-sizing: border-box;
      }
      .binaka-input:focus {
        outline: none;
        border-color: \${primaryColor};
      }
      .binaka-select {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        font-family: inherit;
        background: white;
        cursor: pointer;
      }
      .binaka-textarea {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        font-family: inherit;
        resize: vertical;
        min-height: 80px;
        box-sizing: border-box;
      }
      .binaka-btn {
        background: \${primaryColor};
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        width: 100%;
        transition: opacity 0.2s;
      }
      .binaka-btn:hover {
        opacity: 0.9;
      }
      .binaka-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .binaka-composer {
        padding: 12px 16px;
        border-top: 1px solid #eee;
        display: none;
        gap: 8px;
        align-items: center;
        flex-shrink: 0;
      }
      .binaka-composer.visible {
        display: flex;
      }
      .binaka-composer input {
        flex: 1;
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 20px;
        font-size: 14px;
        font-family: inherit;
      }
      .binaka-composer input:focus {
        outline: none;
      }
      .binaka-send-btn {
        background: \${primaryColor};
        color: white;
        border: none;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: opacity 0.2s;
      }
      .binaka-send-btn:hover {
        opacity: 0.9;
      }
      .binaka-send-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .binaka-offline-form {
        padding: 24px 16px;
        text-align: center;
        display: none;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }
      .binaka-offline-form.visible {
        display: flex;
      }
      .binaka-offline-form h3 {
        margin: 0;
        color: #666;
        font-size: 16px;
      }
      .binaka-offline-form p {
        color: #999;
        font-size: 14px;
        margin: 0;
      }
      .binaka-notification {
        position: fixed;
        bottom: 90px;
        \${BinakaWidget.config.position === 'bottom-right' || BinakaWidget.config.position === 'top-right' ? 'right: 20px;' : 'left: 20px;'}
        background: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-size: 14px;
        max-width: 300px;
        z-index: \${zIndex + 1};
        display: none;
        animation: binaka-slide-in 0.3s ease;
      }
      .binaka-notification.visible {
        display: block;
      }
      @keyframes binaka-slide-in {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .binaka-notification-close {
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        font-size: 16px;
        cursor: pointer;
        color: #999;
      }
      @media (max-width: 480px) {
        #binaka-widget-container {
          width: calc(100vw - 20px);
          max-height: calc(100vh - 80px);
          bottom: 70px !important;
        }
        #binaka-launcher {
          width: 56px;
          height: 56px;
        }
      }
    \`;
    document.head.appendChild(styles);
  };

  BinakaWidget.bindEvents = function() {
    var launcher = document.getElementById('binaka-launcher');
    var container = document.getElementById('binaka-widget-container');
    var closeBtn = container ? container.querySelector('.binaka-close-btn') : null;

    if (launcher) {
      launcher.addEventListener('click', BinakaWidget.toggleWidget);
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', BinakaWidget.closeWidget);
    }

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && BinakaWidget.isWidgetOpen) {
        BinakaWidget.closeWidget();
      }
    });

    BinakaWidget.requestNotificationPermission();
  };

  BinakaWidget.toggleWidget = function() {
    if (BinakaWidget.isWidgetOpen) {
      BinakaWidget.closeWidget();
    } else {
      BinakaWidget.openWidget();
    }
  };

  BinakaWidget.openWidget = function() {
    var container = document.getElementById('binaka-widget-container');
    var launcher = document.getElementById('binaka-launcher');

    if (container) {
      container.classList.add('opened');
      BinakaWidget.isWidgetOpen = true;
    }

    if (launcher) {
      launcher.classList.add('opened');
      launcher.removeAttribute('data-count');
      launcher.classList.remove('has-unread');
    }

    BinakaWidget.unreadCount = 0;

    var messagesContainer = document.getElementById('binaka-messages-container');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    var messageInput = document.getElementById('binaka-message-input');
    if (messageInput && BinakaWidget.preChatCompleted) {
      messageInput.focus();
    }
  };

  BinakaWidget.closeWidget = function() {
    var container = document.getElementById('binaka-widget-container');
    var launcher = document.getElementById('binaka-launcher');

    if (container) {
      container.classList.remove('opened');
    }

    if (launcher) {
      launcher.classList.remove('opened');
    }

    BinakaWidget.isWidgetOpen = false;
  };

  BinakaWidget.fetchWidgetConfig = function() {
    var apiBase = BinakaWidget.config.apiBaseUrl;
    var widgetUuid = BinakaWidget.config.widgetUuid;
    var orgSlug = BinakaWidget.config.organizationSlug;

    fetch(apiBase + '/chat/config?widgetUuid=' + encodeURIComponent(widgetUuid) + '&orgSlug=' + encodeURIComponent(orgSlug))
      .then(function(response) {
        if (!response.ok) throw new Error('Failed to fetch widget config');
        return response.json();
      })
      .then(function(config) {
        BinakaWidget.handleWidgetConfig(config);
      })
      .catch(function(error) {
        console.error('Binaka: Error fetching widget config:', error);
        BinakaWidget.showOfflineState();
      });
  };

  BinakaWidget.handleWidgetConfig = function(config) {
    BinakaWidget.organizationId = config.organizationId;
    BinakaWidget.isAgentOnline = config.isAgentOnline;

    BinakaWidget.updateAgentStatus();

    if (!BinakaWidget.isAgentOnline && config.offlineMessageEnabled) {
      BinakaWidget.showOfflineForm(config);
    } else if (BinakaWidget.config.greetingMessage) {
      BinakaWidget.showGreetingMessage(BinakaWidget.config.greetingMessage);
    }

    if (config.preChatFormFields && config.preChatFormFields.length > 0) {
      BinakaWidget.showPreChatForm(config.preChatFormFields);
    } else {
      BinakaWidget.startChat({});
    }
  };

  BinakaWidget.updateAgentStatus = function() {
    var statusEl = document.querySelector('.binaka-header-status');
    var statusDot = statusEl ? statusEl.querySelector('.binaka-status-dot') : null;

    if (statusDot) {
      statusDot.classList.remove('offline', 'away');
      if (!BinakaWidget.isAgentOnline) {
        statusDot.classList.add('offline');
        if (statusEl) {
          var textNode = statusEl.lastChild;
          if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            textNode.textContent = ' ' + (BinakaWidget.config.agentUnavailableMessage || 'Offline');
          }
        }
      }
    }
  };

  BinakaWidget.showPreChatForm = function(fields) {
    var formContainer = document.getElementById('binaka-prechat-form');
    if (!formContainer) return;

    var html = '<h3>' + (fields[0] && fields[0].label ? 'Before we start...' : 'Quick Info') + '</h3>';

    fields.forEach(function(field) {
      var required = field.required ? 'required' : '';
      var placeholder = field.placeholder || '';

      if (field.type === 'textarea') {
        html += '<textarea class="binaka-textarea binaka-input" name="' + field.name + '" placeholder="' + placeholder + '" ' + required + ' rows="3"></textarea>';
      } else if (field.type === 'select' && field.options) {
        html += '<select class="binaka-select binaka-input" name="' + field.name + '" ' + required + '>';
        html += '<option value="">Select ' + field.label + '</option>';
        field.options.forEach(function(option) {
          html += '<option value="' + option + '">' + option + '</option>';
        });
        html += '</select>';
      } else {
        html += '<input type="' + field.type + '" class="binaka-input" name="' + field.name + '" placeholder="' + placeholder + '" ' + required + ' />';
      }
    });

    html += '<button type="button" class="binaka-btn" id="binaka-start-chat">' + (fields.length > 0 ? 'Start Chat' : 'Continue') + '</button>';

    formContainer.innerHTML = html;
    formContainer.classList.add('visible');

    var startBtn = document.getElementById('binaka-start-chat');
    if (startBtn) {
      startBtn.addEventListener('click', function() {
        BinakaWidget.submitPreChatForm(fields);
      });
    }
  };

  BinakaWidget.submitPreChatForm = function(fields) {
    var formData = {};
    var isValid = true;

    fields.forEach(function(field) {
      var input = document.querySelector('[name="' + field.name + '"]');
      if (input) {
        var value = input.value.trim();
        if (field.required && !value) {
          isValid = false;
          input.style.borderColor = '#ff3b30';
        } else {
          input.style.borderColor = '#ddd';
          formData[field.name] = value;
        }
      }
    });

    if (!isValid) return;

    BinakaWidget.startChat(formData);
  };

  BinakaWidget.startChat = function(preChatData) {
    var formContainer = document.getElementById('binaka-prechat-form');
    if (formContainer) {
      formContainer.classList.remove('visible');
      formContainer.style.display = 'none';
    }

    BinakaWidget.preChatCompleted = true;

    var apiBase = BinakaWidget.config.apiBaseUrl;
    var widgetUuid = BinakaWidget.config.widgetUuid;
    var orgSlug = BinakaWidget.config.organizationSlug;

    fetch(apiBase + '/chat/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        widgetUuid: widgetUuid,
        organizationSlug: orgSlug,
        preChatData: preChatData
      })
    })
      .then(function(response) {
        if (!response.ok) throw new Error('Failed to create chat session');
        return response.json();
      })
      .then(function(session) {
        BinakaWidget.sessionId = session.sessionId;
        BinakaWidget.contactId = session.contactId;
        BinakaWidget.sessionToken = session.token;
        BinakaWidget.connectWebSocket();

        var composer = document.getElementById('binaka-composer');
        if (composer) {
          composer.classList.add('visible');
          BinakaWidget.bindComposerEvents();
        }
      })
      .catch(function(error) {
        console.error('Binaka: Error starting chat:', error);
        BinakaWidget.showError('Failed to connect. Please try again.');
      });
  };

  BinakaWidget.connectWebSocket = function() {
    var apiBase = BinakaWidget.config.apiBaseUrl.replace(/^http/, 'ws');
    var wsUrl = apiBase + '/ws/chat?sessionId=' + BinakaWidget.sessionId + '&orgId=' + BinakaWidget.organizationId + '&token=' + BinakaWidget.sessionToken + '&isAgent=false';

    BinakaWidget.ws = new WebSocket(wsUrl);

    BinakaWidget.ws.onopen = function() {
      BinakaWidget.isConnected = true;
      BinakaWidget.sendQueuedMessages();

      BinakaWidget.ws.send(JSON.stringify({
        type: 'join',
        payload: { contactId: BinakaWidget.contactId }
      }));
    };

    BinakaWidget.ws.onmessage = function(event) {
      try {
        var message = JSON.parse(event.data);
        BinakaWidget.handleWebSocketMessage(message);
      } catch (e) {
        console.error('Binaka: Error parsing message:', e);
      }
    };

    BinakaWidget.ws.onclose = function() {
      BinakaWidget.isConnected = false;
    };

    BinakaWidget.ws.onerror = function(error) {
      console.error('Binaka: WebSocket error:', error);
      BinakaWidget.isConnected = false;
    };
  };

  BinakaWidget.handleWebSocketMessage = function(message) {
    switch (message.type) {
      case 'message':
        BinakaWidget.displayMessage(message.payload);
        if (message.payload.authorType !== 'contact' && !BinakaWidget.isWidgetOpen) {
          BinakaWidget.incrementUnread();
          BinakaWidget.showNotification(message.payload.body);
        }
        break;

      case 'typing':
        BinakaWidget.handleTypingIndicator(message.payload);
        break;

      case 'join':
        BinakaWidget.displaySystemMessage('An agent has joined the chat');
        BinakaWidget.isAgentOnline = true;
        BinakaWidget.updateAgentStatus();
        break;

      case 'leave':
        BinakaWidget.displaySystemMessage('Agent has left the conversation');
        break;

      case 'end':
        BinakaWidget.handleChatEnd(message.payload);
        break;

      case 'ping':
        BinakaWidget.ws.send(JSON.stringify({ type: 'pong', payload: {} }));
        break;
    }

    var messagesContainer = document.getElementById('binaka-messages-container');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  };

  BinakaWidget.displayMessage = function(payload) {
    var messagesContainer = document.getElementById('binaka-messages-container');
    if (!messagesContainer) return;

    var messageEl = document.createElement('div');
    messageEl.className = 'binaka-message ' + (payload.authorType || 'agent');

    var body = payload.body || '';
    body = BinakaWidget.escapeHtml(body);
    body = body.replace(/\\n/g, '<br>');

    var time = payload.createdAt ? BinakaWidget.formatTime(new Date(payload.createdAt)) : '';

    messageEl.innerHTML = body + (time ? '<time>' + time + '</time>' : '');

    var typingEl = document.getElementById('binaka-typing');
    if (typingEl && typingEl.classList.contains('visible')) {
      messagesContainer.insertBefore(messageEl, typingEl);
    } else {
      messagesContainer.appendChild(messageEl);
    }
  };

  BinakaWidget.displaySystemMessage = function(text) {
    var messagesContainer = document.getElementById('binaka-messages-container');
    if (!messagesContainer) return;

    var messageEl = document.createElement('div');
    messageEl.className = 'binaka-message system';
    messageEl.textContent = text;

    messagesContainer.appendChild(messageEl);
  };

  BinakaWidget.handleTypingIndicator = function(payload) {
    var typingEl = document.getElementById('binaka-typing');
    if (!typingEl) return;

    if (payload.agentTyping) {
      typingEl.classList.add('visible');
    } else {
      typingEl.classList.remove('visible');
    }
  };

  BinakaWidget.handleChatEnd = function(payload) {
    var composer = document.getElementById('binaka-composer');
    if (composer) {
      composer.classList.remove('visible');
    }

    var messageInput = document.getElementById('binaka-message-input');
    if (messageInput) {
      messageInput.disabled = true;
    }

    var sendBtn = document.getElementById('binaka-send-btn');
    if (sendBtn) {
      sendBtn.disabled = true;
    }

    BinakaWidget.displaySystemMessage('Chat ended. Thank you for chatting with us!');

    if (payload.autoConvertToTicket) {
      BinakaWidget.displaySystemMessage('A support ticket has been created for your issue.');
    }
  };

  BinakaWidget.bindComposerEvents = function() {
    var messageInput = document.getElementById('binaka-message-input');
    var sendBtn = document.getElementById('binaka-send-btn');

    if (messageInput) {
      messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          BinakaWidget.sendMessage();
        }
      });

      messageInput.addEventListener('input', function() {
        BinakaWidget.sendTypingIndicator(true);
        clearTimeout(BinakaWidget.typingTimeout);
        BinakaWidget.typingTimeout = setTimeout(function() {
          BinakaWidget.sendTypingIndicator(false);
        }, 2000);
      });
    }

    if (sendBtn) {
      sendBtn.addEventListener('click', function() {
        BinakaWidget.sendMessage();
      });
    }
  };

  BinakaWidget.sendMessage = function() {
    var messageInput = document.getElementById('binaka-message-input');
    if (!messageInput) return;

    var body = messageInput.value.trim();
    if (!body) return;

    messageInput.value = '';
    BinakaWidget.sendTypingIndicator(false);

    var messageData = {
      type: 'message',
      payload: {
        body: body,
        attachments: []
      }
    };

    if (BinakaWidget.isConnected && BinakaWidget.ws && BinakaWidget.ws.readyState === WebSocket.OPEN) {
      BinakaWidget.ws.send(JSON.stringify(messageData));
    } else {
      BinakaWidget.queuedMessages.push(messageData);
    }
  };

  BinakaWidget.sendTypingIndicator = function(isTyping) {
    if (!BinakaWidget.isConnected || !BinakaWidget.ws || BinakaWidget.ws.readyState !== WebSocket.OPEN) return;

    BinakaWidget.ws.send(JSON.stringify({
      type: 'typing',
      payload: { isTyping: isTyping }
    }));
  };

  BinakaWidget.sendQueuedMessages = function() {
    while (BinakaWidget.queuedMessages.length > 0) {
      var msg = BinakaWidget.queuedMessages.shift();
      if (BinakaWidget.ws && BinakaWidget.ws.readyState === WebSocket.OPEN) {
        BinakaWidget.ws.send(JSON.stringify(msg));
      }
    }
  };

  BinakaWidget.showGreetingMessage = function(message) {
    var messagesContainer = document.getElementById('binaka-messages-container');
    if (!messagesContainer) return;

    var messageEl = document.createElement('div');
    messageEl.className = 'binaka-message agent';
    messageEl.textContent = message;

    messagesContainer.appendChild(messageEl);
  };

  BinakaWidget.showOfflineForm = function(config) {
    var offlineEl = document.createElement('div');
    offlineEl.className = 'binaka-offline-form visible';
    offlineEl.innerHTML = '<h3>' + (config.offlineMessageTitle || "We're offline") + '</h3>' +
      '<p>' + (config.offlineMessageBody || "Leave us a message and we'll get back to you via email.") + '</p>';

    var emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.className = 'binaka-input';
    emailInput.placeholder = 'Your email address';
    emailInput.required = true;
    offlineEl.appendChild(emailInput);

    var messageInput = document.createElement('textarea');
    messageInput.className = 'binaka-textarea binaka-input';
    messageInput.placeholder = 'How can we help?';
    messageInput.rows = 3;
    offlineEl.appendChild(messageInput);

    var submitBtn = document.createElement('button');
    submitBtn.className = 'binaka-btn';
    submitBtn.textContent = 'Send Message';
    submitBtn.addEventListener('click', function() {
      var email = emailInput.value.trim();
      var msg = messageInput.value.trim();

      if (!email || !msg) return;

      BinakaWidget.submitOfflineMessage(email, msg);
      submitBtn.disabled = true;
      submitBtn.textContent = 'Message Sent!';
    });
    offlineEl.appendChild(submitBtn);

    var formContainer = document.getElementById('binaka-prechat-form');
    if (formContainer) {
      formContainer.appendChild(offlineEl);
    }
  };

  BinakaWidget.submitOfflineMessage = function(email, message) {
    var apiBase = BinakaWidget.config.apiBaseUrl;
    var widgetUuid = BinakaWidget.config.widgetUuid;
    var orgSlug = BinakaWidget.config.organizationSlug;

    fetch(apiBase + '/chat/offline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        widgetUuid: widgetUuid,
        organizationSlug: orgSlug,
        email: email,
        message: message
      })
    })
      .then(function(response) {
        if (!response.ok) throw new Error('Failed to submit offline message');
        return response.json();
      })
      .then(function() {
        BinakaWidget.displaySystemMessage('Thank you! We will get back to you via email.');
      })
      .catch(function(error) {
        console.error('Binaka: Error submitting offline message:', error);
        BinakaWidget.showError('Failed to send message. Please try again.');
      });
  };

  BinakaWidget.showOfflineState = function() {
    BinakaWidget.isAgentOnline = false;
    BinakaWidget.updateAgentStatus();
    BinakaWidget.showOfflineForm({
      offlineMessageTitle: BinakaWidget.config.agentUnavailableMessage || "We're currently unavailable",
      offlineMessageBody: "Leave us a message and we'll get back to you via email."
    });
  };

  BinakaWidget.showError = function(message) {
    var messagesContainer = document.getElementById('binaka-messages-container');
    if (!messagesContainer) return;

    var messageEl = document.createElement('div');
    messageEl.className = 'binaka-message system';
    messageEl.textContent = message;

    messagesContainer.appendChild(messageEl);
  };

  BinakaWidget.incrementUnread = function() {
    BinakaWidget.unreadCount++;
    var launcher = document.getElementById('binaka-launcher');
    if (launcher) {
      launcher.setAttribute('data-count', BinakaWidget.unreadCount > 9 ? '9+' : String(BinakaWidget.unreadCount));
      launcher.classList.add('has-unread');
    }
  };

  BinakaWidget.showNotification = function(message) {
    if (BinakaWidget.notificationPermission !== 'granted') return;

    if (!('Notification' in window)) return;

    try {
      var notification = new Notification('Binaka Support', {
        body: message,
        icon: BinakaWidget.config.theme.primaryColor || undefined,
        tag: 'binaka-chat'
      });

      notification.onclick = function() {
        BinakaWidget.openWidget();
        notification.close();
      };

      setTimeout(function() {
        notification.close();
      }, 5000);
    } catch (e) {
      console.error('Binaka: Notification error:', e);
    }
  };

  BinakaWidget.requestNotificationPermission = function() {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'default') {
      Notification.requestPermission().then(function(permission) {
        BinakaWidget.notificationPermission = permission;
      });
    } else {
      BinakaWidget.notificationPermission = Notification.permission;
    }
  };

  BinakaWidget.formatTime = function(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return hours + ':' + minutes + ' ' + ampm;
  };

  BinakaWidget.escapeHtml = function(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  BinakaWidget.endChat = function() {
    if (BinakaWidget.ws && BinakaWidget.ws.readyState === WebSocket.OPEN) {
      BinakaWidget.ws.send(JSON.stringify({ type: 'end', payload: {} }));
    }
  };

  window.BinakaWidget = BinakaWidget;

  if (window.BINAKA_CONFIG) {
    BinakaWidget.init(window.BINAKA_CONFIG);
  }
})();
`;
}

export { widget };
