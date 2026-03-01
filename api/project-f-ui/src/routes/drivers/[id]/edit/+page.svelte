<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { getDriver, updateDriver } from '$lib/services/drivers-api';
  import MapPointPicker from '$lib/components/MapPointPicker.svelte';

  let { params } = $props();
  const driverId = params.id;
  let name = '';
  let email = '';
  let phone = '';
  let state: 'idle' | 'enroute' | 'arrived' | 'completed' | 'failed' = 'idle';
  let startLocation: [number, number] | null = null;
  let endLocation: [number, number] | null = null;
  let status = '';
  let error = '';

  onMount(async () => {
    try {
      const driver = await getDriver(driverId);
      name = driver.name;
      email = driver.email ?? '';
      phone = driver.phone ?? '';
      state = driver.state;
      startLocation = (driver.startLocation as [number, number] | null) ?? null;
      endLocation = (driver.endLocation as [number, number] | null) ?? null;
    } catch (err) {
      error = (err as Error).message;
    }
  });

  async function submit() {
    status = 'Updating driver...';
    error = '';
    try {
      const payload: Record<string, unknown> = { name, email: email || undefined, phone: phone || undefined, state };
      if (startLocation) payload.startLocation = startLocation;
      if (endLocation) payload.endLocation = endLocation;
      await updateDriver(driverId, payload);
      status = 'Driver updated. Redirecting...';
      await goto(`/drivers/${driverId}`);
    } catch (err) {
      status = '';
      error = (err as Error).message;
    }
  }
</script>

<div class="card" style="max-width:760px;">
  <h2 style="margin:0 0 8px;">Edit Driver</h2>
  <div class="row two">
    <div><label>Name</label><input class="input" bind:value={name} /></div>
    <div><label>Email</label><input class="input" bind:value={email} /></div>
    <div><label>Phone</label><input class="input" bind:value={phone} /></div>
    <div>
      <label>State</label>
      <select bind:value={state}>
        <option value="idle">Idle</option>
        <option value="enroute">Enroute</option>
        <option value="arrived">Arrived</option>
        <option value="completed">Completed</option>
        <option value="failed">Failed</option>
      </select>
    </div>
  </div>
  <div class="row two" style="margin-top:16px;">
    <MapPointPicker bind:value={startLocation} label="Start Location" height={240} />
    <MapPointPicker bind:value={endLocation} label="End Location" height={240} />
  </div>
  <div style="display:flex;gap:12px;margin-top:16px;">
    <button class="button" on:click={submit} disabled={!name.trim()}>Save</button>
    <button class="button secondary" on:click={() => goto(`/drivers/${driverId}`)}>Cancel</button>
  </div>
  {#if status}<p class="muted" style="margin-top:16px;">{status}</p>{/if}
  {#if error}<p style="margin-top:16px;color:var(--danger);">{error}</p>{/if}
</div>
