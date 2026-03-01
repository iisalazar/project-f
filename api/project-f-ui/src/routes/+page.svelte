<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    goto('/plan');
  });
</script>

<div class="card">
  <div style="font-size:18px;font-weight:600;">Redirecting…</div>
  <div class="muted">Taking you to planning.</div>
</div>
