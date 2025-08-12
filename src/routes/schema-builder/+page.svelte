<script lang="ts">
  import PinManager from '$lib/PinManager.svelte';
  import SchemaBuilder from '$lib/SchemaBuilder.svelte';
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
</script>

<svelte:head>
  <title>Schema Builder</title>
</svelte:head>

<h1>Project Schema Builder</h1>

<SchemaBuilder template={template} onUpdate={updateTemplate} />
<hr>
<!-- <ProjectForm template={template} onSave={saveObject} selectedCoordinates={selectedCoordinates}/>
<hr>
<ObjectList objects={objects} template={template} onDelete={deleteObject} /> -->
<PinManager 
  template={template} 
  objects={objects}
  onSave={saveObject}
  showForm={true}
/>