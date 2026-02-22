<script lang="ts">
  import { apiFetch } from '$lib/api';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let error = '';
  let status = '';

  const sample = {
    drivers: [
      {
        id: 'driver-1',
        name: 'Juan Dela Cruz',
        startLocation: [121.0437, 14.676],
        endLocation: [121.0437, 14.676],
        maxTasks: 4,
      },
    ],
    stops: [
      { id: 'stop-1', location: [121.0509, 14.5547], serviceSeconds: 300 },
      { id: 'stop-2', location: [121.0600, 14.5600], serviceSeconds: 180 },
    ],
  };

  let payload = JSON.stringify(sample, null, 2);

  onMount(async () => {
    try {
      await apiFetch('/auth/me');
    } catch {
      goto('/login');
    }
  });

  async function submit() {
    error = '';
    status = 'Submitting job…';
    try {
      const parsed = JSON.parse(payload);
      const response = await apiFetch<{ jobId: string }>('/optimization/jobs', {
        method: 'POST',
        body: JSON.stringify(parsed),
      });
      status = 'Job created. Redirecting…';
      await goto(`/jobs/${response.jobId}`);
    } catch (err) {
      error = (err as Error).message;
      status = '';
    }
  }
</script>

<div class="card">
  <h2 style="margin:0 0 8px;">Create Optimization Job</h2>
  <p class="muted" style="margin-top:0;">Paste your JSON payload below.</p>

  <label>Request Payload</label>
  <textarea rows="18" bind:value={payload}></textarea>

  <div style="display:flex;gap:12px;margin-top:16px;">
    <button class="button" on:click={submit}>Submit Job</button>
    <button class="button secondary" on:click={() => (payload = JSON.stringify(sample, null, 2))}>
      Reset Sample
    </button>
  </div>

  {#if status}
    <p class="muted" style="margin-top:16px;">{status}</p>
  {/if}
  {#if error}
    <p style="margin-top:16px;color:var(--danger);">{error}</p>
  {/if}
</div>
