<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/api';
  import { createPlan, getOptimizationStatus } from '$lib/services/operations-api';

  const sample = {
    vehicles: [{ id: 1, start: [121.0437, 14.676], end: [121.0437, 14.676], time_window: [28800, 61200] }],
    jobs: [{ id: 101, location: [121.0509, 14.5547], service: 300 }],
  };

  let payload = JSON.stringify(sample, null, 2);
  let jobId = '';
  let status = '';
  let result = '';
  let error = '';

  onMount(async () => {
    try {
      await apiFetch('/auth/me');
    } catch {
      goto('/login');
    }
  });

  async function submitPlan() {
    error = '';
    status = 'Submitting optimization...';
    result = '';
    try {
      const body = JSON.parse(payload);
      const response = await createPlan(body);
      jobId = response.jobId;
      status = `Plan queued (${response.jobId})`;
    } catch (err) {
      status = '';
      error = (err as Error).message;
    }
  }

  async function refreshStatus() {
    if (!jobId) return;
    error = '';
    try {
      const response = await getOptimizationStatus(jobId);
      status = `Status: ${response.status} (attempts: ${response.attempts})`;
      result = JSON.stringify(response, null, 2);
    } catch (err) {
      error = (err as Error).message;
    }
  }
</script>

<div class="card">
  <h2 style="margin:0 0 8px;">Plan Optimization (v2)</h2>
  <p class="muted" style="margin-top:0;">Run `POST /plan/optimize` with VROOM-native payload.</p>

  <label>Payload (vehicles + jobs)</label>
  <textarea rows="16" bind:value={payload}></textarea>

  <div style="display:flex;gap:12px;margin-top:16px;flex-wrap:wrap;">
    <button class="button" on:click={submitPlan}>Run Plan</button>
    <button class="button secondary" on:click={refreshStatus} disabled={!jobId}>Refresh Status</button>
  </div>

  {#if jobId}
    <p class="muted" style="margin-top:16px;">Job ID: <span class="code" style="padding:2px 8px;">{jobId}</span></p>
  {/if}

  {#if status}
    <p class="muted">{status}</p>
  {/if}
  {#if error}
    <p style="color:var(--danger);">{error}</p>
  {/if}
  {#if result}
    <pre class="code" style="margin-top:16px;">{result}</pre>
  {/if}
</div>
