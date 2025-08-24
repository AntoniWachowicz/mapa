<script lang="ts">
  import PinManager from '$lib/PinManager.svelte';
  import SchemaBuilder from '$lib/SchemaBuilder.svelte';
  import PinList from '$lib/PinList.svelte';
  // import ProjectForm from '$lib/ProjectForm.svelte';
  // import ObjectList from '$lib/ObjectList.svelte';
  import type { Template, ProjectData, SavedObject } from '$lib/types.js';
  

  $effect(() => {
  console.log('Page data loaded:', data);
  console.log('Template:', data.template);
  console.log('Objects:', data.objects);
  });


  interface PageData {
    template: Template;
    objects: SavedObject[];
  }
  
  interface Props {
    data: PageData;
  }
  
  const { data }: Props = $props();
  
  let template = $state<Template>(data.template);
  let objects = $state<SavedObject[]>(data.objects);
  let selectedCoordinates = $state<{lat: number, lng: number} | null>(null);
  
  async function updateTemplate(newTemplate: Template): Promise<void> {
    template = newTemplate;
    const formData = new FormData();
    formData.set('template', JSON.stringify(template));
    
    await fetch('?/updateTemplate', {
      method: 'POST',
      body: formData
    });
  }
  
  async function saveObject(objectData: ProjectData): Promise<void> {
    const formData = new FormData();
    formData.set('data', JSON.stringify(objectData));
    
    await fetch('?/createObject', {
      method: 'POST',
      body: formData
    });
    
    // Refresh page to show new object
    location.reload();
  }
  
  async function deleteObject(id: string): Promise<void> {
    const formData = new FormData();
    formData.set('id', id);
    
    await fetch('?/deleteObject', {
      method: 'POST',
      body: formData
    });
    
    objects = objects.filter((obj: SavedObject) => obj.id !== id);
  }

  // Handle edit from PinList (redirect to form)
  function handleEditFromList(obj: SavedObject): void {
    // Could implement editing here or redirect to map view
    // For now, just reload to show in the manager
    location.reload();
  }
</script>

<svelte:head>
  <title>Kreator Schematu - Mapa Builder</title>
</svelte:head>

<div class="schema-container">
  <h1>Ustawienia Schematu Pinezek</h1>
  
  <div class="schema-layout">
    <div class="builder-panel">
      <SchemaBuilder template={template} onUpdate={updateTemplate} />
    </div>
    
    <div class="data-panel">
      <div class="data-panel-content">
        <div class="manager-section">
          <PinManager 
            template={template} 
            objects={objects}
            onSave={saveObject}
            showForm={true}
          />
        </div>
        
        <div class="list-section">
          <PinList 
            {template}
            {objects}
            onEdit={handleEditFromList}
            onDelete={deleteObject}
            showActions={true}
            compact={true}
          />
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .schema-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 32px;
    background: #ffffff;
    min-height: calc(100vh - 120px);
  }
  
  .schema-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    margin-top: 32px;
  }
  
  .builder-panel {
    background: #ffffff;
    padding: 32px;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    border: 1px solid #e5e7eb;
    height: fit-content;
  }
  
  .data-panel {
    background: #f9fafb;
    padding: 32px;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    border: 1px solid #e5e7eb;
    display: flex;
    flex-direction: column;
    height: fit-content;
  }

  .data-panel-content {
    display: flex;
    flex-direction: column;
    gap: 32px;
    height: 100%;
  }

  .manager-section {
    flex-shrink: 0;
  }

  .list-section {
    flex: 1;
    min-height: 300px;
  }
  
  @media (max-width: 1200px) {
    .schema-layout {
      grid-template-columns: 1fr;
    }
  }
</style>