<script setup lang="ts">
import { computed, reactive, nextTick, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import MarkdownReply from "@/components/MarkdownReply/index.vue";
import { authFetch, currentUser, logout } from "@/api/auth";

import { ApprovalScope, InteractionType, MessageRole, ChatEventType } from "./model";
import type { ChatMessage, ChatSession, PageResponse, PendingConfirmation, ToolActivity, ChoiceAnswer, SessionView, ChatModelOption, ChatModelSelection } from "./model";

const router = useRouter();
const activeUser = ref(currentUser.value?.userId || "");
const sessionId = ref("");
interface Workspace { workspaceId: string; name: string; createdAt: number; directoryPath: string | null }
interface WorkspaceList { items: Workspace[]; activeWorkspaceId: string }
const workspaces = ref<Workspace[]>([]);
const activeWorkspace = ref("default");
const workspaceBusy = ref(true);
const workspaceCreating = ref(false);
const workspaceName = ref("");
const workspaceDirectory = ref("");
const projectsExpanded = ref(true);
const expandedProjects = ref<string[]>([]);
const projectSessions = ref<Record<string, ChatSession[]>>({});

async function openProject(id: string) {
  if (workspaceBusy.value || loading.value) {
    return;
  }
  if (id === activeWorkspace.value && expandedProjects.value.includes(id)) {
    expandedProjects.value = expandedProjects.value.filter(item => item !== id);
    return;
  }
  if (!expandedProjects.value.includes(id)) {
    expandedProjects.value.push(id);
  }
  await switchWorkspace(id);
}

async function openProjectSession(workspace: string, id: string) {
  if (workspaceBusy.value || loading.value) {
    return;
  }
  await switchWorkspace(workspace);
  if (activeWorkspace.value === workspace) {
    await selectSession(id);
  }
}

async function startChat(workspace = "default") {
  if (workspaceBusy.value || loading.value) {
    return;
  }
  if (workspace !== "default" && !expandedProjects.value.includes(workspace)) {
    expandedProjects.value.push(workspace);
    projectsExpanded.value = true;
  }
  await switchWorkspace(workspace, false);
  if (activeWorkspace.value === workspace) {
    newSession();
  }
}

/**
 * 统一的 Chat 接口 POST 封装：默认注入 userId 并强制携带凭证头。
 * 无响应体（204 / 非 JSON）时显式返回 undefined，由调用方以 T = void 声明，
 * 避免旧实现 `undefined as T` 把「没有响应体」伪装成任意类型。
 */
async function postJson<T>(
  path: string,
  payload: Record<string, unknown>,
  options: { sessionId?: string | null; errorLabel?: string; signal?: AbortSignal; accept?: string } = {},
): Promise<T> {
  const response = await authFetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options.accept ? { Accept: options.accept } : {}),
    },
    body: JSON.stringify({ userId: activeUser.value, sessionId: options.sessionId ?? null, ...payload }),
    ...(options.signal ? { signal: options.signal } : {}),
  });
  if (!response.ok) {
    throw new Error(`${options.errorLabel ?? "请求失败"}（${response.status}）`);
  }
  if (response.status === 204 || !response.headers.get("content-type")?.includes("application/json")) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

async function workspaceRequest<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  return postJson<T>(path, payload, { errorLabel: "项目操作失败" });
}

const modelOptions = ref<ChatModelOption[]>([]);
const selectedModelId = ref("");
const modelsLoading = ref(false);
const modelError = ref("");

async function loadModels() {
  modelsLoading.value = true;
  modelError.value = "";
  try {
    const result = await postJson<ChatModelSelection>("/api/chat/model/list", {
      workspaceId: activeWorkspace.value, sessionId: sessionId.value,
    });
    modelOptions.value = result.models;
    selectedModelId.value = result.selectedModelId;
  } catch (failure) {
    modelError.value = failure instanceof Error ? failure.message : "模型列表加载失败";
  } finally {
    modelsLoading.value = false;
  }
}

/** 选择只影响页面的下一轮请求，普通 chat 携带 modelId 后才保存真实会话关系。 */
function selectModel(event: Event) {
  const select = event.target as HTMLSelectElement;
  if (!modelOptions.value.some(option => option.id === select.value && option.enabled)) {
    modelError.value = "模型不可用，请刷新模型列表";
    select.value = selectedModelId.value;
    return;
  }
  selectedModelId.value = select.value;
  modelError.value = "";
}

async function loadWorkspaces() {
  workspaceBusy.value = true;
  try {
    const result = await workspaceRequest<WorkspaceList>("/api/chat/workspace/list", {});
    workspaces.value = result.items;
    activeWorkspace.value = result.activeWorkspaceId;
    projectSessions.value.default = await query<ChatSession>("/api/chat/session/list", activeUser.value, null, "default");
    if (activeWorkspace.value !== "default") {
      expandedProjects.value = [activeWorkspace.value];
    }
    await loadSessions();
    await loadModels();
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : "项目加载失败";
  } finally {
    workspaceBusy.value = false;
  }
}

async function switchWorkspace(id: string, createEmpty = true) {
  if (workspaceBusy.value || loading.value || id === activeWorkspace.value) {
    return;
  }
  workspaceBusy.value = true;
  try {
    await workspaceRequest<void>("/api/chat/workspace/select", { workspaceId: id });
    activeWorkspace.value = id;
    sessions.value = [];
    sessionId.value = "";
    await loadSessions(createEmpty);
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : "项目切换失败";
  } finally {
    workspaceBusy.value = false;
  }
}

async function chooseProjectDirectory(project?: Workspace) {
  if (workspaceBusy.value || loading.value) {
    return;
  }
  workspaceBusy.value = true;
  error.value = "";
  try {
    const selected = await workspaceRequest<{ directoryPath: string | null; name: string | null }>("/api/chat/workspace/pick-directory", {});
    if (!selected.directoryPath) {
      return;
    }
    if (project) {
      await workspaceRequest<void>("/api/chat/workspace/bind-directory", { workspaceId: project.workspaceId, directoryPath: selected.directoryPath });
      project.directoryPath = selected.directoryPath;
    } else {
      workspaceDirectory.value = selected.directoryPath;
      workspaceName.value = (selected.name || "项目").slice(0, 60);
      await saveWorkspace();
    }
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : "项目目录选择失败";
    if (!project) {
      workspaceDirectory.value = "";
      workspaceName.value = "";
      workspaceCreating.value = true;
    }
  } finally {
    workspaceBusy.value = false;
  }
}

async function createWorkspace() {
  if (!workspaceName.value.trim() || !workspaceDirectory.value.trim() || workspaceBusy.value || loading.value) {
    return;
  }
  workspaceBusy.value = true;
  try {
    await saveWorkspace();
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : "项目创建失败";
  } finally {
    workspaceBusy.value = false;
  }
}
async function saveWorkspace() {
    const created = await workspaceRequest<Workspace>("/api/chat/workspace/create", { name: workspaceName.value.trim(), directoryPath: workspaceDirectory.value.trim() });
    workspaces.value.push(created);
    expandedProjects.value.push(created.workspaceId);
    projectsExpanded.value = true;
    projectSessions.value[created.workspaceId] = [];
    activeWorkspace.value = created.workspaceId;
    workspaceCreating.value = false;
    workspaceName.value = "";
    workspaceDirectory.value = "";
    sessions.value = [];
    newSession();
}

const sessions = ref<ChatSession[]>([]);
const loading = ref(false);
// SSE 始终持有发起请求时的会话状态，切换页面不改变事件写入目标。
const sessionViews = reactive<Record<string, SessionView>>({});
/** 视图 key 的最多保留数量；超出后按最后访问时间淘汰（正在对话中的视图不会被淘汰）。 */
const MAX_SESSION_VIEWS = 20;
const viewAccessOrder: string[] = [];

function viewKey(workspace: string, id: string) {
  return JSON.stringify([activeUser.value, workspace, id]);
}

function touchViewKey(key: string) {
  const index = viewAccessOrder.indexOf(key);
  if (index !== -1) {
    viewAccessOrder.splice(index, 1);
  }
  viewAccessOrder.push(key);
}

