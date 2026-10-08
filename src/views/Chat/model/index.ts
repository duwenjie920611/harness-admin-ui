export enum ApprovalScope {
  ONCE = "ONCE",
  SESSION = "SESSION",
}

export enum InteractionType {
  AUTHORIZATION = "AUTHORIZATION",
  CHOICE = "CHOICE",
}

export enum MessageRole {
  USER = "user",
  ASSISTANT = "assistant",
}

export enum ChatEventType {
  START = "start",
  DELTA = "delta",
  THINKING = "thinking",
  TOOL = "tool",
  CONFIRMATION = "confirmation",
  DONE = "done",
  ERROR = "error",
  STOPPED = "stopped",
}

export interface ChatMessage {
  role: MessageRole;
  content: string;
  reasoningContent?: string;
  /** 当前执行阶段用时；完成后由服务端校准，历史消息也返回该字段。 */
  durationMs?: number | null;
  timing?: boolean;
}
export interface ChatSession {
  sessionId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}
export interface PageResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}
export interface PendingConfirmation {
  requestId: string;
  tools: ToolCall[];
  createdAt: number;
  type?: InteractionType;
  questions?: UserQuestion[];
}
export interface ToolActivity {
  id: string;
  name: string;
  status: string;
}

export interface ChoiceOption {
  id: string;
  label: string;
  description?: string;
}
export interface UserQuestion {
  questionId: string;
  question: string;
  options: ChoiceOption[];
  multiple: boolean;
  allowText: boolean;
}
export interface ChoiceAnswer {
  questionId: string;
  selectedOptionIds: string[];
  text: string;
}

/** 页面按用户、项目和会话隔离的输入及流式回复状态。 */
export interface SessionView {
  input: string;
  pending: boolean;
  stopping: boolean;
  notice: string;
  confirmation: PendingConfirmation | null;
  submittedChoice: { request: PendingConfirmation; answers: ChoiceAnswer[] } | null;
  choiceCollapsed: boolean;
  tools: ToolActivity[];
  answers: ChoiceAnswer[];
  error: string;
  messages: ChatMessage[];
}


/** 模型目录来自后端JSON，选择按用户保存。 */
export interface ChatModelOption {
  id: string;
  name: string;
  apiModel: string;
  description: string;
  enabled: boolean;
}
export interface ChatModelSelection {
  selectedModelId: string;
  models: ChatModelOption[];
}
