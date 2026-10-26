export function startHorseRename(button, { horse, save, onSaved, notify }) {
  const input = document.createElement('input');
  input.className = 'horse-inline-name';
  input.maxLength = 60;
  input.setAttribute('aria-label', 'Horse name');
  input.value = horse.name || horse.species;
  const original = input.value;
  let saving = false;
  button.replaceWith(input);
  async function finish() {
    if (saving) return;
    saving = true;
    input.readOnly = true;
    try {
      const name = input.value.trim();
      if (name !== original) await save('rename', { id: horse.id, name });
      button.textContent = name || horse.species;
      input.replaceWith(button);
      if (name !== original) {
        onSaved();
        notify('Horse name saved.');
      }
    } catch (error) {
      notify(error.message, true);
    } finally {
      saving = false;
      input.readOnly = false;
    }
  }
  input.addEventListener('blur', finish);
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape' || event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      finish();
    }
  });
  input.focus();
  input.select();
}
