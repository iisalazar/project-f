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
  let page = 1;
  const pageSize = 20;
  let hasMore = false;

  async function load() {
    status = 'Loading drivers...';
    error = '';
    try {
      const response = await listDrivers({
        search: search || undefined,
        state: state || undefined,
        page,
        pageSize,
      });
      drivers = response.items;
      hasMore = response.items.length === pageSize;
      status = '';
    } catch (err) {
      status = '';
      error = (err as Error).message;
    }
  }

  async function removeDriver(id: string) {
    if (!confirm('Delete this driver?')) return;
    try {
      await deleteDriver(id);
      await load();
    } catch (err) {
      error = (err as Error).message;
    }
  }

  function prevPage() {
    if (page > 1) { page--; load(); }
  }

  function nextPage() {
    if (hasMore) { page++; load(); }
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
    <button class="button" onclick={() => goto('/drivers/new')}>Add Driver</button>
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
      <button class="button secondary" onclick={() => { page = 1; load(); }}>Apply</button>
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
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each drivers as driver}
        <tr style="cursor:pointer;" onclick={() => goto(`/drivers/${driver.id}`)}>
          <td>{driver.name}</td>
          <td>{driver.email ?? '—'}</td>
          <td><span class={`status ${driver.state}`}>● {driver.state}</span></td>
          <td onclick={(e) => e.stopPropagation()} style="display:flex;gap:8px;">
            <button class="button secondary" onclick={() => goto(`/drivers/${driver.id}/edit`)}>Edit</button>
          </td>
        </tr>
      {/each}
      {#if drivers.length === 0 && !status}
        <tr><td colspan="4" style="color:var(--muted);text-align:center;padding:24px;">No drivers found.</td></tr>
      {/if}
    </tbody>
  </table>

  <div style="display:flex;align-items:center;gap:12px;margin-top:16px;">
    <button class="button secondary" onclick={prevPage} disabled={page === 1}>← Prev</button>
    <span class="muted">Page {page}</span>
    <button class="button secondary" onclick={nextPage} disabled={!hasMore}>Next →</button>
  </div>
</div>
