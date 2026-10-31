import { escapeHTML as e, number } from './ui.js';

export function saleHistory(state) {
  const transactions = (state.transactions || []).filter(t => t.type === 'Horse sold');
  const rows = transactions.map(t => {
    const horse = state.sold.find(h => h.id === t.horseId);
    return {
      name: horse?.name || t.horseName || horse?.species || t.species || 'Archived horse',
      species: horse?.species || t.species || '—',
      amount: t.amount,
      at: t.at
    };
  });
  for (const horse of state.sold)
    if (!transactions.some(t => t.horseId === horse.id)) {
      rows.push({ name: horse.name || horse.species, species: horse.species, amount: horse.soldFor, at: horse.soldAt });
    }
  return rows.sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

export function saleHistoryTable(state) {
  const rows = saleHistory(state);
  return `<section class="sale-history" aria-labelledby="sale-history-heading"><h2 id="sale-history-heading">Sale History</h2><div class="panel"><div class="sale-history-scroll"><table aria-label="Sale History"><thead><tr><th scope="col">Date</th><th scope="col">Horse</th><th scope="col">Species</th><th scope="col">Gold Earned</th></tr></thead><tbody>${rows.length ? rows.map(row => `<tr><td>${e(new Date(row.at).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }))}</td><td>${e(row.name)}</td><td>${e(row.species)}</td><td>${number(row.amount)}</td></tr>`).join('') : '<tr><td colspan="4">No horses sold yet.</td></tr>'}</tbody></table></div></div></section>`;
}
