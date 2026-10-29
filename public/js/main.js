/**
 * Campus Lost & Found - Main Client Script
 * Dark SaaS Redesign Enhancements
 */

document.addEventListener('DOMContentLoaded', () => {
  // Bootstrap Tooltip initialization
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.forEach((el) => new bootstrap.Tooltip(el));

  // Initialize image upload preview
  initImageUploadPreview();

  // Initialize duplicate warning checker in report forms
  initDuplicateCheck();

  // Initialize claim modal bindings
  initClaimModal();

  // Initialize demo login fill buttons
  initDemoCredentials();

  // Initialize toast auto-trigger if flash messages exist
  initToasts();

  // Initialize scroll reveal animations
  initScrollReveal();
});

/**
 * Handle Image Upload Preview & Drag-Drop UI
 */
function initImageUploadPreview() {
  const dropzone = document.getElementById('uploadDropzone');
  const fileInput = document.getElementById('itemImageInput');
  const previewContainer = document.getElementById('uploadPreviewContainer');
  const previewImg = document.getElementById('uploadPreviewImg');
  const removeBtn = document.getElementById('uploadRemoveBtn');

  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('click', (e) => {
    if (e.target !== removeBtn && !e.target.closest('#uploadRemoveBtn')) {
      fileInput.click();
    }
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      fileInput.files = e.dataTransfer.files;
      showPreview(fileInput.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      showPreview(fileInput.files[0]);
    }
  });

  if (removeBtn) {
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.value = '';
      if (previewContainer) previewContainer.style.display = 'none';
      if (previewImg) previewImg.src = '';
    });
  }

  function showPreview(file) {
    if (!file.type.match('image.*')) {
      showToast('Please select an image file (PNG, JPG, JPEG, WEBP)', 'danger');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (previewImg && previewContainer) {
        previewImg.src = e.target.result;
        previewContainer.style.display = 'block';
      }
    };
    reader.readAsDataURL(file);
  }
}

/**
 * Real-time Duplicate Report Warning Simulator
 */
function initDuplicateCheck() {
  const titleInput = document.getElementById('reportTitle');
  const categoryInput = document.getElementById('reportCategory');
  const locationInput = document.getElementById('reportLocation');
  const duplicateAlert = document.getElementById('duplicateWarningAlert');
  const duplicateMatchText = document.getElementById('duplicateMatchTitle');

  if (!titleInput || !duplicateAlert) return;

  const sampleExistingItems = [
    { title: 'AirPods Pro with White Case', category: 'electronics', location: 'Main Campus Library' },
    { title: 'Black Leather Fossil Wallet', category: 'keys_wallets', location: 'Central Cafeteria' },
    { title: 'Casio Scientific Calculator FX-991EX', category: 'electronics', location: 'Engineering Quad' },
    { title: 'Silver Hydro Flask Water Bottle', category: 'accessories', location: 'Student Center' }
  ];

  function checkSimilarity() {
    const enteredTitle = (titleInput.value || '').trim().toLowerCase();
    const enteredCat = (categoryInput ? categoryInput.value : '').toLowerCase();
    const enteredLoc = (locationInput ? locationInput.value : '').toLowerCase();

    if (enteredTitle.length < 3) {
      duplicateAlert.classList.add('d-none');
      return;
    }

    const match = sampleExistingItems.find(item => {
      const itemTitleWords = item.title.toLowerCase().split(' ');
      const hasWordOverlap = itemTitleWords.some(w => w.length > 3 && enteredTitle.includes(w));
      return hasWordOverlap || (enteredCat && item.category === enteredCat && enteredLoc && item.location.toLowerCase().includes(enteredLoc));
    });

    if (match) {
      if (duplicateMatchText) {
        duplicateMatchText.textContent = `"${match.title}" at ${match.location}`;
      }
      duplicateAlert.classList.remove('d-none');
    } else {
      duplicateAlert.classList.add('d-none');
    }
  }

  titleInput.addEventListener('input', debounce(checkSimilarity, 300));
  if (categoryInput) categoryInput.addEventListener('change', checkSimilarity);
  if (locationInput) locationInput.addEventListener('change', checkSimilarity);
}

/**
 * Claim Modal Data Binding
 */
function initClaimModal() {
  const claimModal = document.getElementById('claimItemModal');
  if (!claimModal) return;

  claimModal.addEventListener('show.bs.modal', (event) => {
    const button = event.relatedTarget;
    if (!button) return;

    const itemId = button.getAttribute('data-item-id') || 'ITEM-102';
    const itemTitle = button.getAttribute('data-item-title') || 'Selected Item';

    const modalItemIdInput = claimModal.querySelector('#claimItemId');
    const modalItemTitleDisplay = claimModal.querySelector('#claimItemTitleDisplay');

    if (modalItemIdInput) modalItemIdInput.value = itemId;
    if (modalItemTitleDisplay) modalItemTitleDisplay.textContent = itemTitle;
  });
}

/**
 * Fill demo credentials for testing
 */
function initDemoCredentials() {
  const btnStudent = document.getElementById('btnDemoStudent');
  const btnAdmin = document.getElementById('btnDemoAdmin');
  const emailInput = document.getElementById('loginEmail');
  const passInput = document.getElementById('loginPassword');

  if (btnStudent && emailInput && passInput) {
    btnStudent.addEventListener('click', () => {
      emailInput.value = 'alex.chen@university.edu';
      passInput.value = 'student123';
      showToast('Student credentials filled', 'info');
    });
  }

  if (btnAdmin && emailInput && passInput) {
    btnAdmin.addEventListener('click', () => {
      emailInput.value = 'admin@university.edu';
      passInput.value = 'admin123';
      showToast('Admin credentials filled', 'info');
    });
  }
}

/**
 * Smooth Scroll Reveal with IntersectionObserver
 */
function initScrollReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const elements = document.querySelectorAll('.item-card, .dashboard-stat-card, .category-bubble-card');
  if (!elements || elements.length === 0) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        obs.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  elements.forEach((el, index) => {
    el.classList.add('reveal-fade-up');
    el.style.transitionDelay = `${(index % 3) * 0.08}s`;
    observer.observe(el);
  });
}

/**
 * Toast Helper
 */
function showToast(message, type = 'primary') {
  const toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) return;

  const toastEl = document.createElement('div');
  toastEl.className = 'toast campus-toast align-items-center show mb-2';
  toastEl.setAttribute('role', 'alert');
  toastEl.setAttribute('aria-live', 'assertive');
  toastEl.setAttribute('aria-atomic', 'true');

  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body d-flex align-items-center gap-2">
        <i class="bi bi-info-circle-fill text-${type}"></i>
        <span class="text-white">${message}</span>
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;

  toastContainer.appendChild(toastEl);
  setTimeout(() => {
    toastEl.classList.remove('show');
    setTimeout(() => toastEl.remove(), 300);
  }, 4000);
}

function initToasts() {
  const toasts = document.querySelectorAll('.toast:not(.show)');
  toasts.forEach(t => new bootstrap.Toast(t).show());
}

/**
 * Debounce Utility
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
