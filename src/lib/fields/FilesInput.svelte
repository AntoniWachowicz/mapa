<script lang="ts">
  import type { FileData, FilesConfig } from '../types.js';

  interface Props {
    value: FileData[];
    config: FilesConfig;
    required?: boolean;
    oninput: (value: FileData[]) => void;
  }

  const { value = [], config, required = false, oninput }: Props = $props();

  function getAcceptString(): string {
    return config.allowedTypes.map(type => `.${type}`).join(',');
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  async function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const files = input.files;
    if (!files) return;

    const newFiles: FileData[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file type
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension && !config.allowedTypes.includes(extension)) {
        alert(`Nieprawidłowy typ pliku: ${file.name}. Dozwolone: ${config.allowedTypes.join(', ')}`);
        continue;
      }

      // Validate file size
      if (file.size > config.maxFileSize) {
        alert(`Plik ${file.name} jest zbyt duży. Maksymalny rozmiar: ${formatFileSize(config.maxFileSize)}`);
        continue;
      }

      // Check max files
      if (value.length + newFiles.length >= config.maxFiles) {
        alert(`Maksymalna liczba plików: ${config.maxFiles}`);
        break;
      }

      // Create temporary file data (will be uploaded on form submit)
      const fileData: FileData = {
        id: `temp_${Date.now()}_${i}`,
        filename: file.name,
        originalName: file.name,
        path: '', // Will be set after upload
        mimeType: file.type,
        size: file.size,
        uploadedAt: new Date()
      };

      newFiles.push(fileData);
    }

    if (newFiles.length > 0) {
      oninput([...value, ...newFiles]);
    }

    // Reset input
    input.value = '';
  }

  function removeFile(fileId: string) {
    oninput(value.filter(f => f.id !== fileId));
  }
</script>

<div class="files-container">
  <div class="file-input-wrapper">
    <input
      type="file"
      multiple
      accept={getAcceptString()}
      onchange={handleFileSelect}
      class="file-input"
      id="file-upload"
    />
    <label for="file-upload" class="file-label">
      📎 Wybierz pliki ({config.allowedTypes.join(', ')})
    </label>
    <div class="file-info">
      Max {config.maxFiles} plików, {formatFileSize(config.maxFileSize)} każdy
    </div>
  </div>

  {#if value.length > 0}
    <div class="files-list">
      {#each value as file}
        <div class="file-item">
          <div class="file-info-row">
            <span class="file-name">{file.originalName}</span>
            <span class="file-size">{formatFileSize(file.size)}</span>
          </div>
          <button
            type="button"
            onclick={() => removeFile(file.id)}
            class="remove-btn"
          >
            ✕
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .files-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .file-input-wrapper {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .file-input {
    display: none;
  }

  .file-label {
    display: inline-block;
    padding: 8px 16px;
    background: #007acc;
    color: white;
    border-radius: 4px;
    cursor: pointer;
    text-align: center;
    transition: background 0.2s;
  }

  .file-label:hover {
    background: #005a9e;
  }

  .file-info {
    font-size: 12px;
    color: #666;
  }

  .files-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .file-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px;
    background: #f5f5f5;
    border-radius: 4px;
    gap: 8px;
  }

  .file-info-row {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
  }

  .file-name {
    font-weight: 500;
    color: #333;
  }

  .file-size {
    font-size: 12px;
    color: #666;
  }

  .remove-btn {
    background: #dc2626;
    color: white;
    border: none;
    padding: 6px 10px;
    border-radius: 4px;
    cursor: pointer;
    flex-shrink: 0;
  }

  .remove-btn:hover {
    background: #b91c1c;
  }
</style>
