<script lang="ts">
  interface Props {
    name: string;
    size?: number;
    class?: string;
  }

  const { name, size = 16, class: className = '' }: Props = $props();
</script>

<img
  src="/icons/{name}.svg"
  alt={name}
  width={size}
  height={size}
  class="icon {className}"
  style="display: inline-block; vertical-align: middle;"
/>

<style>
  .icon {
    filter: currentColor;
  }
</style>