/** 淘汰最久未访问、且没有进行中请求 / 待确认 / 消息记录的视图，避免长期使用后内存单调增长。 */
function pruneSessionViews() {
  if (viewAccessOrder.length <= MAX_SESSION_VIEWS) {
    return;
  }
  for (const key of [...viewAccessOrder]) {
    if (viewAccessOrder.length <= MAX_SESSION_VIEWS) {
      break;
    }
    const view = sessionViews[key];
    if (!view || view.pending || view.stopping || view.confirmation) {
      continue;
    }
    delete sessionViews[key];
    const index = viewAccessOrder.indexOf(key);
    if (index !== -1) {
      viewAccessOrder.splice(index, 1);
    }
  }
}

function viewFor(workspace: string, id: string): SessionView {
  const key = viewKey(workspace, id);
  touchViewKey(key);
  if (!sessionViews[key]) {
    sessionViews[key] = { input: "", pending: false, stopping: false, notice: "", confirmation: null, submittedChoice: null, choiceCollapsed: false, tools: [], answers: [], error: "", messages: [] };
  }
  // 必须从 reactive 容器重新读取代理；赋值表达式首次返回的是原始对象，异步写入不会刷新页面。
  return sessionViews[key]!;
}

/** 关闭会话时释放对应视图，避免已删除会话的状态常驻内存。 */
function dropSessionView(workspace: string, id: string) {
  const key = viewKey(workspace, id);
  delete sessionViews[key];
  const index = viewAccessOrder.indexOf(key);
  if (index !== -1) {
    viewAccessOrder.splice(index, 1);
  }
}

const activeView = computed(() => viewFor(activeWorkspace.value, sessionId.value));
const input = computed({ get: () => activeView.value.input, set: value => { activeView.value.input = value; } });
const pending = computed({ get: () => activeView.value.pending, set: value => { activeView.value.pending = value; } });
const confirmation = computed({ get: () => activeView.value.confirmation, set: value => { activeView.value.confirmation = value; } });
const tools = computed({ get: () => activeView.value.tools, set: value => { activeView.value.tools = value; } });
const answers = computed({ get: () => activeView.value.answers, set: value => { activeView.value.answers = value; } });
const choicePending = computed(() => confirmation.value?.type === InteractionType.CHOICE);
const displayedChoice = computed(() => choicePending.value ? confirmation.value : activeView.value.submittedChoice?.request);
const displayedAnswers = computed(() => choicePending.value ? answers.value : activeView.value.submittedChoice?.answers || []);

const error = computed({ get: () => activeView.value.error, set: value => { activeView.value.error = value; } });
const messages = computed({ get: () => activeView.value.messages, set: value => { activeView.value.messages = value; } });
const history = ref<HTMLElement>();
// 只在底部跟随新内容；用户向上阅读历史时暂停自动滚动。
const followLatest = ref(true);
const profileMenu = ref<HTMLDetailsElement>();
const settingsDialog = ref<HTMLDialogElement>();

function closeProfileMenu(event: PointerEvent) {
  if (profileMenu.value && !profileMenu.value.contains(event.target as Node)) {
    profileMenu.value.open = false;
  }
}

interface AgentCapability { name: string; description: string; enabled: boolean }
interface AgentSettings { skills: AgentCapability[]; tools: AgentCapability[]; mcp: { name: string; transport: string; status: string }[] }
const agentSettings = ref<AgentSettings>();
const settingsCategory = ref<"skills" | "tools" | "mcp">("skills");
const settingsLoading = ref(false);
const settingsError = ref("");
const updatingCapability = ref(false);

async function toggleCapability(item: AgentCapability, category: "skills" | "tools") {
  if (updatingCapability.value) {
    return;
  }
  updatingCapability.value = true;
  settingsError.value = "";
  try {
    await postJson<void>("/api/chat/settings/update", {
      workspaceId: activeWorkspace.value, userId: activeUser.value, sessionId: sessionId.value, type: category === "skills" ? "SKILL" : "TOOL", name: item.name, enabled: !item.enabled,
    }, { errorLabel: "保存失败" });
    item.enabled = !item.enabled;
  } catch (failure) {
    settingsError.value = failure instanceof Error ? failure.message : "保存失败";
  } finally {
    updatingCapability.value = false;
  }
}

async function openSettings() {
  if (profileMenu.value) {
    profileMenu.value.open = false;
  }
  settingsDialog.value?.showModal();
  settingsLoading.value = true;
  settingsError.value = "";
  agentSettings.value = undefined;
  try {
    agentSettings.value = await postJson<AgentSettings>("/api/chat/settings", {
      workspaceId: activeWorkspace.value, userId: activeUser.value, sessionId: sessionId.value,
    }, { errorLabel: "配置查询失败" });
  } catch (failure) {
    settingsError.value = failure instanceof Error ? failure.message : "配置查询失败";
  } finally {
    settingsLoading.value = false;
  }
}

onMounted(() => document.addEventListener("pointerdown", closeProfileMenu));
onUnmounted(() => document.removeEventListener("pointerdown", closeProfileMenu));

async function query<T>(path: string, user: string, session: string | null, workspace = activeWorkspace.value): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  // 上界兜底：后端 total 异常（为 0 或永远大于已取条数）时不会无限翻页。
  const maxPages = 200;
  while (page <= maxPages) {
    const result = await postJson<PageResponse<T>>(path, { workspaceId: workspace, userId: user, page, size: 200 }, { errorLabel: "查询失败", sessionId: session });
    items.push(...result.items);
    if (!result.items.length || items.length >= result.total) {
      return items;
    }
    page++;
  }
  console.warn(`[chat] 分页超过 ${maxPages} 页上界，已截断：${path}`);
  return items;
}

/** 显式传入 target：默认参数在调用时求值，异步回调里会指向「当前」会话，容易串写到错误视图。 */
function setConfirmation(value: PendingConfirmation | null, target: SessionView) {
  if (target.confirmation?.requestId !== value?.requestId) {
    if (value?.type === InteractionType.CHOICE) {
      target.choiceCollapsed = false;
    }
    target.answers = (value?.questions || []).map<ChoiceAnswer>(question => ({ questionId: question.questionId, selectedOptionIds: [], text: "" }));
  }
  target.confirmation = value;
}

function updateChoiceText(index: number, event: Event) {
  const answer = answers.value[index];
  if (choicePending.value && answer) {
    answer.text = (event.target as HTMLTextAreaElement).value;
  }
}

function selectOption(index: number, optionId: string, multiple: boolean) {
  const answer = answers.value[index];
  if (!answer) {
    return;
  }
  if (!multiple) {
    answer.selectedOptionIds = [optionId];
  } else if (answer.selectedOptionIds.includes(optionId)) {
    answer.selectedOptionIds = answer.selectedOptionIds.filter(id => id !== optionId);
  } else {
    answer.selectedOptionIds.push(optionId);
  }
}

async function answerQuestions() {
  if (!confirmation.value || confirmation.value.type !== InteractionType.CHOICE || pending.value || loading.value) {
    return;
  }
  if (answers.value.some(answer => !answer.selectedOptionIds.length && !answer.text.trim())) {
    error.value = "请回答全部问题";
    return;
  }
  const target = activeView.value;
  const request = confirmation.value;
  target.submittedChoice = {
    request,
    answers: answers.value.map(answer => ({ ...answer, selectedOptionIds: [...answer.selectedOptionIds] })),
  };
  target.choiceCollapsed = true;
  pending.value = true;
  error.value = "";
  const summary = (confirmation.value.questions || []).map(question => {
    const answer = answers.value.find(item => item.questionId === question.questionId)!;
    const labels = question.options.filter(option => answer.selectedOptionIds.includes(option.id)).map(option => option.label).join("、");
    return `${question.question}\n${labels}${answer.text.trim() ? `\n${answer.text}` : ""}`;
  }).join("\n\n");
  // 先落用户摘要，再追加助手占位；槽位以对象传递，无需再靠数组下标推算偏移量。
  messages.value.push({ role: MessageRole.USER, content: `选项回答：${summary}` });
  const slot = reactive<ChatMessage>({ role: MessageRole.ASSISTANT, content: "" });
  messages.value.push(slot);
  void scrollToBottom(true);
  await stream("/api/chat/answer", {
    userId: activeUser.value,
    sessionId: sessionId.value,
    requestId: confirmation.value.requestId,
    answers: answers.value,
  }, slot, "");
  // 后端仍保留本问题时，展开原表单并保留答案，便于重试。
  if (target.confirmation?.requestId === request.requestId) {
    target.choiceCollapsed = false;
  }
}

