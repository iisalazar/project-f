<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { deleteDriver, listDrivers, type DriverRecord } from '$lib/services/drivers-api';
  import { getMe } from '$lib/services/auth-api';

  let drivers: DriverRecord[] = [];
  let search = '';
  let state = '';
  let status = '';
  let error = '';

  async function load() {
    status = 'Loading drivers...';
    error = '';
    try {
      const response = await listDrivers({ search: search || undefined, state: state || undefined });
      drivers = response.items;
      status = '';
    } catch (err) {
      status = '';
      error = (err as Error).message;
    }
  }

  async function removeDriver(id: string) {
    if (!confirm('Delete this driver?')) {
      return;
    }

    try {
      await deleteDriver(id);
      await load();
    } catch (err) {
      error = (err as Error).message;
    }
  }

  onMount(async () => {
    try {
      const me = await getMe();
      if (me.auth?.needsOnboarding) {
        goto('/onboarding/organization');
        return;
      }
      await load();
    } catch {
      goto('/login');
    }
  });
</script>

<div class="card">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
    <div>
      <h2 style="margin:0;">Drivers</h2>
      <p class="muted" style="margin:4px 0 0;">Manage organization drivers for planning and dispatch.</p>
    </div>
    <button class="button" on:click={() => goto('/drivers/new')}>Add Driver</button>
  </div>

  <div class="row two" style="margin-top:16px;">
    <div>
      <label>Search</label>
      <input class="input" bind:value={search} placeholder="Name, email, phone" />
    </div>
    <div>
      <label>State</label>
      <select bind:value={state}>
        <option value="">All</option>
        <option value="idle">Idle</option>
        <option value="enroute">Enroute</option>
        <option value="arrived">Arrived</option>
        <option value="completed">Completed</option>
        <option value="failed">Failed</option>
      </select>
    </div>
    <div style="align-self:end;">
      <button class="button secondary" on:click={load}>Apply</button>
    </div>
  </div>

  {#if status}
    <p class="muted" style="margin-top:16px;">{status}</p>
  {/if}
  {#if error}
    <p style="color:var(--danger);margin-top:16px;">{error}</p>
  {/if}

  <table class="table" style="margin-top:16px;">
    <thead>
      <tr>
        <th>Name</th>
        <th>Email</th>
        <th>State</th>
        <th>Shift</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each drivers as driver}
        <tr>
          <td>{driver.name}</td>
          <td>{driver.email ?? '—'}</td>
          <td>{driver.state}</td>
          <td>{driver.shiftStartSeconds ?? '—'} - {driver.shiftEndSeconds ?? '—'}</td>
          <td style="display:flex;gap:8px;">
            <button class="button secondary" on:click={() => goto(`/drivers/${driver.id}`)}>View</button>
            <button class="button secondary" on:click={() => goto(`/drivers/${driver.id}/edit`)}>Edit</button>
            <button class="button secondary" on:click={() => removeDriver(driver.id)}>Delete</button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
