<script lang="ts">
	export let title: string;
	export let value: number;
	export let icon: string = "";
	export let color: string = "var(--color-theme-1)";
</script>

<div class="widget" style="border-left:5px solid {color}">
	<span class="widget-icon" style="color: {color}">{icon}</span>
	<div class="widget-info">
		<div class="widget-title">{title}</div>
		<div class="widget-value">{value}</div>
	</div>
</div>

<style>
.widget {
	background: var(--color-bg-1);
	display: flex;
	align-items: center;
	padding: 1.2rem 2rem;
	border-radius: 9px;
	box-shadow: 0 3px 12px rgba(39,110,241,0.07);
	min-width: 11rem;
	max-width: 100%;
	width: 100%;
}
.widget-icon {
	font-size: 2.2em;
	margin-right: 1.4rem;
	line-height: 1;
	display: flex;
	align-items: center;
	gap: 0.2em;
}
.widget-title {
	font-size: 1.04em;
	color: #446278;
	font-weight: 600;
	letter-spacing: .02em;
}
.widget-value {
	font-size: 2.0em;
	color: var(--color-theme-1);
	margin-top: 0.15em;
	font-weight: 700;
}
</style>
