<script lang="ts">
import { apiFetch } from '$lib/api';
import { goto } from '$app/navigation';
import { getMe } from '$lib/services/auth-api';

  let email = '';
  let purpose: 'login' | 'signup' = 'login';
  let otp = '';
  let status = '';
  let error = '';

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
    error = '';
    status = 'Verifying…';
    try {
      await apiFetch('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ email, purpose, code: otp }),
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
      await goto('/plan');
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
      <button class="button" on:click={sendOtp} disabled={!email}>Send OTP</button>
    </div>
  </div>

  <hr style="margin:24px 0;border:1px solid var(--border);" />

  <div class="row">
    <div>
      <label>OTP Code</label>
      <input class="input" bind:value={otp} placeholder="123456" />
    </div>
    <div>
      <button class="button" on:click={verifyOtp} disabled={!email || !otp}>Verify</button>
    </div>
  </div>

  {#if status}
    <p class="muted" style="margin-top:16px;">{status}</p>
  {/if}
  {#if error}
    <p style="margin-top:16px;color:var(--danger);">{error}</p>
  {/if}
</div>
