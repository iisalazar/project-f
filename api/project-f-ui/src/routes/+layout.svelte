<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<div class="page">
	<header style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:32px;">
		<div>
			<div style="font-size:20px;font-weight:700;">Project F — Ops Platform</div>
			<div class="muted" style="font-size:13px;">Plan, dispatch, and execute routes</div>
		</div>
		<nav style="display:flex;gap:12px;flex-wrap:wrap;justify-content:flex-end;">
			<a class="badge" href="/drivers">Drivers</a>
			<a class="badge" href="/plan">Plan</a>
			<a class="badge" href="/dispatch">Dispatch</a>
			<a class="badge" href="/driver/today">Driver</a>
			<a class="badge" href="/jobs">Jobs</a>
			<a class="badge" href="/jobs/new">New Job</a>
			<a class="badge" href="/login">Login</a>
		</nav>
	</header>
	{@render children()}
</div>
