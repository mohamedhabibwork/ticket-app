export interface WidgetTheme {
  primaryColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  borderRadius?: number;
  zIndex?: number;
}

export interface PreChatFormField {
  name: string;
  label: string;
  type: "text" | "email" | "phone" | "textarea" | "select";
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

export interface ChatWidgetConfig {
  widgetUuid: string;
  organizationSlug: string;
  widgetName: string;
  position: "bottom-left" | "bottom-right" | "top-left" | "top-right";
  theme: WidgetTheme;
  preChatFormFields: PreChatFormField[];
  greetingMessage?: string;
  agentUnavailableMessage?: string;
  offlineMessageEnabled: boolean;
  offlineMessageTitle?: string;
  offlineMessageBody?: string;
  businessHours: {
    enabled: boolean;
    timezone: string;
    schedule: Record<string, { start: string; end: string }>;
  };
  allowFileUpload: boolean;
  maxFileSizeBytes: number;
  allowedFileTypes: string[];
  apiBaseUrl: string;
}

export function generateWidgetSnippet(config: ChatWidgetConfig): string {
  const {
    widgetUuid,
    organizationSlug,
    position,
    theme,
    greetingMessage,
    agentUnavailableMessage,
    apiBaseUrl,
  } = config;

  const positionStyles: Record<string, string> = {
    "bottom-right": "bottom: 20px; right: 20px;",
    "bottom-left": "bottom: 20px; left: 20px;",
    "top-right": "top: 20px; right: 20px;",
    "top-left": "top: 20px; left: 20px;",
  };

  const primaryColor = theme.primaryColor || "#0070f3";
  const bgColor = theme.backgroundColor || "#ffffff";
  const fontFamily = theme.fontFamily || "system-ui, -apple-system, sans-serif";

  return `<!-- Binaka Live Chat Widget -->
<script>
(function() {
  var BINAKA_CONFIG = {
    widgetUuid: "${widgetUuid}",
    organizationSlug: "${organizationSlug}",
    apiBaseUrl: "${apiBaseUrl}",
    position: "${position}",
    theme: {
      primaryColor: "${primaryColor}",
      backgroundColor: "${bgColor}",
      fontFamily: "${fontFamily}",
      borderRadius: ${theme.borderRadius || 8},
      zIndex: ${theme.zIndex || 999999}
    },
    greetingMessage: ${greetingMessage ? `"${greetingMessage}"` : "null"},
    agentUnavailableMessage: ${agentUnavailableMessage ? `"${agentUnavailableMessage}"` : "null"}
  };

  var script = document.createElement('script');
  script.src = '${apiBaseUrl}/chat/widget.js';
  script.async = true;
  script.onload = function() {
    if (window.BinakaWidget) {
      window.BinakaWidget.init(BINAKA_CONFIG);
    }
  };
  document.head.appendChild(script);

  var styles = document.createElement('style');
  styles.id = 'binaka-chat-styles';
  styles.textContent = \`
    #binaka-launcher {
      position: fixed;
      ${positionStyles[position] || positionStyles["bottom-right"]}
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${primaryColor};
      color: white;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      transition: transform 0.2s, box-shadow 0.2s;
      z-index: \${theme.zIndex || 999999};
    }
    #binaka-launcher:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }
    #binaka-launcher.opened {
      transform: rotate(45deg);
    }
    #binaka-widget-container {
      position: fixed;
      ${positionStyles[position] || positionStyles["bottom-right"]}
      width: 380px;
      max-height: 600px;
      background: ${bgColor};
      border-radius: \${theme.borderRadius || 8}px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: \${(theme.zIndex || 999999) - 1};
      font-family: ${fontFamily};
    }
    #binaka-widget-container.opened {
      display: flex;
    }
    .binaka-header {
      background: ${primaryColor};
      color: white;
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .binaka-header-title {
      font-weight: 600;
      font-size: 16px;
    }
    .binaka-close-btn {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 20px;
      padding: 0;
    }
    .binaka-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .binaka-message {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.4;
    }
    .binaka-message.agent {
      background: #f0f0f0;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
    }
    .binaka-message.contact {
      background: ${primaryColor};
      color: white;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }
    .binaka-message.system {
      background: #fff3cd;
      align-self: center;
      text-align: center;
      font-size: 12px;
    }
    .binaka-typing-indicator {
      display: none;
      align-self: flex-start;
      background: #f0f0f0;
      padding: 10px 14px;
      border-radius: 12px;
      border-bottom-left-radius: 4px;
    }
    .binaka-typing-indicator.visible {
      display: flex;
      gap: 4px;
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
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .binaka-prechat-form h3 {
      margin: 0 0 8px 0;
      font-size: 16px;
    }
    .binaka-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      font-family: inherit;
    }
    .binaka-input:focus {
      outline: none;
      border-color: ${primaryColor};
    }
    .binaka-btn {
      background: ${primaryColor};
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      width: 100%;
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
      display: flex;
      gap: 8px;
    }
    .binaka-composer input {
      flex: 1;
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 20px;
      font-size: 14px;
    }
    .binaka-composer input:focus {
      outline: none;
    }
    .binaka-send-btn {
      background: ${primaryColor};
      color: white;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .binaka-offline-form {
      padding: 16px;
      text-align: center;
    }
    .binaka-offline-form h3 {
      margin: 0 0 8px 0;
      color: #666;
    }
    .binaka-offline-form p {
      color: #999;
      font-size: 14px;
      margin: 0 0 16px 0;
    }
  \`;
  document.head.appendChild(styles);
})();
</script>
<button id="binaka-launcher" aria-label="Open chat">
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
</button>
<div id="binaka-widget-container">
  <div class="binaka-header">
    <span class="binaka-header-title">${config.widgetName}</span>
    <button class="binaka-close-btn" aria-label="Close chat">×</button>
  </div>
  <div id="binaka-messages-container" class="binaka-messages"></div>
  <div id="binaka-typing" class="binaka-typing-indicator">
    <div class="binaka-typing-dot"></div>
    <div class="binaka-typing-dot"></div>
    <div class="binaka-typing-dot"></div>
  </div>
  <div id="binaka-prechat-form" class="binaka-prechat-form" style="display: none;"></div>
  <div id="binaka-composer" class="binaka-composer" style="display: none;">
    <input type="text" placeholder="Type a message..." id="binaka-message-input"/>
    <button class="binaka-send-btn" id="binaka-send-btn" aria-label="Send">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
    </button>
  </div>
</div>`;
}

export function buildPreChatFormHtml(fields: PreChatFormField[]): string {
  if (!fields || fields.length === 0) return "";

  let html = '<h3>Before we start...</h3>';

  for (const field of fields) {
    const required = field.required ? "required" : "";
    const placeholder = field.placeholder || "";

    if (field.type === "textarea") {
      html += `<textarea
        class="binaka-input"
        name="${field.name}"
        placeholder="${placeholder}"
        ${required}
        rows="3"
      ></textarea>`;
    } else if (field.type === "select" && field.options) {
      html += `<select class="binaka-input" name="${field.name}" ${required}>
        <option value="">Select ${field.label}</option>`;
      for (const option of field.options) {
        html += `<option value="${option}">${option}</option>`;
      }
      html += `</select>`;
    } else {
      html += `<input
        type="${field.type}"
        class="binaka-input"
        name="${field.name}"
        placeholder="${placeholder}"
        ${required}
      />`;
    }
  }

  html += `<button type="button" class="binaka-btn" id="binaka-start-chat">Start Chat</button>`;

  return html;
}

export function buildOfflineMessageHtml(title: string, body: string): string {
  return `
    <div class="binaka-offline-form">
      <h3>${title || "We're offline"}</h3>
      <p>${body || "Leave us a message and we'll get back to you via email."}</p>
      <div id="binaka-offline-fields"></div>
    </div>
  `;
}
