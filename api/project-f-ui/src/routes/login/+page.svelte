<script lang="ts">
import { apiFetch } from '$lib/api';
import { goto } from '$app/navigation';
import { getMe } from '$lib/services/auth-api';

  let email = '';
  let purpose: 'login' | 'signup' = 'login';
  let otpDigits = $state(['', '', '', '', '', '']);
  let digitRefs: HTMLInputElement[] = [];
  let status = '';
  let error = '';

  $derived: otp = otpDigits.join('');

  function onDigitInput(i: number, e: Event) {
    const val = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(-1);
    otpDigits[i] = val;
    if (val && i < 5) digitRefs[i + 1]?.focus();
    if (val && i === 5) verifyOtp();
  }

  function onDigitKeydown(i: number, e: KeyboardEvent) {
    if (e.key === 'Backspace' && !otpDigits[i] && i > 0) {
      digitRefs[i - 1]?.focus();
    }
  }

  function onPaste(e: ClipboardEvent) {
    const text = e.clipboardData?.getData('text').replace(/\D/g, '').slice(0, 6) ?? '';
    text.split('').forEach((ch, i) => { otpDigits[i] = ch; });
    digitRefs[Math.min(text.length, 5)]?.focus();
    e.preventDefault();
  }

  async function sendOtp() {
    error = '';
    status = 'Sending OTP…';
    try {
      await apiFetch('/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ email, purpose }),
      });
      status = 'OTP sent. Check your inbox.';
    } catch (err) {
      error = (err as Error).message;
      status = '';
    }
  }

  async function verifyOtp() {
    const code = otpDigits.join('');
    if (code.length < 6) return;
    error = '';
    status = 'Verifying…';
    try {
      await apiFetch('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ email, purpose, code }),
      });
      const me = await getMe();
      status = 'Verified. Redirecting…';
      if (me.auth?.needsOnboarding) {
        await goto('/onboarding/organization');
        return;
      }
      if (me.auth?.activeRole === 'driver') {
        await goto('/driver/workboard');
        return;
      }
      await goto('/dashboard');
    } catch (err) {
      error = (err as Error).message;
      status = '';
    }
  }
</script>

<div class="card" style="max-width:520px;margin:0 auto;">
  <h2 style="margin:0 0 12px;">OTP Login</h2>
  <p class="muted" style="margin-top:0;">Use your email to request and verify an OTP.</p>

  <div class="row">
    <div>
      <label>Email</label>
      <input class="input" bind:value={email} placeholder="you@company.com" />
    </div>
    <div>
      <label>Purpose</label>
      <select bind:value={purpose}>
        <option value="login">Login</option>
        <option value="signup">Signup</option>
      </select>
    </div>
    <div>
      <button class="button" onclick={sendOtp} disabled={!email}>Send OTP</button>
    </div>
  </div>

  <hr style="margin:24px 0;border:1px solid var(--border);" />

  <div>
    <label>OTP Code</label>
    <div style="display:flex;gap:8px;margin-top:8px;">
      {#each otpDigits as digit, i}
        <input
          bind:this={digitRefs[i]}
          type="text"
          inputmode="numeric"
          maxlength="1"
          value={digit}
          oninput={(e) => onDigitInput(i, e)}
          onkeydown={(e) => onDigitKeydown(i, e)}
          onpaste={onPaste}
          class="input"
          style="width:48px;text-align:center;font-size:20px;padding:10px 0;"
        />
      {/each}
    </div>
    <div style="margin-top:12px;">
      <button class="button" onclick={verifyOtp} disabled={!email || otpDigits.join('').length < 6}>Verify</button>
    </div>
  </div>

  {#if status}
    <p class="muted" style="margin-top:16px;">{status}</p>
  {/if}
  {#if error}
    <p style="margin-top:16px;color:var(--danger);">{error}</p>
  {/if}
</div>
