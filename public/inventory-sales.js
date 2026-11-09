import { html, setHTML, number } from './ui.js';
import { foodSalePrice } from './item-sales.js';
export function bindFoodSales(root, state, { action, render, notify }) {
  const controller = new AbortController();
  root.addEventListener(
    'click',
    event => {
      const button = event.target.closest('[data-food-sell]');
      if (!button) return;
      const item = state.inventory.find(item => item.id === button.dataset.foodSell && item.type === 'food');
      if (!item) return;
      let price;
      try {
        price = foodSalePrice(item, state.settings);
      } catch (error) {
        notify(error.message, true);
        return;
      }
      const dialog = document.createElement('dialog');
      dialog.className = 'food-sale-dialog';
      dialog.setAttribute('aria-labelledby', 'food-sale-title');
      setHTML(
        dialog,
        html`<form><h2 id="food-sale-title">Sell ${item.name}</h2><p>${number(price)} gold each</p><label class="zone-field">Quantity<input name="count" type="number" min="1" max="${item.count}" step="1" value="1" required></label><p>Total: <output>${number(price)}</output> gold</p><div class="form-actions"><button class="button primary" type="submit">Sell</button><button class="button secondary" type="button" data-cancel-food>Cancel</button></div></form>`
      );
      document.body.append(dialog);
      dialog.addEventListener('close', () => dialog.remove(), { once: true });
      dialog.querySelector('[data-cancel-food]').onclick = () => dialog.close();
      const input = dialog.querySelector('input');
      input.addEventListener('input', () => {
        dialog.querySelector('output').textContent = number(input.validity.valid ? price * Number(input.value) : 0);
      });
      dialog.querySelector('form').addEventListener('submit', async event => {
        event.preventDefault();
        const form = event.target;
        if (!form.reportValidity()) return;
        const submit = form.querySelector('[type=submit]');
        if (submit.disabled) return;
        submit.disabled = true;
        try {
          await action('sell-food', { id: item.id, count: Number(input.value) });
          dialog.close();
          render();
          notify('Food sold.');
        } catch (error) {
          notify(error.message, true);
          submit.disabled = false;
        }
      });
      dialog.showModal();
      input.focus();
      input.select();
    },
    { signal: controller.signal }
  );
  return () => controller.abort();
}
