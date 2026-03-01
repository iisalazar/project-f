<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    goto('/driver/workboard');
  });
</script>

<div class="card">
  <div style="font-size:18px;font-weight:600;">Redirecting to driver workboard…</div>
  <div class="muted">Taking you to the new day-based trip view.</div>
</div>
