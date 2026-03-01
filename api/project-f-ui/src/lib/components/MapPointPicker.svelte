<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import mapboxgl from 'mapbox-gl';

  export let value: [number, number] | null = null;
  export let label = 'Location';
  export let height = 260;

  let mapContainer: HTMLDivElement | null = null;
  let map: mapboxgl.Map | null = null;
  let marker: mapboxgl.Marker | null = null;

  onMount(() => {
    if (!mapContainer) {
      return;
    }

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN ?? '';
    const initialCenter = value ?? ([121.0437, 14.676] as [number, number]);

    map = new mapboxgl.Map({
      container: mapContainer,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: initialCenter,
      zoom: value ? 13 : 11,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.on('click', (event) => {
      value = [event.lngLat.lng, event.lngLat.lat];
      syncMarker();
    });

    map.on('load', () => {
      syncMarker();
    });
  });

  onDestroy(() => {
    if (map) {
      map.remove();
      map = null;
      marker = null;
    }
  });

  $: if (map) {
    syncMarker();
  }

  function syncMarker() {
    if (!map || !value) {
      if (marker) {
        marker.remove();
        marker = null;
      }
      return;
    }

    if (!marker) {
      marker = new mapboxgl.Marker({ color: '#5ad2ff' }).setLngLat(value).addTo(map);
    } else {
      marker.setLngLat(value);
    }
    map.setCenter(value);
  }

  function clear() {
    value = null;
  }
</script>

<svelte:head>
  <link
    href="https://api.mapbox.com/mapbox-gl-js/v3.7.0/mapbox-gl.css"
    rel="stylesheet"
  />
</svelte:head>

<div>
  <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
    <label style="margin:0;">{label}</label>
    <button class="button secondary" on:click={clear} disabled={!value}>Clear</button>
  </div>
  <div
    bind:this={mapContainer}
    style={`margin-top:8px;height:${height}px;border-radius:12px;border:1px solid var(--border);overflow:hidden;`}
  ></div>
  <p class="muted" style="margin:8px 0 0;">
    {#if value}
      {value[0].toFixed(6)}, {value[1].toFixed(6)}
    {:else}
      Click on map to select point
    {/if}
  </p>
</div>