async function fetchConfirmation(user: string, session: string, workspace = activeWorkspace.value): Promise<PendingConfirmation | null> {
  const result = await postJson<{ confirmation: PendingConfirmation | null }>(
    "/api/chat/confirmation",
    { workspaceId: workspace, userId: user },
    { errorLabel: "确认查询失败", sessionId: session },
  );
  return result.confirmation;
}

async function selectSession(id: string) {
  if (loading.value) {
    return;
  }
  const workspace = activeWorkspace.value;
  sessionId.value = id;
  const target = viewFor(workspace, id);
  if (target.pending || target.messages.length) {
    await scrollToBottom(true);
    return;
  }
  loading.value = true;
  target.error = "";
  try {
    const records = await query<ChatMessage>("/api/chat/session/history", activeUser.value, id);
    const waiting = await fetchConfirmation(activeUser.value, id);
    sessionId.value = id;
    // 统一写请求发起时解析出的 target，避免 await 期间用户切会话导致内容落到错误视图。
    setConfirmation(waiting, target);
    target.tools = [];
    target.messages = records;
    await scrollToBottom(true);
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : "查询失败";
  } finally {
    loading.value = false;
  }
}

function newSession() {
  if (loading.value || !activeUser.value) {
    return;
  }
  // 空会话只存在页面中，第一次发送消息后由 chat 接口保存。
  sessionId.value = crypto.randomUUID();
  const view = activeView.value;
  followLatest.value = true;
  setConfirmation(null, view);
  view.tools = [];
  view.messages = [];
  view.input = "";
  view.error = "";
}

async function loadSessions(createEmpty = true) {
  const user = activeUser.value;
  if (!user || loading.value) {
    return;
  }
  loading.value = true;
  error.value = "";
  try {
    const records = await query<ChatSession>("/api/chat/session/list", user, null);
    activeUser.value = user;
    // 登录及刷新时按最近活动倒序排列，随后自动打开第一条会话。
    sessions.value = records.sort((a, b) => b.updatedAt - a.updatedAt);
    projectSessions.value[activeWorkspace.value] = sessions.value;
    sessionId.value = "";
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : "查询失败";
    return;
  } finally {
    loading.value = false;
  }
  if (sessions.value[0]) {
    await selectSession(sessions.value[0].sessionId);
  } else if (createEmpty) {
    newSession();
  }
}

onMounted(loadWorkspaces);

async function signOut() {
  try {
    await logout();
    sessions.value = [];
    messages.value = [];
    await router.replace("/login");
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : "退出失败";
  }
}

function updateFollowLatest() {
  const pane = history.value;
  if (pane) {
    followLatest.value = pane.scrollHeight - pane.scrollTop - pane.clientHeight <= 80;
  }
}

async function scrollToBottom(force = false) {
  const workspace = activeWorkspace.value;
  const id = sessionId.value;
  await nextTick();
  if (activeWorkspace.value !== workspace || sessionId.value !== id) {
    return;
  }
  if (!force && !followLatest.value) {
    return;
  }
  if (force) {
    followLatest.value = true;
  }
  history.value?.scrollTo({ top: history.value.scrollHeight, behavior: "auto" });
}

async function send() {
  const message = input.value.trim();
  if (!message || confirmation.value || pending.value || loading.value || !selectedModelId.value || !sessionId.value) {
    return;
  }
  pending.value = true;
  error.value = "";
  messages.value.push({ role: MessageRole.USER, content: message });
  const slot = reactive<ChatMessage>({ role: MessageRole.ASSISTANT, content: "" });
  messages.value.push(slot);
  input.value = "";
  void scrollToBottom(true);
  await stream("/api/chat", { userId: activeUser.value, sessionId: sessionId.value, modelId: selectedModelId.value, message }, slot, message);
}

async function confirmTools(approved: boolean, scope: ApprovalScope = ApprovalScope.ONCE) {
  if (!confirmation.value || pending.value || loading.value) {
    return;
  }
  pending.value = true;
  error.value = "";
  const slot = reactive<ChatMessage>({ role: MessageRole.ASSISTANT, content: "" });
  messages.value.push(slot);
  void scrollToBottom(true);
  await stream("/api/chat/confirm", {
    userId: activeUser.value,
    sessionId: sessionId.value,
    requestId: confirmation.value.requestId,
    approved,
    scope,
  }, slot, "");
}

// 默认后端执行预算为5分钟，SSE额外保留10秒；浏览器兜底等待6分钟，给后端先返回终止原因。
const STREAM_TIMEOUT_MS = 360_000;

/** 发出停止请求，原聊天 SSE 的 stopped 才表示状态清理完成。 */
async function stopReply() {
  // 先捕获目标身份和视图，等待 HTTP 响应期间切换会话也不会停止另一会话。
  const user = activeUser.value;
  const workspace = activeWorkspace.value;
  const id = sessionId.value;
  const target = viewFor(workspace, id);
  if (!target.pending || target.stopping) {
    return;
  }
  target.stopping = true;
  try {
    await postJson<void>("/api/chat/stop", { userId: user, workspaceId: workspace }, { errorLabel: "停止失败", sessionId: id });
    // HTTP成功仅表示停止接口返回；保留原响应流，等待后端完成清理后发送stopped。
    // 不在这里abort，否则会丢失终止事件，还可能让服务端跳过手动停止的状态收尾。
  } catch (failure) {
    target.error = failure instanceof Error ? failure.message : "停止失败，请重试";
    target.stopping = false;
  }
}

