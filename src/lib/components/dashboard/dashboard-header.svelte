<!-- src/routes/dashboard/components/dashboard-header.svelte -->
<script lang="ts">
    import { activeTab } from './store';
    import type { TabType } from './store';
    
    // Props
    export let user: {
        full_name?: string;
        avatar_url?: string;
        email?: string;
        user_id: string;
    };

    // Derived values - follow the Props → Derived → Methods pattern
    $: fullName = user.full_name ?? '';
    $: initial = fullName.charAt(0) || '';
    
    // Methods
    function setActiveTab(tab: TabType): void {
        activeTab.setTab(tab);
    }
</script>

<header class="dashboard-header">
    <div class="user-info">
        {#if user.avatar_url}
            <img class="avatar" src={user.avatar_url} alt="Avatar" />
        {:else}
            <div class="avatar-placeholder">{initial}</div>
        {/if}
        <div class="user-details">
            <h2>{fullName}</h2>
            <p>{user.email}</p>
        </div>
    </div>
    
    <a href="/logout" class="logout-btn">Log Out</a>
</header>

<div class="dashboard-tabs">
    <button 
        class="tab-button {$activeTab === 'projects' ? 'active' : ''}" 
        on:click={() => setActiveTab('projects')}
    >
        Projects
    </button>
    <button 
        class="tab-button {$activeTab === 'parts' ? 'active' : ''}" 
        on:click={() => setActiveTab('parts')}
    >
        Parts
    </button>
    <button 
        class="tab-button {$activeTab === 'manufacturers' ? 'active' : ''}" 
        on:click={() => setActiveTab('manufacturers')}
    >
        Manufacturers
    </button>
    <button 
        class="tab-button {$activeTab === 'suppliers' ? 'active' : ''}" 
        on:click={() => setActiveTab('suppliers')}
    >
        Suppliers
    </button>
    <button 
        class="tab-button {$activeTab === 'categories' ? 'active' : ''}" 
        on:click={() => setActiveTab('categories')}
    >
        Categories
    </button>
</div>

<style>
    .dashboard-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 2rem;
        background-color: hsl(var(--background));
        border-bottom: 1px solid hsl(var(--border));
    }
    
    .user-info {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    
    .avatar, .avatar-placeholder {
        width: 3rem;
        height: 3rem;
        border-radius: 50%;
        overflow: hidden;
    }
    
    .avatar {
        object-fit: cover;
    }
    
    .avatar-placeholder {
        background-color: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 1.5rem;
        font-weight: bold;
    }
    
    .user-details h2 {
        margin: 0;
        font-size: 1.2rem;
        color: hsl(var(--foreground));
    }
    
    .user-details p {
        margin: 0;
        font-size: 0.9rem;
        color: hsl(var(--muted-foreground));
    }
    
    .logout-btn {
        background-color: transparent;
        color: hsl(var(--muted-foreground));
        padding: 0.5rem 1rem;
        border-radius: 4px;
        text-decoration: none;
        transition: all 0.2s;
        font-size: 0.9rem;
    }
    
    .logout-btn:hover {
        background-color: hsl(var(--muted) / 0.5);
        color: hsl(var(--foreground));
    }
    
    .dashboard-tabs {
        display: flex;
        background-color: hsl(var(--background));
        border-bottom: 1px solid hsl(var(--border));
        padding: 0 1rem;
    }
    
    .tab-button {
        padding: 1rem 1.5rem;
        background: none;
        border: none;
        color: hsl(var(--muted-foreground));
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        position: relative;
    }
    
    .tab-button:hover {
        color: hsl(var(--foreground));
    }
    
    .tab-button.active {
        color: hsl(var(--foreground));
        font-weight: 600;
    }
    
    .tab-button.active::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 2px;
        background-color: hsl(var(--primary));
    }
    
    @media (max-width: 768px) {
        .dashboard-tabs {
            flex-wrap: wrap;
        }
        
        .tab-button {
            flex: 1 0 33.333%;
            padding: 0.75rem 0.5rem;
        }
    }
    
    @media (max-width: 600px) {
        .dashboard-header {
            flex-direction: column;
            gap: 1rem;
        }
        
        .tab-button {
            flex: 1 0 50%;
            font-size: 0.9rem;
        }
    }
</style>
