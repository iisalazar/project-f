<script lang="ts">
  import { goto } from '$app/navigation';
  import { createOrganization, getMe } from '$lib/services/auth-api';

  let name = '';
  let timezone = 'UTC';
  let status = '';
  let error = '';

  async function submit() {
    status = 'Creating organization...';
    error = '';
    try {
      await createOrganization({ name, timezone });
      status = 'Organization created. Redirecting...';
      await goto('/drivers');
    } catch (err) {
      status = '';
      error = (err as Error).message;
    }
  }

  getMe()
    .then((me) => {
      if (me.auth && !me.auth.needsOnboarding) {
        goto('/plan');
      }
    })
    .catch(() => {
      goto('/login');
    });
</script>

<div class="card" style="max-width:640px;margin:0 auto;">
  <h2 style="margin:0 0 8px;">Organization Onboarding</h2>
  <p class="muted" style="margin-top:0;">Create your first organization to enable drivers, planning, and dispatch.</p>

  <div class="row">
    <div>
      <label>Organization Name</label>
      <input class="input" bind:value={name} placeholder="Acme Logistics" />
    </div>
    <div>
      <label>Timezone</label>
      <input class="input" bind:value={timezone} placeholder="UTC" />
    </div>
    <div>
      <button class="button" on:click={submit} disabled={!name.trim()}>Create Organization</button>
    </div>
  </div>

  {#if status}
    <p class="muted" style="margin-top:16px;">{status}</p>
  {/if}
  {#if error}
    <p style="margin-top:16px;color:var(--danger);">{error}</p>
  {/if}
</div>
