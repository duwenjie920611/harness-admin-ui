<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { login } from "@/api/auth";

const router = useRouter();
const username = ref("");
const password = ref("");
const submitting = ref(false);
const error = ref("");
const showPassword = ref(false);

async function submit() {
  if (submitting.value || !username.value.trim() || !password.value) {
    return;
  }
  submitting.value = true;
  error.value = "";
  try {
    await login(username.value.trim(), password.value);
    password.value = "";
    showPassword.value = false;
    await router.replace("/chat");
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : "登录失败";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <main class="login-page">
    <header class="login-brand"><span class="brand-mark" aria-hidden="true">H</span><span>HarnessChat</span></header>
    <div class="login-shell">
      <section class="login-intro" aria-labelledby="intro-title">
        <span class="intro-label">你的智能工作伙伴</span>
        <h1 id="intro-title">把想法，<br />变成下一步。</h1>
        <p class="intro-description">从一次对话开始，梳理问题、探索项目，<br class="desktop-break" />让每一步都更清晰。</p>
        <div class="intro-illustration" aria-hidden="true">
          <div class="illustration-top"><span class="illustration-icon">✦</span><span>一个想法，新的开始</span><span class="illustration-dots">···</span></div>
          <div class="illustration-question">我们一起，理清下一步。</div>
          <div class="illustration-response"><span>✦</span><div><i></i><i></i><i></i></div></div>
          <div class="illustration-bottom"><span>项目 · 对话 · 工具</span><span class="illustration-arrow">↑</span></div>
        </div>
        <div class="intro-caption"><span aria-hidden="true">↗</span> 思路不断，对话继续。</div>
      </section>
      <section class="login-panel" aria-labelledby="login-title">
        <form class="login-card" @submit.prevent="submit" :aria-busy="submitting">
          <span class="login-eyebrow">WELCOME BACK</span>
          <h2 id="login-title">欢迎回来</h2>
          <p class="login-description">登录后，继续你的项目与对话。</p>
          <div class="login-field">
            <label for="login-username">用户名</label>
            <div class="input-shell">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M5 20v-2a7 7 0 0 1 14 0v2" /></svg>
              <input id="login-username" v-model="username" placeholder="输入你的用户名" autocomplete="username"
                maxlength="64" required autofocus :disabled="submitting" :aria-describedby="error ? 'login-error' : undefined" />
            </div>
          </div>
          <div class="login-field">
            <label for="login-password">密码</label>
            <div class="input-shell">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><path d="M12 14v3" /></svg>
              <input id="login-password" v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="输入你的密码"
                autocomplete="current-password" maxlength="72" required :disabled="submitting" :aria-describedby="error ? 'login-error' : undefined" />
              <button class="password-toggle" type="button" :aria-label="showPassword ? '隐藏密码' : '显示密码'"
                :aria-pressed="showPassword" :disabled="submitting" @click="showPassword = !showPassword">{{ showPassword ? '隐藏' : '显示' }}</button>
            </div>
          </div>
          <p v-if="error" id="login-error" class="login-error" role="alert"><span aria-hidden="true">!</span>{{ error }}</p>
          <button class="login-submit" type="submit" :disabled="submitting || !username.trim() || !password">
            <span v-if="submitting" class="login-spinner" aria-hidden="true"></span>
            {{ submitting ? "正在登录…" : "登录 HarnessChat" }}<span v-if="!submitting" aria-hidden="true">→</span>
          </button>
          <p class="login-note">从这里，接着上一次的思路。</p>
        </form>
      </section>
    </div>
    <footer class="login-footer">HarnessChat · 让想法向前一步</footer>
  </main>
</template>

<style scoped>
.login-page { min-height: 100dvh; box-sizing: border-box; display: flex; flex-direction: column; background: #fafbf9; padding: 32px max(24px, calc((100vw - 1160px) / 2)); color: #25352f; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; -webkit-font-smoothing: antialiased; }
.login-brand { display: flex; align-items: center; gap: 11px; font-size: 20px; font-weight: 600; letter-spacing: -.5px; }
.brand-mark { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; color: #fff; background: #2e6150; font-size: 21px; }
.login-shell { display: grid; grid-template-columns: 1.05fr 1fr; width: 100%; max-width: 1080px; margin: auto; padding: 40px 0; gap: clamp(32px, 6vw, 80px); align-items: center; }
.login-intro { min-width: 0; padding: 36px 24px; }
.intro-label { display: inline-block; font-size: 12px; letter-spacing: 2px; color: #6a886d; }
h1 { margin: 20px 0; font-size: clamp(36px, 4.3vw, 56px); font-weight: 600; line-height: 1.35; letter-spacing: -2px; }
.intro-description { font-size: 14px; color: #7b8580; line-height: 1.9; margin-bottom: 34px; }
.intro-illustration { max-width: 360px; padding: 22px; border: 1px solid #dce6d8; border-radius: 21px; background: #f0f4eb; transform: rotate(-2deg); box-shadow: 0 12px 30px #2e49300a; }
.illustration-top { display: flex; align-items: center; gap: 8px; color: #638368; font-size: 11px; }
.illustration-icon { font-size: 18px; }
.illustration-dots { margin-left: auto; font-size: 22px; letter-spacing: 2px; }
.illustration-question { margin: 20px 0 20px 28px; padding: 13px 17px; border: 1px solid #e2eadc; border-radius: 13px 13px 4px 13px; background: white; font-size: 13px; color: #536b51; }
.illustration-response { display: flex; gap: 11px; align-items: flex-start; color: #5f8864; }
.illustration-response > span { font-size: 19px; }
.illustration-response > div { flex: 1; padding-top: 3px; }
.illustration-response i { display: block; width: 90%; height: 6px; margin-bottom: 9px; background: #d5e0ce; border-radius: 5px; }
.illustration-response i:nth-child(2) { width: 100%; }
.illustration-response i:nth-child(3) { width: 65%; }
.illustration-bottom { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #dee7d8; margin-top: 17px; padding-top: 13px; color: #8b9b81; font-size: 10px; letter-spacing: 1px; }
.illustration-arrow { display: grid; place-items: center; width: 25px; height: 25px; border-radius: 50%; background: #426d52; color: white; font-size: 16px; }
.intro-caption { margin-top: 28px; font-size: 12px; color: #8c9789; }
.intro-caption span { margin-right: 7px; color: #6f8d6e; }
.login-panel { min-width: 0; }
.login-card { width: 100%; max-width: 440px; box-sizing: border-box; padding: 42px 38px 30px; background: white; border: 1px solid #e4e9df; border-radius: 25px; box-shadow: 0 14px 50px #283e2806, 0 2px 8px #283e2803; }
.login-eyebrow { color: #899d87; font-size: 10px; letter-spacing: 2px; font-weight: 500; }
h2 { margin: 12px 0 10px; font-size: 28px; font-weight: 600; letter-spacing: -.8px; }
.login-description { margin: 0 0 30px; color: #879086; font-size: 13px; line-height: 1.8; }
.login-field { margin-bottom: 20px; }
label { display: block; margin-bottom: 9px; color: #526451; font-size: 12px; font-weight: 500; }
.input-shell { display: flex; align-items: center; min-height: 49px; gap: 10px; padding: 0 13px; border: 1px solid #dfe6db; border-radius: 11px; --input-background: #f3f7f2; background: var(--input-background); transition: border-color .15s, box-shadow .15s; }
.input-shell:focus-within { border-color: #7aa486; box-shadow: 0 0 0 3px #5a8b7014; --input-background: #f8fbf7; }
.input-shell:has(input:disabled) { opacity: .65; }
.input-shell > svg { flex-shrink: 0; width: 18px; height: 18px; fill: none; stroke: #95a18d; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
input { min-width: 0; flex: 1; width: 100%; height: 48px; padding: 0; border: 0; outline: none; background: transparent; color: #25352f; font: inherit; font-size: 14px; }
/* 自动填充与整个输入框使用同一底色，避免浏览器默认蓝色背景割裂图标和文字区域。 */
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus {
  -webkit-text-fill-color: #25352f;
  caret-color: #25352f;
  -webkit-box-shadow: 0 0 0 1000px var(--input-background) inset;
  box-shadow: 0 0 0 1000px var(--input-background) inset;
}
input:autofill { background: var(--input-background); color: #25352f; }
input::placeholder { color: #a7afa2; font-size: 12px; }
button { font: inherit; cursor: pointer; }
.password-toggle { flex-shrink: 0; padding: 6px 0 6px 6px; border: 0; background: transparent; color: #7c9477; font-size: 11px; }
.password-toggle:hover { color: #2e6150; }
button:focus-visible { outline: 2px solid #659774; outline-offset: 4px; }
.login-submit { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; min-height: 48px; margin-top: 26px; padding: 12px; border: 0; border-radius: 11px; background: #2e6150; color: white; font-size: 13px; font-weight: 500; box-shadow: 0 3px 8px #2e615014; transition: background-color .15s; }
.login-submit:hover:not(:disabled) { background: #244f40; }
button:disabled { opacity: .5; cursor: default; }
.login-error { display: flex; align-items: flex-start; gap: 8px; margin: 4px 0 0; padding: 11px 12px; background: #fff5f1; border: 1px solid #f1dfd5; border-radius: 9px; color: #b05741; font-size: 12px; line-height: 1.6; overflow-wrap: anywhere; }
.login-error > span { display: grid; place-items: center; width: 16px; height: 16px; flex-shrink: 0; margin-top: 2px; border-radius: 50%; background: #e5b6a5; color: white; font-weight: 600; font-size: 11px; }
.login-note { margin: 19px 0 0; color: #a0a99a; text-align: center; font-size: 11px; }
.login-footer { text-align: center; color: #a0a99a; font-size: 10px; letter-spacing: 1px; padding-top: 10px; }
.login-spinner { width: 13px; height: 13px; border: 2px solid #ffffff50; border-top-color: white; border-radius: 50%; animation: login-spin .8s linear infinite; }
@keyframes login-spin { to { transform: rotate(360deg); } }
@media (max-width: 800px) {
  .login-page { padding: 24px; }
  .login-shell { grid-template-columns: 1fr; max-width: 440px; gap: 24px; padding: 34px 0; }
  .login-intro { padding: 0; text-align: center; }
  h1 { font-size: 32px; letter-spacing: -1px; margin: 12px 0; }
  h1 br { display: none; }
  .intro-description { margin-bottom: 0; font-size: 12px; }
  .intro-illustration, .intro-caption { display: none; }
  .login-card { padding: 30px 26px 24px; border-radius: 21px; }
}
@media (max-width: 380px) { .login-page { padding: 20px 16px; } .login-card { padding: 26px 20px; } h1 { font-size: 27px; } }
@media (prefers-reduced-motion: reduce) { .input-shell, .login-submit { transition: none; } .login-spinner { animation: none; } }
</style>
