<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/api';
  import type { OptimizationJobListResponse } from '$lib/types';

  let jobs: OptimizationJobListResponse | null = null;
  let error = '';
  let status = '';
  let createdAtFrom = '';
  let createdAtTo = '';

  async function loadJobs() {
    error = '';
    status = 'Loading jobs…';
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (createdAtFrom) params.set('createdAtFrom', createdAtFrom);
    if (createdAtTo) params.set('createdAtTo', createdAtTo);

    try {
      await apiFetch('/auth/me');
      jobs = await apiFetch(`/optimization/jobs?${params.toString()}`);
      status = '';
    } catch (err) {
      const apiError = err as Error & { status?: number };
      if (apiError.status === 403) {
        goto('/login');
        return;
      }
      error = apiError.message;
      status = '';
    }
  }

  let statusFilter = '';

  onMount(() => {
    loadJobs();
  });
</script>

<div class="card">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
    <div>
      <h2 style="margin:0;">Optimization Jobs</h2>
      <p class="muted" style="margin:4px 0 0;">Track pending, processing, and completed jobs.</p>
    </div>
    <button class="button" on:click={() => goto('/jobs/new')}>New Job</button>
  </div>

  <div class="row two" style="margin-top:24px;">
    <div>
      <label>Status</label>
      <select bind:value={statusFilter}>
        <option value="">All</option>
        <option value="enqueued">Enqueued</option>
        <option value="processing">Processing</option>
        <option value="completed">Completed</option>
        <option value="failed">Failed</option>
      </select>
    </div>
    <div>
      <label>Created From</label>
      <input class="input" type="date" bind:value={createdAtFrom} />
    </div>
    <div>
      <label>Created To</label>
      <input class="input" type="date" bind:value={createdAtTo} />
    </div>
    <div style="align-self:flex-end;">
      <button class="button secondary" on:click={loadJobs}>Apply Filters</button>
    </div>
  </div>

  {#if status}
    <p class="muted" style="margin-top:16px;">{status}</p>
  {/if}
  {#if error}
    <p style="margin-top:16px;color:var(--danger);">{error}</p>
  {/if}

  {#if jobs}
    <table class="table" style="margin-top:16px;">
      <thead>
        <tr>
          <th>Job ID</th>
          <th>Status</th>
          <th>Created</th>
          <th>Updated</th>
        </tr>
      </thead>
      <tbody>
        {#each jobs.items as job}
          <tr style="cursor:pointer;" on:click={() => goto(`/jobs/${job.id}`)}>
            <td>{job.id}</td>
            <td>
              <span class={`status ${job.status}`}>{job.status}</span>
            </td>
            <td>{new Date(job.createdAt).toLocaleString()}</td>
            <td>{new Date(job.updatedAt).toLocaleString()}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>
