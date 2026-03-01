<script lang="ts">
  import './layout.css';
  import { onMount } from 'svelte';
  import favicon from '$lib/assets/favicon.svg';
  import { getMe, setActiveOrganization } from '$lib/services/auth-api';

  let { children } = $props();

  let activeRole = $state<'org_admin' | 'dispatcher' | 'driver' | 'viewer' | null>(null);
  let activeOrganizationId = $state('');
  let memberships = $state<Array<{
    organizationId: string;
    organizationName: string;
    role: string;
  }>>([]);

  onMount(async () => {
    try {
      const me = await getMe();
      activeRole = me.auth?.activeRole ?? null;
      activeOrganizationId = me.auth?.activeOrganizationId ?? '';
      memberships =
        me.auth?.memberships.map((membership) => ({
          organizationId: membership.organizationId,
          organizationName: membership.organizationName,
          role: membership.role,
        })) ?? [];
    } catch {
      activeRole = null;
      memberships = [];
    }
  });

  async function switchOrganization(organizationId: string) {
    if (!organizationId || organizationId === activeOrganizationId) {
      return;
    }

    try {
      await setActiveOrganization(organizationId);
      activeOrganizationId = organizationId;
      location.reload();
    } catch {
      // keep current org context when switch fails
    }
  }
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<div class="page">
  <header style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:32px;">
    <div>
      <div style="font-size:20px;font-weight:700;">Project F — Ops Platform</div>
      <div class="muted" style="font-size:13px;">Plan, dispatch, and execute routes</div>
      {#if memberships.length > 0}
        <div style="margin-top:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span class="badge">Role: {activeRole ?? 'unknown'}</span>
          {#if memberships.length > 1}
            <select value={activeOrganizationId} onchange={(e) => switchOrganization((e.currentTarget as HTMLSelectElement).value)} style="min-width:220px;">
              {#each memberships as membership}
                <option value={membership.organizationId}>
                  {membership.organizationName} ({membership.role})
                </option>
              {/each}
            </select>
          {/if}
        </div>
      {/if}
    </div>
    <nav style="display:flex;gap:12px;flex-wrap:wrap;justify-content:flex-end;">
      {#if activeRole === 'org_admin' || activeRole === 'dispatcher'}
        <a class="badge" href="/drivers">Drivers</a>
        <a class="badge" href="/plan">Planning</a>
        <a class="badge" href="/route-plans">Route Plans</a>
        <a class="badge" href="/dispatch">Dispatch</a>
        <a class="badge" href="/jobs">Jobs</a>
      {:else if activeRole === 'viewer'}
        <a class="badge" href="/route-plans">Route Plans</a>
        <a class="badge" href="/jobs">Jobs</a>
      {:else if activeRole === 'driver'}
        <a class="badge" href="/driver/workboard">Workboard</a>
      {:else}
        <a class="badge" href="/login">Login</a>
      {/if}
      <a class="badge" href="/login">Login</a>
    </nav>
  </header>
  {@render children()}
</div>
