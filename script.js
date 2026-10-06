const MATERIALS = [
  { id: 'forex', name: 'Forex', color: '#8B95A1', visual: 'forex' },
  { id: 'plexi', name: 'Plexi', color: '#38BDF8', visual: 'plexi' },
  { id: 'dibond', name: 'Dibond', color: '#64748B', visual: 'dibond' },
  { id: 'stadur', name: 'Stadur', color: '#6366F1', visual: 'stadur' },
  { id: 'reboard', name: 'Reboard', color: '#A16207', visual: 'reboard' },
  { id: 'bois', name: 'Bois', color: '#B7791F', visual: 'bois' },
  { id: 'pet', name: 'PET', color: '#06B6D4', visual: 'pet' },
  { id: 'ps-choc', name: 'PS Choc', color: '#64748B', visual: 'ps' },
  { id: 'display', name: 'Display', color: '#92400E', visual: 'display' },
  { id: 'microcannelure', name: 'Microcannelure', color: '#D97706', visual: 'micro' },
  { id: 'emballage-carton', name: 'Emballage', color: '#A16207', visual: 'carton' },
  { id: 'divers', name: 'Divers', color: '#64748B', visual: 'divers' }
];

const THICKNESS_OPTIONS = [0.5, 0.75, 1, 1.5, 2, 3, 5, 8, 10, 16, 19]; // Inclut l'épaisseur 16 mm
const STORAGE_KEY = 'mon-atelier-v1';

const defaultData = {
  version: 4,
  materials: MATERIALS.map(m => ({ ...m, references: [] }))
};

let editTarget = null;

// 3. Gestion des Données (LocalStorage)
function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return structuredClone(defaultData);
    
    const data = JSON.parse(saved);
    const old = Array.isArray(data.materials) ? data.materials : [];
    
    const materials = MATERIALS.map(base => {
      const existing = old.find(x => x.id === base.id);
      return {
        ...base,
        ...(existing || {}),
        references: Array.isArray(existing?.references) ? existing.references : []
      };
    });
    
    return { version: 4, materials };
  } catch {
    return structuredClone(defaultData);
  }
}

let stockData = loadData();

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stockData));
}

// 4. Utilitaires
function escapeHtml(v) {
  return String(v)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function parseFormat(value) {
  const numbers = value.replace(/,/g, '.').match(/\d+(?:\.\d+)?/g);
  if (!numbers || numbers.length < 2) return null;
  const width = Number(numbers[0]);
  const height = Number(numbers[1]);
  return (width > 0 && height > 0) ? { width, height } : null;
}

function findReference(material, color, thickness, width, height) {
  return (material.references || []).find(ref => 
    ref.color.toLowerCase() === color.toLowerCase() &&
    Number(ref.thickness) === Number(thickness) &&
    Number(ref.width) === width &&
    Number(ref.height) === height
  );
}

function currentSpecialId() {
  return document.getElementById('materialPageTitle').textContent === 'Divers' ? 'divers' : 'emballage-carton';
}

function updateThicknessSelects() {
  ['thicknessSelect', 'editThicknessSelect'].forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = THICKNESS_OPTIONS.map(t => `<option value="${t}">${t} mm</option>`).join('');
    if (currentVal && THICKNESS_OPTIONS.includes(Number(currentVal))) {
      select.value = currentVal;
    }
  });
}

// 5. Affichage Principal (Accueil)
function renderMaterials() {
  const grid = document.getElementById('materialsGrid');
  const visualMap = {
    forex: 'forex',
    plexi: 'ring',
    dibond: 'sheet',
    stadur: 'sheet',
    reboard: 'wave',
    bois: 'wood',
    pet: 'ring',
    'ps-choc': 'sheet',
    display: 'display',
    microcannelure: 'wave',
    'emballage-carton': 'box',
    divers: 'divers'
  };

  grid.innerHTML = stockData.materials.map(material => {
    const total = (material.references || []).length;
    const iconClass = visualMap[material.id] || 'sheet';
    
    return `
      <button class="material-card" type="button" data-id="${escapeHtml(material.id)}" data-visual="${material.visual}" style="--material-color:${material.color}">
        <div class="material-visual">
          <span class="visual-${iconClass}"></span>
        </div>
        <h2 class="material-name">${escapeHtml(material.name)}</h2>
        <div class="material-meta">
          <span>${total} référence${total > 1 ? 's' : ''}</span>
          <span class="material-arrow">›</span>
        </div>
      </button>
    `;
  }).join('');

  grid.querySelectorAll('.material-card').forEach(card => {
    card.onclick = () => openMaterial(card.dataset.id);
  });
}

