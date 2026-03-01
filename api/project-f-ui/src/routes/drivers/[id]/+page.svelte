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
  <h2 style="margin:0 0 8px;">Driver Detail</h2>
  {#if error}
    <p style="color:var(--danger);">{error}</p>
  {:else if !driver}
    <p class="muted">Loading...</p>
  {:else}
    <div class="row two">
      <div><label>Name</label><div>{driver.name}</div></div>
      <div><label>Email</label><div>{driver.email ?? '—'}</div></div>
      <div><label>Phone</label><div>{driver.phone ?? '—'}</div></div>
      <div><label>State</label><div>{driver.state}</div></div>
      <div><label>Start Location</label><div>{driver.startLocation ? JSON.stringify(driver.startLocation) : '—'}</div></div>
      <div><label>End Location</label><div>{driver.endLocation ? JSON.stringify(driver.endLocation) : '—'}</div></div>
    </div>
    <div style="display:flex;gap:12px;margin-top:16px;">
      <button class="button secondary" on:click={() => goto(`/drivers/${driver?.id}/edit`)}>Edit</button>
      <button class="button secondary" on:click={() => goto('/drivers')}>Back</button>
    </div>
  {/if}
</div>