async function stream(path: string, payload: Record<string, unknown>, slot: ChatMessage | null, message: string) {
  const workspace = activeWorkspace.value;
  const user = payload.userId as string;
  const id = payload.sessionId as string;
  const target = viewFor(workspace, id);
  target.notice = "";
  // 每个流独立计时，切换会话不会覆盖其他会话的用时；确认等待不计入。
  const startedAt = performance.now();
  if (slot) {
    slot.durationMs = 0;
    slot.timing = true;
  }
  const durationTimer = window.setInterval(() => {
    if (slot?.timing) {
      slot.durationMs = Math.max(0, performance.now() - startedAt);
    }
  }, 1000);
  const finishTiming = (durationMs?: number) => {
    if (slot?.timing) {
      slot.durationMs = durationMs ?? Math.max(0, performance.now() - startedAt);
      slot.timing = false;
    }
    window.clearInterval(durationTimer);
  };
  const list = projectSessions.value[workspace] ||= [];
  if (!list.some(item => item.sessionId === id)) {
    list.unshift({ sessionId: id, title: message.slice(0, 40) || target.messages.find(item => item.role === MessageRole.USER)?.content.slice(0, 40) || "会话", createdAt: Date.now(), updatedAt: Date.now() });
  }
  if (activeWorkspace.value === workspace) {
    sessions.value = list;
  }
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => {
    controller.abort(new DOMException("等待回复超时", "TimeoutError"));
  }, STREAM_TIMEOUT_MS);
  try {
    const response = await authFetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ ...payload, workspaceId: workspace }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`请求失败（${response.status}）`);
    }
    if (!response.body) {
      throw new Error("浏览器未收到回复流");
    }
    reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let completed = false;
    const consume = (frame: string) => {
      let event = "message";
      const data: string[] = [];
      for (const line of frame.split(/\r?\n/)) {
        if (line.startsWith("event:")) {
          event = line.slice(6).trim();
        }
        if (line.startsWith("data:")) {
          data.push(line.slice(5).replace(/^ /, ""));
        }
      }
      if (!data.length) {
        return;
      }
      const payload = JSON.parse(data.join("\n"));
      if (event === ChatEventType.DELTA) {
        if (slot) {
          slot.content += payload.text;
        }
      }
      if (event === ChatEventType.THINKING && slot) {
        slot.reasoningContent = (slot.reasoningContent || "") + payload.text;
      }
      if (event === ChatEventType.TOOL) {
        const existing = target.tools.find(tool => tool.id === payload.id);
        if (existing) {
          existing.status = payload.status;
        } else {
          target.tools.push(payload);
        }
      }
      if (event === ChatEventType.CONFIRMATION) {
        finishTiming();
        setConfirmation(payload, target);
        completed = true;
      }
      if (event === ChatEventType.DONE) {
        finishTiming(payload.durationMs);
        setConfirmation(null, target);
        if (slot) {
          slot.content = payload.reply;
        }
        completed = true;
        const existing = (projectSessions.value[workspace] ||= []).find(item => item.sessionId === id);
        if (existing) {
          existing.updatedAt = Date.now();
        } else {
          (projectSessions.value[workspace] ||= []).push({ sessionId: id, title: message.slice(0, 40) || target.messages.find(item => item.role === MessageRole.USER)?.content.slice(0, 40) || "会话", createdAt: Date.now(), updatedAt: Date.now() });
        }
        (projectSessions.value[workspace] ||= []).sort((a, b) => b.updatedAt - a.updatedAt);
        if (activeWorkspace.value === workspace) {
          sessions.value = projectSessions.value[workspace]!;
        }
      }
      if (event === ChatEventType.STOPPED) {
        finishTiming();
        // 保留正文及用时；即使尚未收到正文，也能查看此次执行耗时。
        target.notice = payload.message;
        completed = true;
      }
      if (event === ChatEventType.ERROR) {
        throw new Error(payload.message);
      }
    };
    while (true) {
      const { done, value } = await reader.read();
      buffer += done
        ? decoder.decode()
        : decoder.decode(value, { stream: true });
      let boundary: RegExpMatchArray | null;
      while ((boundary = buffer.match(/\r?\n\r?\n/))) {
        const index = boundary.index!;
        consume(buffer.slice(0, index));
        buffer = buffer.slice(index + boundary[0].length);
      }
      if (activeWorkspace.value === workspace && sessionId.value === id) {
        await scrollToBottom();
      }
      if (done) {
        break;
      }
    }
    if (!completed) {
      throw new Error("回复连接中断，已接收的内容保留");
    }
  } catch (failure) {
    if (controller.signal.aborted) {
      // 浏览器对响应体取消可能只返回BodyStreamBuffer错误，以本请求的取消原因判断。
      target.error = "等待回复超时，已接收内容保留，请缩小任务范围后重试";
    } else {
      target.error = failure instanceof Error ? failure.message : "连接失败，请检查后端是否启动";
    }
  } finally {
    finishTiming();
    // 正常完成也必须清除定时器，避免旧请求的超时回调继续运行。
    window.clearTimeout(timeout);
    await reader?.cancel().catch(() => {});
    try {
      setConfirmation(await fetchConfirmation(user, id, workspace), target);
    } catch {
      // 保留已收到的确认状态，用户可以重新加载会话。
    }
    // 重新查询待处理交互后才恢复输入；手动停止、正常完成、超时及断流共用此收尾。
    target.pending = false;
    target.stopping = false;
  }
}
/** 秒级显示执行用时，避免毫秒数影响阅读。 */
function formatDuration(durationMs: number) {
  const seconds = Math.max(0, Math.floor(durationMs / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  const remainder = seconds % 60;
  return `${hours ? `${hours}小时 ` : ""}${minutes ? `${minutes}分钟 ` : ""}${remainder}秒`;
}

/** 根据当前会话真实工具事件显示进度，不作为助手正文或历史消息保存。 */
// 未收到工具终态时不伪造“成功”，结束的旧调用显示为“已结束”。
const toolRows = computed(() => tools.value.map(tool => {
  const status = tool.status.toUpperCase();
  if (status === "SUCCESS") {
    return { ...tool, label: "调用成功", tone: "success" };
  }
  if (["ERROR", "FAILED"].includes(status)) {
    return { ...tool, label: "调用失败", tone: "error" };
  }
  if (status === "DENIED") {
    return { ...tool, label: "已拒绝", tone: "muted" };
  }
  if (confirmation.value?.tools.some(item => item.id === tool.id)
      || (tool.name === "ask_user" && choicePending.value)) {
    return { ...tool, label: "等待你的确认", tone: "waiting" };
  }
  return { ...tool, label: pending.value ? "执行中" : "已结束", tone: pending.value ? "running" : "muted" };
}));
const successfulTools = computed(() => toolRows.value.filter(tool => tool.tone === "success").length);
const failedTools = computed(() => toolRows.value.filter(tool => tool.tone === "error").length);
const runningTools = computed(() => toolRows.value.filter(tool => tool.tone === "running").length);

const replyStatus = computed(() => {
  const view = activeView.value;
  if (view.stopping) {
    return "正在停止…";
  }
  if (!view.pending) {
    return view.error ? "本轮未完成，请查看错误提示" : "暂无回复内容";
  }
  const running = view.tools.filter(tool => !["SUCCESS", "ERROR", "DENIED"].includes(tool.status));
  const finished = view.tools.length - running.length;
  const labels: Record<string, string> = {
    read_file: "读取文件", list_files: "查看目录", glob_files: "查找文件", grep_files: "检索内容",
    agent_spawn: "执行子任务", web_search: "搜索资料", write_file: "写入文件", edit_file: "修改文件",
  };
  if (running.length) {
    const tool = running[running.length - 1]!;
    return `正在${labels[tool.name] || `执行 ${tool.name}`}，已完成 ${finished} 项工具调用…`;
  }
  return finished ? `已完成 ${finished} 项工具调用，正在整理回复…` : "正在准备回复…";
});

</script>

<template>
  <main class="chat-page">
    <dialog ref="settingsDialog" class="account-settings" @click="($event.target === settingsDialog) && settingsDialog?.close()">
      <div class="settings-heading"><h2>设置</h2><button type="button" aria-label="关闭设置" @click="settingsDialog?.close()">×</button></div>
      <p v-if="settingsLoading" role="status">正在加载 Agent 配置…</p>
      <p v-if="settingsError" class="chat-error">{{ settingsError }}</p>
      <div class="settings-layout">
        <nav class="settings-navigation" aria-label="设置分类">
          <button v-for="category in (['skills', 'tools', 'mcp'] as const)" :key="category" type="button"
            :class="{ selected: settingsCategory === category }" :aria-pressed="settingsCategory === category" @click="settingsCategory = category">
            {{ { skills: 'Skills 技能', tools: 'Tools 工具', mcp: 'MCP 服务' }[category] }}
            <span v-if="agentSettings">{{ agentSettings[category].length }}</span>
          </button>
        </nav>
        <div class="settings-detail">
      <template v-if="agentSettings">
        <section v-if="settingsCategory !== 'mcp'" class="settings-capabilities">
          <h3>{{ settingsCategory === 'skills' ? 'Skills 技能' : 'Tools 工具' }}</h3>
          <p v-if="!agentSettings[settingsCategory].length" class="session-hint">暂无已配置的{{ settingsCategory === 'skills' ? '技能' : '工具' }}</p>
          <p class="session-hint">开关按用户保存，作用于所有会话；下次调用生效。</p>
          <div v-for="item in agentSettings[settingsCategory]" :key="item.name" class="settings-capability capability-row">
            <details><summary>{{ item.name }}</summary><p>{{ item.description || '暂无说明' }}</p></details>
            <button type="button" role="switch" :aria-checked="item.enabled" :aria-label="`${item.name} ${item.enabled ? '已启用' : '已关闭'}`"
              :class="['capability-switch', { enabled: item.enabled }]" :disabled="updatingCapability" @click="toggleCapability(item, settingsCategory)">
              {{ item.enabled ? '已启用' : '已关闭' }}
            </button>
          </div>
        </section>
        <section v-else class="settings-capabilities">
          <h3>MCP 服务 <small>{{ agentSettings.mcp.length }}</small></h3>
          <p v-if="!agentSettings.mcp.length" class="session-hint">暂无已配置的 MCP 服务</p>
          <div v-for="server in agentSettings.mcp" :key="server.name" class="settings-capability">
            <strong>{{ server.name }}</strong><p>{{ server.transport }} · {{ { SUCCESS: '已注册', FAILED: '注册失败', SKIPPED: '已跳过' }[server.status] || server.status }}</p>
          </div>
        </section>
      </template>
        </div>
      </div>
    </dialog>
    <aside class="chat-sidebar">
      <h2 class="chat-brand"><span class="brand-mark" aria-hidden="true">H</span><span>HarnessChat<small>你的智能工作伙伴</small></span></h2>
      <button class="new-chat-button" type="button" :disabled="workspaceBusy || loading" @click="startChat()"><span aria-hidden="true">＋</span> 新聊天</button>
      <nav class="sidebar-chats" aria-label="项目与聊天">
        <div class="projects-heading">
          <button type="button" :aria-expanded="projectsExpanded" @click="projectsExpanded = !projectsExpanded">项目 <span aria-hidden="true">{{ projectsExpanded ? '⌄' : '›' }}</span></button>
          <button class="project-add" type="button" aria-label="创建项目" title="创建项目" :disabled="workspaceBusy || loading" @click="chooseProjectDirectory()">＋</button>
        </div>
        <form v-if="workspaceCreating" class="workspace-create" @submit.prevent="createWorkspace">
          <input v-model="workspaceName" aria-label="项目名称" placeholder="项目名称" maxlength="60" :disabled="workspaceBusy" required autofocus />
          <input v-model="workspaceDirectory" aria-label="本地项目目录" placeholder="后端本机项目绝对路径" maxlength="2048" :disabled="workspaceBusy" required />
          <div><button type="submit" :disabled="workspaceBusy || !workspaceName.trim() || !workspaceDirectory.trim()">创建</button><button type="button" :disabled="workspaceBusy" @click="workspaceCreating = false">取消</button></div>
        </form>
        <div v-if="projectsExpanded" class="projects-list">
          <p v-if="!workspaces.some(item => item.workspaceId !== 'default')" class="session-hint">点击 ＋ 创建项目</p>
          <section v-for="project in workspaces.filter(item => item.workspaceId !== 'default')" :key="project.workspaceId" class="project-group">
            <div class="project-row">
              <button type="button" :class="['project-item', { selected: activeWorkspace === project.workspaceId }]" :title="project.directoryPath || project.name" :aria-expanded="expandedProjects.includes(project.workspaceId)" :disabled="workspaceBusy || loading" @click="openProject(project.workspaceId)">
                <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3z" /></svg>
                <span>{{ project.name }}</span>
              </button>
              <button class="project-new-chat" type="button" :aria-label="`在${project.name}中新建聊天`" title="新建项目聊天" :disabled="workspaceBusy || loading" @click="startChat(project.workspaceId)">＋</button>
            </div>
            <button v-if="!project.directoryPath" type="button" :disabled="workspaceBusy || loading" @click="chooseProjectDirectory(project)">选择项目目录</button>
            <div v-if="expandedProjects.includes(project.workspaceId)" class="project-conversations">
              <p v-if="!(projectSessions[project.workspaceId]?.length)" class="session-hint">{{ loading && activeWorkspace === project.workspaceId ? '正在加载…' : '暂无聊天' }}</p>
              <button v-for="session in projectSessions[project.workspaceId] || []" :key="session.sessionId" type="button"
                :class="['session-item', { active: activeWorkspace === project.workspaceId && session.sessionId === sessionId }]"
                :aria-current="activeWorkspace === project.workspaceId && session.sessionId === sessionId ? 'true' : undefined"
                :title="session.title" :disabled="workspaceBusy || loading" @click="openProjectSession(project.workspaceId, session.sessionId)">{{ session.title }}</button>
            </div>
          </section>
        </div>
        <div class="session-heading">最近</div>
        <p v-if="workspaceBusy && !projectSessions.default" class="session-hint">正在加载…</p>
        <p v-else-if="!projectSessions.default?.length" class="session-hint">暂无聊天</p>
        <button v-for="session in projectSessions.default || []" :key="session.sessionId" type="button"
          :class="['session-item', { active: activeWorkspace === 'default' && session.sessionId === sessionId }]"
          :aria-current="activeWorkspace === 'default' && session.sessionId === sessionId ? 'true' : undefined"
          :title="session.title" :disabled="workspaceBusy || loading" @click="openProjectSession('default', session.sessionId)">{{ session.title }}</button>
      </nav>
      <footer class="user-profile" aria-label="当前登录用户">
        <details ref="profileMenu" class="profile-menu" @keydown.esc="profileMenu && (profileMenu.open = false)">
          <summary class="profile-trigger" aria-label="打开用户菜单">
            <span class="user-avatar" aria-hidden="true">{{ (currentUser?.displayName || currentUser?.username || "用").slice(0, 1) }}</span>
            <strong>{{ currentUser?.displayName || currentUser?.username }}</strong>
            <span class="profile-more" aria-hidden="true">···</span>
          </summary>
          <div class="profile-popover">
            <div class="user-profile-summary">
              <span class="user-avatar" aria-hidden="true">{{ (currentUser?.displayName || currentUser?.username || "用").slice(0, 1) }}</span>
              <div class="user-profile-details">
                <strong>{{ currentUser?.displayName || currentUser?.username }}</strong>
                <span>{{ currentUser?.username }}</span>
              </div>
            </div>
            <div class="profile-menu-actions">
              <button type="button" @click="openSettings"><span aria-hidden="true">⚙</span>设置</button>
              <button type="button" :disabled="workspaceBusy || loading || Object.values(sessionViews).some(view => view.pending)" @click="signOut"><span aria-hidden="true">↪</span>退出登录</button>
            </div>
          </div>
        </details>
      </footer>
    </aside>
    <div class="chat-main">
      <header class="chat-header">
        <div class="header-context"><span class="workspace-current">{{ activeWorkspace === 'default' ? '个人空间' : workspaces.find(item => item.workspaceId === activeWorkspace)?.name }}</span><strong>{{ sessions.find(item => item.sessionId === sessionId)?.title || '新会话' }}</strong></div>
        <span class="header-badge">多轮对话</span>
      </header>
    <section ref="history" class="chat-history" aria-live="polite" @scroll.passive="updateFollowLatest">
      <p v-if="loading" class="session-hint" role="status">正在加载会话记录…</p>
      <div v-else-if="messages.length === 0" class="chat-empty">
        <span class="empty-mark" aria-hidden="true">✦</span>
        <span class="empty-eyebrow">一个想法，就是新的开始</span>
        <h1>今天，我们一起做点什么？</h1>
        <p>聊一个问题，探索一个想法，或者从你的项目开始。</p>
        <div class="empty-prompts" aria-label="示例问题">
          <button type="button" :disabled="workspaceBusy || loading" @click="input = '帮我分析当前项目的结构与主要功能'">分析项目<span>梳理结构，找到重点 <span aria-hidden="true">↗</span></span></button>
          <button type="button" :disabled="workspaceBusy || loading" @click="input = '帮我把一个想法拆解成可执行的步骤'">整理思路<span>把想法变成行动 <span aria-hidden="true">↗</span></span></button>
          <button type="button" :disabled="workspaceBusy || loading" @click="input = '用简单易懂的方式解释一个概念'">学习新知<span>从问题开始探索 <span aria-hidden="true">↗</span></span></button>
        </div>
      </div>
      <article
        v-for="(message, index) in messages"
        :key="index"
        :class="['chat-message', message.role]"
      >
        <div class="chat-role">
          {{ message.role === MessageRole.USER ? "你" : "助手" }}
        </div>
        <p v-if="message.role === MessageRole.ASSISTANT && message.durationMs != null" class="task-duration" aria-live="off">
          {{ message.timing ? "已执行" : "用时" }} {{ formatDuration(message.durationMs) }}
        </p>
        <details v-if="message.role === MessageRole.ASSISTANT && message.reasoningContent" class="thinking-content">
          <summary>查看思考过程</summary>
          <div>{{ message.reasoningContent }}</div>
        </details>
        <MarkdownReply v-if="message.role === MessageRole.ASSISTANT && message.content" class="chat-content" :content="message.content" />
        <div v-else-if="message.content || (!message.reasoningContent && message.timing)" class="chat-content">{{ message.content || replyStatus }}</div>
      </article>
    </section>
      <form class="chat-composer" @submit.prevent="send">
      <p v-if="pending" class="chat-status" role="status">{{ replyStatus }}</p>
      <p v-if="activeView.notice" class="chat-status" role="status">{{ activeView.notice }}</p>
      <p v-if="error" class="chat-error" role="alert">{{ error }}</p>
      <!-- 工具事件只更新内容，展开状态由用户控制；切换会话时重置为收起。 -->
      <details v-if="tools.length" :key="`${activeWorkspace}:${sessionId}`" class="tool-status">
        <summary>
          <span class="tool-summary-title">工具调用 <span class="tool-count">{{ tools.length }}</span></span>
          <span class="tool-summary-result">
            <span v-if="successfulTools" class="tool-success-count">✓ {{ successfulTools }} 项成功</span>
            <span v-if="failedTools" class="tool-failure-count">{{ failedTools }} 项失败</span>
            <span v-if="runningTools">{{ runningTools }} 项执行中</span>
            <span class="tool-expand-label">查看详情<span aria-hidden="true">⌄</span></span>
          </span>
        </summary>
        <div class="tool-list">
          <div v-for="tool in toolRows" :key="tool.id" class="tool-row">
            <span class="tool-row-name">{{ tool.name }}</span>
            <span :class="['tool-state', tool.tone]" :title="tool.status">{{ tool.label }}</span>
          </div>
        </div>
      </details>
      <details v-if="displayedChoice" :key="displayedChoice.requestId" class="tool-confirmation choice-drawer"
        :open="!activeView.choiceCollapsed">
        <summary>{{ choicePending && !pending ? '需要你的选择' : '查看已提交选择' }}<span>展开 / 收起</span></summary>
        <fieldset v-for="(question, index) in displayedChoice.questions" :key="question.questionId" class="choice-question"
          :disabled="!choicePending || workspaceBusy || pending || loading">
          <legend>{{ question.question }}{{ question.multiple ? '（可多选）' : '（单选）' }}</legend>
          <label v-for="(option, optionIndex) in question.options" :key="option.id" class="choice-option">
            <input :type="question.multiple ? 'checkbox' : 'radio'" :name="question.questionId"
              :checked="displayedAnswers[index]?.selectedOptionIds.includes(option.id)"
              @change="selectOption(index, option.id, question.multiple)" />
            <span>{{ String.fromCharCode(65 + optionIndex) }}. {{ option.label }}<small v-if="option.description">{{ option.description }}</small></span>
          </label>
          <textarea v-if="question.allowText && displayedAnswers[index]" :value="displayedAnswers[index]!.text"
            maxlength="4000" rows="2" aria-label="补充内容" placeholder="也可以补充内容或填写自己的选择"
            @input="updateChoiceText(index, $event)" />
        </fieldset>
        <button v-if="choicePending" type="button" :disabled="workspaceBusy || pending || loading" @click="answerQuestions">提交选择</button>
      </details>
      <section v-if="confirmation && confirmation.type !== InteractionType.CHOICE" class="tool-confirmation" aria-label="工具调用确认">
          <div class="authorization-heading">
            <strong>允许执行这些工具？</strong>
            <span>{{ confirmation.tools.length }} 项调用</span>
          </div>
          <p class="authorization-description">请查看调用内容，再选择授权范围。</p>
          <div class="authorization-tools">
            <details v-for="tool in confirmation.tools" :key="tool.id" class="confirmation-tool">
              <summary>
                <span class="tool-name">{{ tool.name }}</span>
                <span class="tool-preview">{{ tool.input.query || tool.input.path || '查看调用参数' }}</span>
              </summary>
              <pre>{{ JSON.stringify(tool.input, null, 2) }}</pre>
            </details>
          </div>
          <div class="confirmation-actions">
            <button type="button" :disabled="workspaceBusy || pending || loading" @click="confirmTools(true)">同意本次</button>
            <button type="button" class="session-approve" :disabled="workspaceBusy || pending || loading" @click="confirmTools(true, ApprovalScope.SESSION)">本次会话都同意</button>
            <button type="button" class="reject-tool" :disabled="workspaceBusy || pending || loading" @click="confirmTools(false)">拒绝</button>
          </div>
          <p class="authorization-hint">会话授权仅作用于当前用户和当前会话；选项问题仍由你回答。</p>
      </section>
      <p v-if="modelError" class="chat-error" role="alert">{{ modelError }}</p>
      <div class="chat-input-row">
        <textarea
          v-model="input"
          aria-label="聊天内容"
          placeholder="想聊些什么？"
          rows="2"
          :disabled="workspaceBusy || pending || loading || !!confirmation"
          @keydown.enter.exact.prevent="send"
        />
        <div class="composer-actions">
          <span class="composer-hint">Enter 发送 · Shift + Enter 换行</span>
          <div class="composer-controls">
            <div class="model-toolbar">
              <select id="chat-model" :value="selectedModelId" @change="selectModel"
                :disabled="modelsLoading || workspaceBusy || loading || !sessionId"
                aria-label="选择聊天模型" title="所有会话共用选择，发送消息时保存">
                <option v-for="model in modelOptions" :key="model.id" :value="model.id" :title="model.description">{{ model.name }}</option>
              </select>
              <svg class="model-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>
            </div>
            <button v-if="pending" class="composer-submit" type="button" :disabled="activeView.stopping"
              :aria-label="activeView.stopping ? '正在停止回复' : '停止回复'" title="停止回复" @click="stopReply">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
            </button>
            <button v-else class="composer-submit" type="submit" aria-label="发送消息" title="发送消息"
              :disabled="workspaceBusy || loading || !!confirmation || !selectedModelId || !sessionId || !input.trim()">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6" /></svg>
            </button>
          </div>
        </div>
      </div>
    </form>
    </div>
  </main>
</template>

<style scoped>
.chat-page {
  height: 100dvh;
  overflow: hidden;
  display: flex;
  min-width: 0;
  background: #fafbf9;
  color: #25352f;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
}
.chat-sidebar {
  width: 264px;
  box-sizing: border-box;
  flex-shrink: 0;
  padding: 26px 16px 18px;
  background: #f1f3ee;
  border-right: 1px solid #e4e8e0;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.chat-sidebar input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px;
  border: 1px solid #e0e5df;
  border-radius: 8px;
}
.chat-sidebar button {
  align-self: stretch;
}
.session-heading {
  margin-top: 12px;
  font-size: 13px;
  color: #7b8580;
}
.session-list {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
}
.session-item {
  display: block;
  width: 100%;
  margin-bottom: 4px;
  text-align: left;
  background: transparent;
  color: #25352f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.session-item:hover, .session-item.active {
  background: #e2ece6;
  color: #28533f;
}
.session-hint {
  color: #7b8580;
  font-size: 13px;
}
.user-profile {
  position: relative;
  flex-shrink: 0;
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid #e0e5df;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.user-profile-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.user-avatar {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #2e6150;
  color: white;
}
.user-profile-details {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.user-profile-details strong, .user-profile-details span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.user-profile-details strong {
  font-size: 14px;
}
.user-profile-details span {
  font-size: 12px;
  color: #7b8580;
}
.profile-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 12px;
  cursor: pointer;
  list-style: none;
}
.profile-trigger::-webkit-details-marker { display: none; }
.profile-trigger:hover, .profile-menu[open] .profile-trigger { background: #e2ece6; }
.profile-trigger strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; }
.profile-more { margin-left: auto; }
.profile-popover {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  width: min(280px, calc(100vw - 32px));
  box-sizing: border-box;
  padding: 16px;
  background: #292929;
  color: #f5f5f5;
  border: 1px solid #454545;
  border-radius: 18px;
  box-shadow: 0 12px 32px #0003;
  z-index: 20;
}
.profile-popover .user-profile-details span { color: #aaa; }
.profile-menu-actions { border-top: 1px solid #454545; margin-top: 14px; padding-top: 8px; }
.profile-menu-actions button { display: flex; align-items: center; gap: 12px; width: 100%; background: transparent; color: inherit; text-align: left; }
.profile-menu-actions button:hover { background: #3c3c3c; }
.profile-menu-actions button span { width: 20px; font-size: 20px; }
.account-settings {
  box-sizing: border-box;
  height: min(800px, 90dvh);
  max-height: 90dvh;
  overflow: hidden;
  width: min(860px, calc(100vw - 48px));
  padding: 28px;
  background: #fff;
  border: 1px solid #e0e5df;
  border-radius: 24px;
  color: #25352f;
  box-shadow: 0 24px 90px #192b2226;
}
.account-settings[open] { display: flex; flex-direction: column; }
.settings-layout { display: grid; grid-template-columns: 160px minmax(0, 1fr); margin-top: 20px; min-height: 0; flex: 1; }
.settings-navigation { display: flex; flex-direction: column; gap: 6px; padding-right: 16px; border-right: 1px solid #e8ece6; }
.settings-navigation button { display: flex; justify-content: space-between; align-self: stretch; text-align: left; padding: 12px; background: transparent; color: #7b8580; }
.settings-navigation button.selected, .settings-navigation button:hover { background: #f0f3ee; color: #25352f; }
.settings-navigation span { font-size: 12px; }
.settings-detail { min-width: 0; min-height: 0; overflow-y: auto; scrollbar-gutter: stable; padding-left: 24px; }
.settings-capabilities { margin: 0; }
.settings-capabilities h3 { margin-top: 0; }
@media (max-width: 640px) {
  .settings-layout { grid-template-columns: 105px minmax(0, 1fr); }
  .settings-navigation { padding-right: 8px; }
  .settings-navigation button { padding: 10px 6px; font-size: 12px; }
  .settings-detail { padding-left: 12px; }
}
.settings-capabilities small { color: #7b8580; font-weight: normal; }
.settings-capability { padding: 12px; margin: 8px 0; border: 1px solid #e8ece6; border-radius: 8px; overflow-wrap: anywhere; }
.capability-row { display: flex; align-items: flex-start; gap: 12px; }
.capability-row details { flex: 1; min-width: 0; }
.capability-switch { flex-shrink: 0; align-self: flex-start; padding: 4px 10px; background: #f0f3ee; color: #7b8580; font-size: 12px; }
.capability-switch.enabled { background: #e4f3e9; color: #197442; }
.settings-capability summary { cursor: pointer; font-weight: 600; }
.settings-capability p { white-space: pre-wrap; color: #7b8580; font-size: 13px; line-height: 1.6; }
.account-settings::backdrop { background: #0005; }
.settings-heading { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; }
.settings-heading h2 { margin: 0; }
.settings-heading button { align-self: center; background: #f0f3ee; color: #25352f; font-size: 20px; }
.chat-main {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
}
.sidebar-chats { min-height: 0; flex: 1; overflow-y: auto; }
.new-chat-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  align-self: stretch;
  padding: 12px 16px;
  background: #fff;
  color: #2e6150;
  border: 1px solid #dce5db;
  border-radius: 14px;
  box-shadow: 0 2px 3px #243c2b04;
  font-weight: 600;
}
.projects-heading { display: flex; align-items: center; justify-content: space-between; margin: 16px 0 8px; }
.projects-heading button { background: transparent; color: #7b8580; padding: 6px 8px; }
.projects-heading .project-add { font-size: 20px; }
.project-row { display: flex; align-items: center; border-radius: 10px; }
.project-row:hover { background: #eef2ee; }
.project-item { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; background: transparent; color: #25352f; padding: 10px 8px; text-align: left; }
.project-item svg { flex-shrink: 0; }
.project-item span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.project-item.selected { font-weight: 600; }
.project-new-chat { background: transparent; color: #7b8580; padding: 8px; align-self: center; }
.project-conversations { padding-left: 26px; }
.project-conversations .session-item { padding: 9px 12px; }
.projects-list { margin-bottom: 24px; }
.sidebar-chats > .session-heading { margin-bottom: 8px; }
.sidebar-chats .session-hint { padding: 0 8px; }
.workspace-create input { box-sizing: border-box; width: 100%; padding: 10px; border: 1px solid #e0e5df; border-radius: 8px; }
.workspace-create div { display: flex; gap: 6px; margin-top: 8px; }
.workspace-create button { font-size: 12px; padding: 8px 12px; }
.workspace-current { display: block; font-size: 12px; color: #7b8580; font-weight: normal; margin-bottom: 4px; }
.chat-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 74px;
  box-sizing: border-box;
  padding: 16px 32px;
  background: #ffffffb8;
  border-bottom: 1px solid #edf0ea;
}
@media (max-width: 640px) {
  .chat-sidebar {
    width: 150px;
    padding: 16px 10px;
  }
  .chat-header {
    padding: 20px 16px;
  }
}
.chat-history {
  overscroll-behavior: contain;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 36px max(24px, calc((100% - 820px) / 2));
  scrollbar-gutter: stable;
}
.chat-empty {
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
  padding: clamp(32px, 10vh, 110px) 0 40px;
  text-align: center;
}
.chat-empty h1 {
  margin: 18px 0 14px;
  font-size: clamp(25px, 2.7vw, 36px);
  letter-spacing: -1px;
  line-height: 1.45;
  font-weight: 600;
}
.chat-empty p {
  margin: 0;
  color: #7b8580;
  font-size: 14px;
  line-height: 1.8;
}
.chat-message {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin: 0 0 32px;
}
.chat-message.user {
  align-items: flex-end;
}
.chat-message.user .chat-content {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.9;
  font-size: 15px;
}
.chat-message.assistant .chat-content {
  max-width: 100%;
  white-space: normal;
}
.chat-role {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #88918b;
  font-size: 12px;
  margin-bottom: 10px;
  font-weight: 500;
}
.chat-content {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.8;
}
.user .chat-content {
  background: #edf3ee;
  border-radius: 12px;
  padding: 14px 18px;
}
.chat-composer {
  flex-shrink: 0;
  width: min(820px, calc(100% - 48px));
  margin: 0 auto 22px;
}
.chat-input-row {
  display: flex;
  flex-direction: column;
  background: white;
  padding: 14px 18px 10px;
  border: 1px solid #e0e6de;
  border-radius: 22px;
  box-shadow: 0 6px 28px #20352708, 0 1px 3px #20352703;
}
.chat-input-row > textarea {
  width: 100%;
  box-sizing: border-box;
  min-height: 48px;
  padding: 2px 2px 6px;
  line-height: 1.6;
}
.chat-input-row > textarea::placeholder { color: #b0b3b8; }
.composer-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.composer-hint { color: #93979e; font-size: 12px; }
.composer-controls { display: flex; align-items: center; gap: 16px; margin-left: auto; min-width: 0; }
.model-toolbar { display: flex; align-items: center; position: relative; min-width: 0; }
.model-toolbar select {
  appearance: none;
  max-width: 230px;
  padding: 8px 24px 8px 8px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #24272c;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  text-overflow: ellipsis;
}
.model-toolbar select:hover { background: #f5f6f7; }
.model-toolbar select:focus-visible { outline: 2px solid #5a8b70; outline-offset: 2px; }
.model-chevron { position: absolute; right: 4px; width: 16px; height: 16px; fill: none; stroke: #92969d; stroke-width: 2; pointer-events: none; }
.chat-input-row .composer-submit {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  align-self: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 50%;
  background: #202329;
  color: white;
}
.composer-submit svg { width: 23px; height: 23px; }
.composer-submit rect { fill: currentColor; }
.composer-submit path { fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
@media (max-width: 640px) {
  .composer-hint { display: none; }
  .model-toolbar select { max-width: 190px; }
  .chat-input-row { padding: 10px 14px 8px; border-radius: 20px; }
}
textarea {
  flex: 1;
  min-width: 0;
  resize: none;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  padding: 8px;
}
textarea:focus {
  outline: none;
}
.chat-input-row:focus-within {
  border-color: #5a8b70;
  box-shadow: 0 0 0 2px #5a8b701c;
}
button {
  align-self: flex-end;
  padding: 10px 18px;
  border: none;
  border-radius: 10px;
  background: #2e6150;
  color: white;
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
.chat-error {
  color: #b42318;
  font-size: 14px;
}
.tool-status { margin-bottom: 10px; border: 1px solid #e2e9df; border-radius: 12px; background: #f5f8f2; color: #7b8580; font-size: 12px; line-height: 1.7; }
.tool-status > summary { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 14px; cursor: pointer; list-style: none; }
.tool-status > summary::-webkit-details-marker { display: none; }
.tool-status > summary:focus-visible { outline: 2px solid #659774; outline-offset: 2px; border-radius: 12px; }
.tool-summary-title { display: flex; align-items: center; gap: 8px; color: #49614e; font-weight: 500; flex-shrink: 0; }
.tool-count { padding: 0 6px; border-radius: 5px; background: #e8efe4; font-size: 11px; }
.tool-summary-result { display: flex; align-items: center; justify-content: flex-end; gap: 12px; flex-wrap: wrap; }
.tool-success-count { color: #548267; }
.tool-failure-count { color: #b35749; }
.tool-expand-label { display: flex; align-items: center; gap: 6px; color: #8b978b; }
.tool-expand-label > span { display: inline-block; transition: transform .15s; }
.tool-status[open] .tool-expand-label > span { transform: rotate(180deg); }
.tool-list { height: 180px; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; padding: 4px 14px 10px; border-top: 1px solid #e6ece2; }
.tool-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 7px 0; }
.tool-row-name { min-width: 0; overflow-wrap: anywhere; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 12px; color: #5b6b5e; }
.tool-state { flex-shrink: 0; border-radius: 6px; padding: 2px 8px; font-size: 11px; background: #e9eee6; color: #84907f; }
.tool-state.success { background: #e6f0e5; color: #487457; }
.tool-state.error { background: #f9eae5; color: #b35749; }
.tool-state.running, .tool-state.waiting { background: #f5eedb; color: #96804d; }
@media (max-width: 640px) {
  .tool-status > summary { padding: 9px 10px; gap: 8px; }
  .tool-summary-result { gap: 6px; }
  .tool-expand-label { font-size: 11px; }
}
.tool-confirmation {
  padding: 20px;
  margin-bottom: 12px;
  background: #fff;
  border: 1px solid #d9e6db;
  border-radius: 18px;
  box-shadow: 0 3px 16px #25352f06;
  max-height: 45vh;
  overflow-y: auto;
}
.authorization-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.authorization-heading > span {
  flex-shrink: 0;
  background: #f0f3ee;
  border-radius: 6px;
  padding: 3px 7px;
  color: #7b8580;
  font-size: 12px;
}
.authorization-description, .authorization-hint {
  color: #7b8580;
  font-size: 12px;
  line-height: 1.6;
  margin: 8px 0 12px;
}
.authorization-hint {
  margin: 12px 0 0;
}
.authorization-tools {
  max-height: 22vh;
  overflow-y: auto;
  margin-bottom: 16px;
}
.confirmation-tool {
  padding: 10px 12px;
  border: 1px solid #e8ece6;
  border-radius: 8px;
  background: #fafbf9;
}
.confirmation-tool + .confirmation-tool {
  margin-top: 8px;
}
.confirmation-tool summary {
  cursor: pointer;
  font-size: 13px;
  overflow-wrap: anywhere;
}
.tool-name {
  font-family: monospace;
  font-weight: 600;
  margin-right: 8px;
}
.tool-preview {
  color: #7b8580;
}
.confirmation-tool pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 12px;
  line-height: 1.6;
  margin-bottom: 0;
}
.confirmation-actions .session-approve {
  background: white;
  color: #2e6150;
  border: 1px solid #b8c5d9;
}
.confirmation-actions .reject-tool {
  background: white;
  color: #b42318;
  border: 1px solid #e8ece6;
}
.choice-question {
  margin: 14px 0;
  border: 1px solid #e4e9df;
  border-radius: 12px;
  padding: 14px;
}
.choice-option {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 10px 8px;
  border-radius: 9px;
  cursor: pointer;
}
.choice-option input {
  margin-top: 4px;
}
.choice-option small {
  display: block;
  color: #7b8580;
  margin-top: 4px;
}
.choice-question textarea {
  box-sizing: border-box;
  width: 100%;
  background: white;
  border: 1px solid #e0e5df;
  border-radius: 8px;
  margin-top: 8px;
}
.confirmation-actions {
  flex-wrap: wrap;
  display: flex;
  gap: 12px;
}
.chat-status {
  color: #7b8580;
  font-size: 14px;
}

.chat-brand { display: flex; align-items: center; gap: 11px; margin: 0 8px 4px; font-size: 19px; letter-spacing: -.5px; }
.chat-brand small { display: block; margin-top: 4px; font-size: 10px; color: #929b91; font-weight: 400; letter-spacing: 1px; }
.brand-mark { display: grid; place-items: center; width: 35px; height: 35px; flex-shrink: 0; border-radius: 11px; color: #fff; background: #2e6150; font-size: 20px; font-weight: 600; }
.header-context { min-width: 0; }
.header-context strong { display: block; max-width: min(620px, 55vw); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 14px; font-weight: 500; }
.header-badge { flex-shrink: 0; border: 1px solid #e1e8de; background: #f5f7f2; color: #7b897b; border-radius: 20px; padding: 5px 11px; font-size: 11px; }
.empty-mark { display: grid; place-items: center; width: 64px; height: 64px; margin: 0 auto 24px; color: #3c7557; background: #edf2e8; border: 1px solid #e4eada; border-radius: 22px; font-size: 36px; }
.empty-eyebrow { color: #84917f; font-size: 11px; letter-spacing: 2px; }
.empty-prompts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 36px; }
.empty-prompts button { align-self: stretch; padding: 18px 16px; background: #fff; color: #394c3d; border: 1px solid #e2e8de; border-radius: 15px; text-align: left; font-size: 13px; font-weight: 500; }
.empty-prompts button > span { display: flex; justify-content: space-between; gap: 6px; margin-top: 9px; color: #90988c; font-size: 11px; font-weight: 400; }
.empty-prompts button:hover:not(:disabled) { background: #f5f8f1; border-color: #c7d8c6; }
.chat-message.assistant .chat-role::before { content: '✦'; color: #548267; font-size: 14px; }
.choice-option:hover { background: #f4f7f0; }
.choice-option:has(input:checked) { background: #edf4e8; }
.choice-option input { accent-color: #3c7557; }
.chat-page button { transition: background-color .15s, border-color .15s, box-shadow .15s; }
.chat-page button:focus-visible, .profile-trigger:focus-visible { outline: 2px solid #659774; outline-offset: 3px; }
.chat-page button:disabled { opacity: .45; }
.new-chat-button:hover:not(:disabled) { background: #f9fcf6; border-color: #b9cdb9; }
.chat-page ::-webkit-scrollbar { width: 6px; height: 6px; }
.chat-page ::-webkit-scrollbar-thumb { background: #d4ddd0; border-radius: 6px; }
.chat-page ::-webkit-scrollbar-track { background: transparent; }
@media (max-width: 900px) {
  .chat-sidebar { width: 225px; padding: 22px 12px 16px; }
  .empty-prompts { grid-template-columns: 1fr; max-width: 340px; margin: 24px auto 0; gap: 8px; }
  .empty-prompts button { padding: 13px 16px; }
  .empty-prompts button > span { margin-top: 6px; }
}
@media (max-width: 640px) {
  .chat-sidebar { width: 145px; padding: 18px 8px 12px; gap: 14px; }
  .chat-brand { gap: 7px; margin-left: 2px; font-size: 12px; letter-spacing: -.3px; }
  .brand-mark { width: 25px; height: 28px; border-radius: 8px; font-size: 16px; }
  .chat-brand small { display: none; }
  .chat-header { padding: 14px 16px; min-height: 65px; }
  .header-badge { display: none; }
  .chat-history { padding: 24px 14px; }
  .chat-composer { width: calc(100% - 24px); margin-bottom: 12px; }
  .model-toolbar select { max-width: min(140px, calc(100vw - 260px)); font-size: 12px; }
  .composer-controls { gap: 6px; }
  .chat-input-row { padding: 10px 12px 8px; border-radius: 19px; }
  .chat-empty { padding-top: 30px; }
  .chat-empty h1 { font-size: 23px; letter-spacing: -.5px; }
  .chat-empty p { font-size: 12px; }
  .empty-mark { width: 48px; height: 48px; font-size: 28px; border-radius: 16px; }
  .empty-eyebrow { letter-spacing: 0; font-size: 10px; }
  .tool-confirmation { padding: 14px; }
  .confirmation-actions { gap: 7px; }
  .confirmation-actions button { padding: 8px 10px; font-size: 12px; }
}
@media (prefers-reduced-motion: reduce) { .chat-page button { transition: none; } }
.choice-drawer > summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; cursor: pointer; list-style: none; color: #354d3e; font-weight: 600; }
.choice-drawer > summary::-webkit-details-marker { display: none; }
.choice-drawer > summary span { color: #7b897e; font-size: 12px; font-weight: 400; }
.choice-drawer[open] > summary { margin-bottom: 18px; }
.choice-drawer > summary:focus-visible { outline: 2px solid #659774; outline-offset: 4px; border-radius: 4px; }
.thinking-content { width: 100%; margin-bottom: 12px; color: #7b897e; font-size: 13px; }
.thinking-content > summary { cursor: pointer; padding: 6px 0; }
.thinking-content > div { max-height: 280px; overflow-y: auto; padding: 12px 16px; margin-top: 6px; border-left: 2px solid #c8d8c8; background: #f2f6f0; border-radius: 0 8px 8px 0; white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.8; }
</style>


<style scoped>
.task-duration { width: 100%; margin: 0 0 12px; padding-bottom: 10px; border-bottom: 1px solid #e5ebe5; color: #8a958d; font-size: 13px; line-height: 1.5; font-variant-numeric: tabular-nums; }
</style>