// 6. Affichage de la Page Matériau
function openMaterial(id) {
  const material = stockData.materials.find(item => item.id === id);
  if (!material) return;

  document.getElementById('homePage').hidden = true;
  document.getElementById('materialPage').hidden = false;
  document.getElementById('materialPageTitle').textContent = material.name;
  
  const isSpecial = ['emballage-carton', 'divers'].includes(material.id);
  document.getElementById('cartonEntry').hidden = !isSpecial;
  document.querySelector('.carton-entry-title').textContent = material.id === 'divers' ? 'Ajouter un élément' : 'Ajouter un emballage';
  document.getElementById('cartonInput').placeholder = material.id === 'divers' ? 'Ex. Visserie, accessoire, autre…' : 'Ex. caisse 400 × 300 × 200';

  renderMaterialPage(material);
  scrollTo(0, 0);
}

function renderMaterialPage(material) {
  const container = document.getElementById('thicknessList');
  const refs = material.references || [];

  if (['emballage-carton', 'divers'].includes(material.id)) {
    if (!refs.length) {
      container.innerHTML = '<div class="thickness-section"><div style="padding:22px;color:#75808c">Aucun élément enregistré.</div></div>';
      return;
    }
    container.innerHTML = `
      <div class="thickness-section">
        ${[...refs].sort((a, b) => {
  const aLabel = String(a.label || '').trim();
  const bLabel = String(b.label || '').trim();

  const aNumber = /^\d/.test(aLabel);
  const bNumber = /^\d/.test(bLabel);

  if (aNumber && !bNumber) return 1;
  if (!aNumber && bNumber) return -1;

  if (aNumber && bNumber) {
    return parseFloat(aLabel.replace(',', '.')) -
           parseFloat(bLabel.replace(',', '.'));
  }

  return aLabel.localeCompare(bLabel, 'fr', {
    numeric: true,
    sensitivity: 'base'
  });
}).map(ref => `
          <div class="format-row">
            <span class="format-size">${escapeHtml(ref.label)}</span>
            <span class="format-quantity">${Number(ref.quantity || 0)}</span>
            <button class="edit-reference" type="button" data-reference="${ref.id}" aria-label="Modifier">✎</button>
          </div>
        `).join('')}
      </div>
    `;
    container.querySelectorAll('.edit-reference').forEach(button => {
      button.onclick = () => openEdit(material.id, button.dataset.reference);
    });
    return;
  }

  if (!refs.length) {
    container.innerHTML = '<div class="thickness-section"><div style="padding:22px;color:#75808c">Aucune référence enregistrée.</div></div>';
    return;
  }

  const colors = [...new Set(refs.map(ref => ref.color))].sort((a, b) => a.localeCompare(b, 'fr'));

  container.innerHTML = colors.map(color => {
    const colorRefs = refs.filter(ref => ref.color === color);
    const thicknesses = [...new Set(colorRefs.map(ref => Number(ref.thickness)))].sort((a, b) => a - b);

    return `
      <section class="color-section">
        <h2 class="color-title">${escapeHtml(color)}</h2>
        ${thicknesses.map(thickness => {
          const rows = colorRefs
            .filter(ref => Number(ref.thickness) === thickness)
            .sort((a, b) => Number(b.width) - Number(a.width) || Number(b.height) - Number(a.height));

          return `
            <div class="thickness-section">
              <h3 class="thickness-title">${thickness} mm</h3>${rows.map(ref => `
                <div class="format-row">
                  <span class="format-size">${ref.width} × ${ref.height} mm</span>
                  <span class="format-quantity">${Number(ref.quantity || 0)}</span>
                  <button class="edit-reference" type="button" data-reference="${ref.id}" aria-label="Modifier">✎</button>
                </div>
              `).join('')}
            </div>
          `;
        }).join('')}
      </section>
    `;
  }).join('');

  container.querySelectorAll('.edit-reference').forEach(button => {
    button.onclick = () => openEdit(material.id, button.dataset.reference);
  });
}

