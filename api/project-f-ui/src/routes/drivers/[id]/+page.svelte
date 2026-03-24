<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { getDriver, type DriverRecord } from '$lib/services/drivers-api';

  let { params } = $props();
  const driverId = params.id;
  let driver: DriverRecord | null = null;
  let error = '';

  onMount(async () => {
    try {
      driver = await getDriver(driverId);
    } catch (err) {
      error = (err as Error).message;
    }
  });
</script>

<div class="card">
  <div style="margin-bottom:12px;font-size:14px;color:var(--muted);">
    <a href="/drivers" style="color:var(--muted);text-decoration:none;">← Drivers</a>
    {#if driver} / {driver.name}{/if}
  </div>

  {#if error}
    <p style="color:var(--danger);">{error}</p>
  {:else if !driver}
    <p class="muted">Loading...</p>
  {:else}
    <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px;">
      <h2 style="margin:0;">{driver.name}</h2>
      <button class="button secondary" onclick={() => goto(`/drivers/${driver?.id}/edit`)}>Edit driver</button>
    </div>

    <div class="row two">
      <div class="card">
        <h3 style="margin:0 0 12px;font-size:15px;">Profile</h3>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div><label style="font-size:12px;">Name</label><div>{driver.name}</div></div>
          <div><label style="font-size:12px;">Email</label><div>{driver.email ?? '—'}</div></div>
          <div><label style="font-size:12px;">Phone</label><div>{driver.phone ?? '—'}</div></div>
          <div>
            <label style="font-size:12px;">State</label>
            <div><span class={`status ${driver.state}`}>● {driver.state}</span></div>
          </div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:12px;">
        <div class="card">
          <h3 style="margin:0 0 8px;font-size:15px;">Start Location</h3>
          {#if driver.startLocation}
            <div style="font-family:var(--mono,monospace);font-size:13px;color:var(--muted);">
              {driver.startLocation[0]}, {driver.startLocation[1]}
            </div>
          {:else}
            <div class="muted">—</div>
          {/if}
        </div>
        <div class="card">
          <h3 style="margin:0 0 8px;font-size:15px;">End Location</h3>
          {#if driver.endLocation}
            <div style="font-family:var(--mono,monospace);font-size:13px;color:var(--muted);">
              {driver.endLocation[0]}, {driver.endLocation[1]}
            </div>
          {:else}
            <div class="muted">—</div>
          {/if}
        </div>
      </div>
    </div>

    <div style="margin-top:16px;">
      <button class="button secondary" onclick={() => goto('/drivers')}>← Back to Drivers</button>
    </div>
  {/if}
</div>