function closeMaterial() {
  document.getElementById('materialPage').hidden = true;
  document.getElementById('homePage').hidden = false;
  document.getElementById('cartonEntry').hidden = true;
  renderMaterials();
  scrollTo(0, 0);
}

// 7. Modale d'Ajout
function openAddModal() {
  updateThicknessSelects();
  const select = document.getElementById('materialSelect');
  select.innerHTML = stockData.materials
    .filter(material => !['emballage-carton', 'divers'].includes(material.id))
    .map(material => `<option value="${material.id}">${escapeHtml(material.name)}</option>`)
    .join('');

  document.getElementById('addForm').reset();
  document.getElementById('quantityInput').value = 1;
  document.getElementById('existingReference').hidden = true;
  document.getElementById('addModal').hidden = false;
  document.body.classList.add('modal-open');
}

function closeAddModal() {
  document.getElementById('addModal').hidden = true;
  document.body.classList.remove('modal-open');
}

function previewExistingReference() {
  const material = stockData.materials.find(item => item.id === document.getElementById('materialSelect').value);
  const color = document.getElementById('colorInput').value.trim();
  const thickness = document.getElementById('thicknessSelect').value;
  const format = parseFormat(document.getElementById('formatInput').value);
  const preview = document.getElementById('existingReference');

  const existing = (material && color && thickness && format) 
    ? findReference(material, color, thickness, format.width, format.height) 
    : null;

  preview.hidden = !existing;
  if (existing) {
    preview.textContent = `Référence existante : ${existing.quantity} disponible(s). La nouvelle quantité sera ajoutée.`;
  }
}

function saveReference(event) {
  event.preventDefault();
  const material = stockData.materials.find(item => item.id === document.getElementById('materialSelect').value);
  const color = document.getElementById('colorInput').value.trim();
  const thickness = Number(document.getElementById('thicknessSelect').value);
  const format = parseFormat(document.getElementById('formatInput').value);
  const quantity = Number(document.getElementById('quantityInput').value);

  if (!material || !color || !thickness || !format || !Number.isInteger(quantity) || quantity < 1) {
    return alert('Vérifie les informations saisies.');
  }

  material.references = material.references || [];
  let reference = findReference(material, color, thickness, format.width, format.height);

  if (reference) {
    reference.quantity += quantity;
  } else {
    material.references.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      color,
      thickness,
      width: format.width,
      height: format.height,
      quantity
    });
  }

  saveData();
  closeAddModal();
  renderMaterials();
}

// 8. Modale d'Édition
function openEdit(materialId, referenceId) {
  updateThicknessSelects();
  const material = stockData.materials.find(item => item.id === materialId);
  const reference = material?.references?.find(ref => ref.id === referenceId);
  if (!material || !reference) return;

  editTarget = { materialId, referenceId };

  if (['emballage-carton', 'divers'].includes(material.id)) {
    document.getElementById('editColorInput').value = reference.label;
    document.getElementById('editThicknessSelect').value = '1';
    document.getElementById('editFormatInput').value = reference.label;
  } else {
    document.getElementById('editColorInput').value = reference.color;
    document.getElementById('editThicknessSelect').value = String(reference.thickness);
    document.getElementById('editFormatInput').value = `${reference.width} × ${reference.height}`;
  }

  document.getElementById('editQuantityInput').value = Number(reference.quantity || 0);
  document.getElementById('editModal').hidden = false;
  document.body.classList.add('modal-open');
}

function closeEditModal() {
  document.getElementById('editModal').hidden = true;
  document.body.classList.remove('modal-open');
  editTarget = null;
}

function saveEdit(event) {
  event.preventDefault();
  if (!editTarget) return;

  const material = stockData.materials.find(item => item.id === editTarget.materialId);
  const reference = material?.references?.find(ref => ref.id === editTarget.referenceId);
  if (!material || !reference) return;

  const quantity = Number(document.getElementById('editQuantityInput').value);
  if (!Number.isInteger(quantity) || quantity < 0) {
    alert('La quantité doit être un nombre entier positif ou nul.');
    return;
  }

  if (['emballage-carton', 'divers'].includes(material.id)) {
    const label = document.getElementById('editFormatInput').value.trim();
    if (!label) return;

    const duplicate = material.references.find(ref => ref.id !== reference.id && ref.label.toLowerCase() === label.toLowerCase());
    if (duplicate) {
      duplicate.quantity += quantity;
      material.references = material.references.filter(ref => ref.id !== reference.id);
    } else {
      reference.label = label;
      reference.quantity = quantity;
    }
  } else {
    const color = document.getElementById('editColorInput').value.trim();
    const thickness = Number(document.getElementById('editThicknessSelect').value);
    const format = parseFormat(document.getElementById('editFormatInput').value);

    if (!color || !thickness || !format) return;

    const duplicate = findReference(material, color, thickness, format.width, format.height);
    if (duplicate && duplicate.id !== reference.id) {
      duplicate.quantity += quantity;
      material.references = material.references.filter(ref => ref.id !== reference.id);
    } else {
      reference.color = color;
      reference.thickness = thickness;
      reference.width = format.width;
      reference.height = format.height;
      reference.quantity = quantity;
    }
  }

  saveData();
  closeEditModal();
  renderMaterialPage(material);
  renderMaterials();
}

// 9. Saisie Spéciale (Carton / Divers)
function addCartonReference() {
  const label = document.getElementById('cartonInput').value.trim();
  const quantity = Number(document.getElementById('cartonQty').value);

  if (!label || !Number.isInteger(quantity) || quantity < 1) return;

  const material = stockData.materials.find(item => item.id === currentSpecialId());
  material.references = material.references || [];

  let ref = material.references.find(item => item.label.toLowerCase() === label.toLowerCase());
  if (ref) {
    ref.quantity += quantity;
  } else {
    material.references.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      label,
      quantity
    });
  }

  saveData();
  document.getElementById('cartonInput').value = '';
  document.getElementById('cartonQty').value = 1;
  renderMaterialPage(material);
  renderMaterials();
}

// 10. Import / Export
function exportData() {
  const blob = new Blob([JSON.stringify(stockData, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `atelier-stock-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = event => {
    try {
      const data = JSON.parse(event.target.result);
      if (!Array.isArray(data.materials)) throw 0;
      stockData = data;
      saveData();
      renderMaterials();
      alert('Import terminé avec succès.');
    } catch {
      alert('Fichier JSON invalide.');
    }
  };
  reader.readAsText(file);
}

// 11. Initialisation des Événements DOM
document.addEventListener('DOMContentLoaded', () => {
  updateThicknessSelects();

  document.getElementById('addBtn').onclick = openAddModal;
  document.getElementById('backHomeBtn').onclick = closeMaterial;
  document.getElementById('closeModalBtn').onclick = closeAddModal;
  document.getElementById('cancelModalBtn').onclick = closeAddModal;
  document.getElementById('closeEditBtn').onclick = closeEditModal;
  document.getElementById('cancelEditBtn').onclick = closeEditModal;

  document.getElementById('addForm').onsubmit = saveReference;
  document.getElementById('editForm').onsubmit = saveEdit;
  document.getElementById('cartonAddBtn').onclick = addCartonReference;

  ['materialSelect', 'colorInput', 'thicknessSelect', 'formatInput'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.oninput = previewExistingReference;
      el.onchange = previewExistingReference;
    }
  });

  document.getElementById('exportBtn').onclick = exportData;
  document.getElementById('importBtn').onclick = () => document.getElementById('fileInput').click();
  document.getElementById('fileInput').onchange = e => importData(e.target.files[0]);

  renderMaterials();
});
    
